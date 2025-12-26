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

    // Set bot activity/presence
    client.user?.setPresence({
        activities: [{
            name: '<a:Exe_Gw:1454033571273506929> Managing Giveaways in /exeop',
            type: 3 // Watching
        }],
        status: 'online'
    });

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

    // Check for bot mention (not @everyone, @here, or role mention)
    const botMention = `<@${client.user?.id}>`;
    const botMentionNickname = `<@!${client.user?.id}>`;
    if (message.content === botMention || message.content === botMentionNickname) {
        let prefix = '!';
        try {
            const config = await prisma.giveawayConfig.findUnique({
                where: { guildId: message.guildId! }
            });
            if (config?.prefix) prefix = config.prefix;
        } catch (e) { }
        
        return message.reply(`My prefix is \`${prefix}\`\nBegin with \`${prefix}ghelp\``);
    }

    // Check if user is in no-prefix list
    let isNoPrefixUser = false;
    try {
        const noPrefixUser = await (prisma as any).noPrefixUser?.findUnique({
            where: { userId: message.author.id }
        });
        isNoPrefixUser = !!noPrefixUser;
    } catch (e) { 
        // No-prefix feature not available yet (table doesn't exist)
    }

    // 1. Determine Prefix
    let prefix = '!';
    try {
        const config = await prisma.giveawayConfig.findUnique({
            where: {
                guildId: message.guildId!
            }
        });
        if (config?.prefix) prefix = config.prefix;
    } catch (e) { }

    // If not a no-prefix user, require prefix
    if (!isNoPrefixUser && !message.content.startsWith(prefix)) return;

    // Parse command (with or without prefix)
    const content = isNoPrefixUser && !message.content.startsWith(prefix) 
        ? message.content 
        : message.content.slice(prefix.length);
    
    const args = content.trim().split(/ +/);
    const commandName = args.shift()?.toLowerCase();

    if (!commandName) return;

    // Map aliases to command names
    const aliasMap: { [key: string]: string } = {
        'm': 'messages',
        'i': 'invites'
    };

    // Check direct command name or alias
    const actualCommandName = aliasMap[commandName] || commandName;
    const command = commands.get(actualCommandName);

    if (!command) return;

    // Define public commands (no permission check)
    const publicCommands = ['messages', 'invites', 'vc', 'ping', 'stats', 'help', 'leaderboard', 'about', 'invite', 'gping', 'gstats', 'ghelp', 'ginvite', 'gabout', 'bsetting'];
    const isPublicCommand = publicCommands.includes(actualCommandName);

    // Only run if command supports prefixRun
    if (typeof command.prefixRun === 'function') {
        try {
            // For restricted commands, check permissions silently
            if (!isPublicCommand && command.requiresPermissions) {
                const hasPerms = await command.checkPermissions?.(message);
                if (hasPerms === false) return; // Silent fail - no reply
            }
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
