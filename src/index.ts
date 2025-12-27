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


const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);

for (const folder of commandFolders) {
    const commandsPath = path.join(foldersPath, folder);
    if (!fs.statSync(commandsPath).isDirectory()) continue;

    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.ts') || file.endsWith('.js'));
    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        
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

    
    client.user?.setPresence({
        activities: [{
            name: '🎉 Managing Giveaways in /exeop',
            type: 3 
        }],
        status: 'online'
    });

    
    for (const [id, guild] of client.guilds.cache) {
        await inviteService.cacheGuildInvites(guild);
    }
    console.log("Invites cached.");

    
    const data = commands.map(c => c.data.toJSON());
    try {
        await client.application?.commands.set(data);
        console.log(`Successfully registered ${data.length} commands globally.`);
    } catch (error) {
        console.error("Error registering commands:", error);
    }

    
    const scheduler = new SchedulerService(client);
    scheduler.start();
});

const OWNER_ID = '929297205796417597';

client.on('interactionCreate', async interaction => {
    if (interaction.isChatInputCommand()) {
        
        if (interaction.guildId && interaction.commandName !== 'guildmanage' && interaction.user.id !== OWNER_ID) {
            try {
                const isAllowed = await prisma.allowedGuild.findUnique({
                    where: { guildId: interaction.guildId }
                });

                if (!isAllowed) {
                    const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
                    const embed = new EmbedBuilder()
                        .setTitle('⛔ Unauthorized Guild')
                        .setDescription('This guild is not authorized to use me.\n\nContact the developer for more information.')
                        .setColor(0xFF0000)
                        .setTimestamp();

                    const row = new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder()
                                .setLabel('Join Support Server')
                                .setStyle(ButtonStyle.Link)
                                .setURL('https://discord.gg/exeop')
                        );

                    return interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
                }
            } catch (error) {
                console.error('Error checking guild authorization:', error);
            }
        }

        const command = commands.get(interaction.commandName);

        if (!command) return;

        try {
            await command.execute(interaction);
        } catch (error: any) {
            console.error(error);
            
            let errorMessage = '❌ An unexpected error occurred while executing this command.';
            if (error.code === 50013) {
                errorMessage = '❌ I don\'t have the required permissions to perform this action. Please check my role hierarchy and permissions.';
            } else if (error.code === 50001) {
                errorMessage = '❌ I don\'t have access to the required channel.';
            } else if (error.code === 10008) {
                errorMessage = '❌ The message was not found or has been deleted.';
            } else if (error.code === 10007) {
                errorMessage = '❌ The specified member was not found in this server.';
            } else if (error.code === 50035) {
                errorMessage = '❌ Invalid form body. Please check your input values.';
            } else if (error.message) {
                errorMessage = `❌ Error: ${error.message}`;
            }
            
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ content: errorMessage, ephemeral: true });
            } else {
                await interaction.reply({ content: errorMessage, ephemeral: true });
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

    
    
    if (message.author.id !== OWNER_ID) {
        try {
            const isAllowed = await prisma.allowedGuild.findUnique({
                where: { guildId: message.guildId! }
            });

            if (!isAllowed) {
                
                const botMention = `<@${client.user?.id}>`;
                const botMentionNickname = `<@!${client.user?.id}>`;
                if (message.content === botMention || message.content === botMentionNickname) {
                    const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
                    const embed = new EmbedBuilder()
                        .setTitle('⛔ Unauthorized Guild')
                        .setDescription('This guild is not authorized to use me.\n\nContact the developer for more information.')
                        .setColor(0xFF0000)
                        .setTimestamp();

                    const row = new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder()
                                .setLabel('Join Support Server')
                                .setStyle(ButtonStyle.Link)
                                .setURL('https://discord.gg/exeop')
                        );

                    return message.reply({ embeds: [embed], components: [row] });
                }
                return; 
            }
        } catch (error) {
            console.error('Error checking guild authorization:', error);
        }
    }

    
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

    
    let isNoPrefixUser = false;
    try {
        const noPrefixUser = await (prisma as any).noPrefixUser?.findUnique({
            where: { userId: message.author.id }
        });
        isNoPrefixUser = !!noPrefixUser;
    } catch (e) { 
        
    }

    
    let prefix = '!';
    try {
        const config = await prisma.giveawayConfig.findUnique({
            where: {
                guildId: message.guildId!
            }
        });
        if (config?.prefix) prefix = config.prefix;
    } catch (e) { }

    
    if (!isNoPrefixUser && !message.content.startsWith(prefix)) return;

    
    const content = isNoPrefixUser && !message.content.startsWith(prefix) 
        ? message.content 
        : message.content.slice(prefix.length);
    
    const args = content.trim().split(/ +/);
    const commandName = args.shift()?.toLowerCase();

    if (!commandName) return;

    
    
    const aliasMap: { [key: string]: string } = {
        'm': 'messages',
        'i': 'invites',
        'es': 'invites'
    };

    
    
    let actualCommandName: string;
    if (isNoPrefixUser && !message.content.startsWith(prefix)) {
        
        actualCommandName = commandName;
    } else {
        
        actualCommandName = aliasMap[commandName] || commandName;
    }

    const command = commands.get(actualCommandName);

    if (!command) return;

    
    const publicCommands = ['messages', 'invites', 'vc', 'ping', 'stats', 'help', 'leaderboard', 'about', 'invite', 'gping', 'gstats', 'ghelp', 'ginvite', 'gabout', 'bsetting', 'badge', 'bgs'];
    const isPublicCommand = publicCommands.includes(actualCommandName);

    
    if (typeof command.prefixRun === 'function') {
        try {
            
            if (!isPublicCommand && command.requiresPermissions) {
                const hasPerms = await command.checkPermissions?.(message);
                if (hasPerms === false) return; 
            }
            await command.prefixRun(message, args);
        } catch (error: any) {
            console.error(error);
            
            let errorMessage = '❌ An unexpected error occurred.';
            if (error.code === 50013) {
                errorMessage = '❌ I don\'t have the required permissions to perform this action.';
            } else if (error.code === 50001) {
                errorMessage = '❌ I don\'t have access to the required channel.';
            } else if (error.code === 10008) {
                errorMessage = '❌ The message was not found or has been deleted.';
            } else if (error.code === 10007) {
                errorMessage = '❌ The specified member was not found.';
            } else if (error.message) {
                errorMessage = `❌ Error: ${error.message}`;
            }
            await message.reply(errorMessage);
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


checkGiveaways();


setInterval(checkGiveaways, 5000);

client.login(process.env.DISCORD_TOKEN);
