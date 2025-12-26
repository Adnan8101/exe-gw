import { Client, GatewayIntentBits, Collection } from 'discord.js';
import { PrismaClient } from '@prisma/client';
import { GiveawayService } from './services/GiveawayService';
import { tracker } from './services/Tracker';
import { InviteService } from './services/InviteService';
import { SchedulerService } from './services/SchedulerService';
import { handleReactionAdd, handleReactionRemove } from './events/reactionHandler';

import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildInvites
    ]
});

const prisma = new PrismaClient();
const giveawayService = new GiveawayService(client);
const inviteService = new InviteService(client);

const commands = new Collection<string, any>();

// Dynamic Command Loading
const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);

for (const folder of commandFolders) {
    const commandsPath = path.join(foldersPath, folder);
    if (!fs.statSync(commandsPath).isDirectory()) continue;

    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.ts') || file.endsWith('.js'));
    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const command = require(filePath).default;
        if ('data' in command && 'execute' in command) {
            commands.set(command.data.name, command);
        } else {
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
    } catch (error) {
        console.error("Error registering commands:", error);
    }

    // Start Scheduler
    const scheduler = new SchedulerService(client);
    scheduler.start();
});

client.on('interactionCreate', async interaction => {
    if (interaction.isChatInputCommand()) {
        const command = commands.get(interaction.commandName);

        if (!command) return;

        try {
            await command.execute(interaction);
        } catch (error) {
            console.error(error);
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true });
            } else {
                await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
            }
        }
    } else if (interaction.isAutocomplete()) {
        const command = commands.get(interaction.commandName);

        if (!command) {
            console.error(`No command matching ${interaction.commandName} was found.`);
            return;
        }

        try {
            await command.autocomplete(interaction);
        } catch (error) {
            console.error(error);
        }
    }
});

client.on('messageCreate', async (message) => {
    tracker.onMessageCreate(message);

    if (message.author.bot || !message.guild) return;

    // 1. Determine Prefix
    // Cache this potentially or stick to simple DB for now.
    // For high performance, we might want a simple cache map, but let's do direct DB first as per request logic.
    // Or optimized: check content start with default "!" first, if not, check DB.
    // Actually, user wants configurable prefix.
    let prefix = '!';
    try {
        const config = await prisma.giveawayConfig.findUnique({
            where: {
                guildId: message.guildId!
            }
        });
        if (config?.prefix) prefix = config.prefix;
    } catch (e) { }

    if (!message.content.startsWith(prefix)) return;

    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const commandName = args.shift()?.toLowerCase();

    if (!commandName) return;

    // Check direct command name or alias (if we had them)
    const command = commands.get(commandName);

    if (!command) return;

    // Only run if command supports prefixRun
    if (typeof command.prefixRun === 'function') {
        try {
            await command.prefixRun(message, args);
        } catch (error) {
            console.error(error);
            await message.reply('There was an error while executing this command!');
        }
    }
});

client.on('voiceStateUpdate', (oldState, newState) => {
    tracker.onVoiceStateUpdate(oldState, newState);
});

client.on('messageReactionAdd', async (reaction, user) => {
    if (user.partial) await user.fetch();
    if (reaction.partial) await reaction.fetch();
    handleReactionAdd(reaction as any, user as any, client);
});

client.on('messageReactionRemove', async (reaction, user) => {
    if (user.partial) await user.fetch();
    if (reaction.partial) await reaction.fetch();
    handleReactionRemove(reaction as any, user as any, client);
});

// Invite Events
client.on('inviteCreate', (invite) => {
    if (invite.guild) {
        inviteService.cacheGuildInvites(invite.guild as any);
    }
});

client.on('inviteDelete', (invite) => {
    if (invite.guild) {
        inviteService.cacheGuildInvites(invite.guild as any);
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
    } catch (e) {
        console.error("Error in giveaway loop:", e);
    }
};

// Run immediately on startup for recovery
checkGiveaways();

// Then polling
setInterval(checkGiveaways, 5000);

client.login(process.env.DISCORD_TOKEN);
