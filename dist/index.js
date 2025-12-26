"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const client_1 = require("@prisma/client");
const GiveawayService_1 = require("./services/GiveawayService");
const Tracker_1 = require("./services/Tracker");
const InviteService_1 = require("./services/InviteService");
const SchedulerService_1 = require("./services/SchedulerService");
const reactionHandler_1 = require("./events/reactionHandler");
const dotenv = __importStar(require("dotenv"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
dotenv.config();
const client = new discord_js_1.Client({
    intents: [
        discord_js_1.GatewayIntentBits.Guilds,
        discord_js_1.GatewayIntentBits.GuildMessages,
        discord_js_1.GatewayIntentBits.MessageContent,
        discord_js_1.GatewayIntentBits.GuildMessageReactions,
        discord_js_1.GatewayIntentBits.GuildMembers,
        discord_js_1.GatewayIntentBits.GuildVoiceStates,
        discord_js_1.GatewayIntentBits.GuildInvites
    ]
});
const prisma = new client_1.PrismaClient();
const giveawayService = new GiveawayService_1.GiveawayService(client);
const inviteService = new InviteService_1.InviteService(client);
const commands = new discord_js_1.Collection();
// Dynamic Command Loading
const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);
for (const folder of commandFolders) {
    const commandsPath = path.join(foldersPath, folder);
    if (!fs.statSync(commandsPath).isDirectory())
        continue;
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.ts') || file.endsWith('.js'));
    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const command = require(filePath).default;
        if ('data' in command && 'execute' in command) {
            commands.set(command.data.name, command);
        }
        else {
            console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
        }
    }
}
client.once('ready', async () => {
    console.log(`Logged in as ${client.user?.tag}!`);
    console.log(`Serving ${client.guilds.cache.size} guilds`);
    // Cache invites for all guilds
    for (const [id, guild] of client.guilds.cache) {
        await inviteService.cacheGuildInvites(guild);
    }
    console.log("Invites cached.");
    // Deploy commands
    const data = commands.map(c => c.data.toJSON());
    try {
        await client.application?.commands.set(data);
        console.log(`Successfully registered ${data.length} commands globally.`);
    }
    catch (error) {
        console.error("Error registering commands:", error);
    }
    // Start Scheduler
    const scheduler = new SchedulerService_1.SchedulerService(client);
    scheduler.start();
});
client.on('interactionCreate', async (interaction) => {
    if (interaction.isChatInputCommand()) {
        const command = commands.get(interaction.commandName);
        if (!command)
            return;
        try {
            await command.execute(interaction);
        }
        catch (error) {
            console.error(error);
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true });
            }
            else {
                await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
            }
        }
    }
    else if (interaction.isAutocomplete()) {
        const command = commands.get(interaction.commandName);
        if (!command) {
            console.error(`No command matching ${interaction.commandName} was found.`);
            return;
        }
        try {
            await command.autocomplete(interaction);
        }
        catch (error) {
            console.error(error);
        }
    }
});
client.on('messageCreate', async (message) => {
    Tracker_1.tracker.onMessageCreate(message);
    if (message.author.bot || !message.guild)
        return;
    // 1. Determine Prefix
    // Cache this potentially or stick to simple DB for now.
    // For high performance, we might want a simple cache map, but let's do direct DB first as per request logic.
    // Or optimized: check content start with default "!" first, if not, check DB.
    // Actually, user wants configurable prefix.
    let prefix = '!';
    try {
        const config = await prisma.giveawayConfig.findUnique({
            where: {
                guildId: message.guildId
            }
        });
        if (config?.prefix)
            prefix = config.prefix;
    }
    catch (e) { }
    if (!message.content.startsWith(prefix))
        return;
    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const commandName = args.shift()?.toLowerCase();
    if (!commandName)
        return;
    // Check direct command name or alias (if we had them)
    const command = commands.get(commandName);
    if (!command)
        return;
    // Only run if command supports prefixRun
    if (typeof command.prefixRun === 'function') {
        try {
            await command.prefixRun(message, args);
        }
        catch (error) {
            console.error(error);
            await message.reply('There was an error while executing this command!');
        }
    }
});
client.on('voiceStateUpdate', (oldState, newState) => {
    Tracker_1.tracker.onVoiceStateUpdate(oldState, newState);
});
client.on('messageReactionAdd', async (reaction, user) => {
    if (user.partial)
        await user.fetch();
    if (reaction.partial)
        await reaction.fetch();
    (0, reactionHandler_1.handleReactionAdd)(reaction, user, client);
});
client.on('messageReactionRemove', async (reaction, user) => {
    if (user.partial)
        await user.fetch();
    if (reaction.partial)
        await reaction.fetch();
    (0, reactionHandler_1.handleReactionRemove)(reaction, user, client);
});
// Invite Events
client.on('inviteCreate', (invite) => {
    if (invite.guild) {
        inviteService.cacheGuildInvites(invite.guild);
    }
});
client.on('inviteDelete', (invite) => {
    if (invite.guild) {
        inviteService.cacheGuildInvites(invite.guild);
    }
});
client.on('guildMemberAdd', (member) => {
    inviteService.onMemberAdd(member);
});
client.on('guildMemberRemove', (member) => {
    inviteService.onMemberRemove(member);
});
// Helper to check for ended giveaways
// Helper to check for ended giveaways
const checkGiveaways = async () => {
    try {
        const endedGiveaways = await prisma.giveaway.findMany({
            where: {
                ended: false,
                endTime: {
                    lte: BigInt(Date.now())
                }
            }
        });
        if (endedGiveaways.length > 0) {
            console.log(`[Auto-Recovery] Found ${endedGiveaways.length} interrupted giveaways. Ending them now...`);
        }
        for (const g of endedGiveaways) {
            await giveawayService.endGiveaway(g.messageId);
        }
    }
    catch (e) {
        console.error("Error in giveaway loop:", e);
    }
};
// Run immediately on startup for recovery
checkGiveaways();
// Then polling
setInterval(checkGiveaways, 5000);
client.login(process.env.DISCORD_TOKEN);
