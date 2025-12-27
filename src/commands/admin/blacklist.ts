import { prisma } from '../../utils/database';

import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, PermissionFlagsBits, ChannelType } from 'discord.js';
import { Theme } from '../../utils/theme';
import { Emojis } from '../../utils/emojis';
import { tracker } from '../../services/Tracker';


export default {
    data: new SlashCommandBuilder()
        .setName('blacklist')
        .setDescription('Manage blacklisted channels for tracking')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addSubcommand(subcommand =>
            subcommand
                .setName('add')
                .setDescription('Add a channel to the blacklist')
                .addStringOption(option =>
                    option.setName('type')
                        .setDescription('Type of tracking to blacklist')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Messages', value: 'message' },
                            { name: 'Voice', value: 'voice' }
                        ))
                .addChannelOption(option =>
                    option.setName('channel')
                        .setDescription('The channel to blacklist')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription('Remove a channel from the blacklist')
                .addStringOption(option =>
                    option.setName('type')
                        .setDescription('Type of tracking to unblacklist')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Messages', value: 'message' },
                            { name: 'Voice', value: 'voice' }
                        ))
                .addChannelOption(option =>
                    option.setName('channel')
                        .setDescription('The channel to remove from blacklist')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('show')
                .setDescription('Show all blacklisted channels')
                .addStringOption(option =>
                    option.setName('type')
                        .setDescription('Type of blacklist to show')
                        .setRequired(false)
                        .addChoices(
                            { name: 'Messages', value: 'message' },
                            { name: 'Voice', value: 'voice' },
                            { name: 'All', value: 'all' }
                        ))),

    async execute(interaction: ChatInputCommandInteraction) {
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
            const embed = new EmbedBuilder()
                .setDescription(`${Emojis.CROSS} You need Manage Server permissions to use this command.`)
                .setColor(Theme.ErrorColor)
                .setTimestamp();
            return interaction.reply({ embeds: [embed], ephemeral: true });
        }
        await this.run(interaction);
    },

    async prefixRun(message: any, args: string[]) {
        if (!message.member?.permissions.has(PermissionFlagsBits.ManageGuild)) {
            const embed = new EmbedBuilder()
                .setDescription(`${Emojis.CROSS} You need Manage Server permissions.`)
                .setColor(Theme.ErrorColor)
                .setTimestamp();
            return message.channel.send({ embeds: [embed] });
        }

        const action = args[0]?.toLowerCase();
        if (!action || !['add', 'remove', 'show'].includes(action)) {
            const embed = new EmbedBuilder()
                .setDescription(`${Emojis.CROSS} **Invalid Usage**\n\`\`\`!blacklist <add|remove|show> <message|voice> [#channel/ID/name]\`\`\``)
                .setColor(Theme.ErrorColor)
                .setTimestamp();
            return message.channel.send({ embeds: [embed] });
        }

        
        let channel = message.mentions.channels.first();
        if (!channel && args[2]) {
            
            channel = message.guild.channels.cache.get(args[2]);
            
            
            if (!channel) {
                const channelName = args.slice(2).join(' ').toLowerCase();
                channel = message.guild.channels.cache.find((ch: any) => 
                    ch.name.toLowerCase() === channelName
                );
            }
        }

        await this.run(message, action, args[1], channel, args[2]);
    },

    async run(ctx: any, action?: string, typeArg?: string, channelArg?: any, channelInput?: string) {
        const guildId = ctx.guildId!;
        const isInteraction = !!ctx.options;

        try {
            if (isInteraction) {
                action = ctx.options.getSubcommand();
                typeArg = ctx.options.getString('type');
                channelArg = ctx.options.getChannel('channel');
            }

            if (action === 'add') {
                const type = typeArg?.toLowerCase();
                if (!type || !['message', 'voice'].includes(type)) {
                    const embed = new EmbedBuilder()
                        .setDescription(`${Emojis.CROSS} Invalid type. Use \`message\` or \`voice\`.`)
                        .setColor(Theme.ErrorColor)
                        .setTimestamp();
                    if (isInteraction) return ctx.reply({ embeds: [embed], ephemeral: true });
                    return ctx.channel.send({ embeds: [embed] });
                }

                let channel = channelArg;
                
                
                if (!channel && channelInput && !isInteraction) {
                    
                    channel = ctx.guild.channels.cache.get(channelInput);
                    
                    
                    if (!channel) {
                        const channelName = channelInput.toLowerCase();
                        channel = ctx.guild.channels.cache.find((ch: any) => 
                            ch.name.toLowerCase() === channelName
                        );
                    }
                }
                
                if (!channel) {
                    const embed = new EmbedBuilder()
                        .setDescription(`${Emojis.CROSS} Channel not found. Please provide a valid channel mention, ID, or name.`)
                        .setColor(Theme.ErrorColor)
                        .setTimestamp();
                    if (isInteraction) return ctx.reply({ embeds: [embed], ephemeral: true });
                    return ctx.channel.send({ embeds: [embed] });
                }

                
                if (type === 'voice' && channel.type !== ChannelType.GuildVoice) {
                    const embed = new EmbedBuilder()
                        .setDescription(`${Emojis.CROSS} You can only blacklist voice channels for voice tracking.`)
                        .setColor(Theme.ErrorColor)
                        .setTimestamp();
                    if (isInteraction) return ctx.reply({ embeds: [embed], ephemeral: true });
                    return ctx.channel.send({ embeds: [embed] });
                }

                if (type === 'message' && channel.type === ChannelType.GuildVoice) {
                    const embed = new EmbedBuilder()
                        .setDescription(`${Emojis.CROSS} You cannot blacklist voice channels for message tracking.`)
                        .setColor(Theme.ErrorColor)
                        .setTimestamp();
                    if (isInteraction) return ctx.reply({ embeds: [embed], ephemeral: true });
                    return ctx.channel.send({ embeds: [embed] });
                }

                
                const existing = await (prisma as any).blacklistChannel?.findUnique({
                    where: {
                        guildId_channelId_type: {
                            guildId: guildId,
                            channelId: channel.id,
                            type: type
                        }
                    }
                });

                if (existing) {
                    const embed = new EmbedBuilder()
                        .setDescription(`${Emojis.CROSS} ${channel} is already blacklisted for **${type}** tracking.`)
                        .setColor(Theme.ErrorColor)
                        .setTimestamp();
                    if (isInteraction) return ctx.reply({ embeds: [embed], ephemeral: true });
                    return ctx.channel.send({ embeds: [embed] });
                }

                await (prisma as any).blacklistChannel.create({
                    data: {
                        guildId: guildId,
                        channelId: channel.id,
                        type: type
                    }
                });

                
                await tracker.forceRefreshBlacklist();

                const successEmbed = new EmbedBuilder()
                    .setDescription(`${Emojis.TICK} Successfully blacklisted ${channel} for **${type}** tracking.`)
                    .setColor(Theme.SuccessColor)
                    .setTimestamp();
                if (isInteraction) return ctx.reply({ embeds: [successEmbed] });
                return ctx.channel.send({ embeds: [successEmbed] });

            } else if (action === 'remove') {
                const type = typeArg?.toLowerCase();
                if (!type || !['message', 'voice'].includes(type)) {
                    const embed = new EmbedBuilder()
                        .setDescription(`${Emojis.CROSS} Invalid type. Use \`message\` or \`voice\`.`)
                        .setColor(Theme.ErrorColor)
                        .setTimestamp();
                    if (isInteraction) return ctx.reply({ embeds: [embed], ephemeral: true });
                    return ctx.channel.send({ embeds: [embed] });
                }

                let channel2 = channelArg;
                
                
                if (!channel2 && channelInput && !isInteraction) {
                    
                    channel2 = ctx.guild.channels.cache.get(channelInput);
                    
                    
                    if (!channel2) {
                        const channelName = channelInput.toLowerCase();
                        channel2 = ctx.guild.channels.cache.find((ch: any) => 
                            ch.name.toLowerCase() === channelName
                        );
                    }
                }
                
                if (!channel2) {
                    const embed = new EmbedBuilder()
                        .setDescription(`${Emojis.CROSS} Channel not found. Please provide a valid channel mention, ID, or name.`)
                        .setColor(Theme.ErrorColor)
                        .setTimestamp();
                    if (isInteraction) return ctx.reply({ embeds: [embed], ephemeral: true });
                    return ctx.channel.send({ embeds: [embed] });
                }

                const existing2 = await (prisma as any).blacklistChannel?.findUnique({
                    where: {
                        guildId_channelId_type: {
                            guildId: guildId,
                            channelId: channel2.id,
                            type: type
                        }
                    }
                });

                if (!existing2) {
                    const embed = new EmbedBuilder()
                        .setDescription(`${Emojis.CROSS} ${channel2} is not blacklisted for **${type}** tracking.`)
                        .setColor(Theme.ErrorColor)
                        .setTimestamp();
                    if (isInteraction) return ctx.reply({ embeds: [embed], ephemeral: true });
                    return ctx.channel.send({ embeds: [embed] });
                }

                await (prisma as any).blacklistChannel.delete({
                    where: {
                        guildId_channelId_type: {
                            guildId: guildId,
                            channelId: channel2.id,
                            type: type
                        }
                    }
                });

                
                await tracker.forceRefreshBlacklist();

                const removeEmbed = new EmbedBuilder()
                    .setDescription(`${Emojis.TICK} Successfully removed ${channel2} from **${type}** blacklist.`)
                    .setColor(Theme.SuccessColor)
                    .setTimestamp();
                if (isInteraction) return ctx.reply({ embeds: [removeEmbed] });
                return ctx.channel.send({ embeds: [removeEmbed] });

            } else if (action === 'show') {
                const type = typeArg?.toLowerCase() || 'all';

                const where: any = { guildId };
                if (type !== 'all') {
                    where.type = type;
                }

                const blacklisted = await (prisma as any).blacklistChannel?.findMany({ where });

                if (!blacklisted || blacklisted.length === 0) {
                    const embed = new EmbedBuilder()
                        .setDescription(`${Emojis.CROSS} No blacklisted channels found${type !== 'all' ? ` for **${type}** tracking` : ''}.`)
                        .setColor(Theme.ErrorColor)
                        .setTimestamp();
                    if (isInteraction) return ctx.reply({ embeds: [embed], ephemeral: true });
                    return ctx.channel.send({ embeds: [embed] });
                }

                
                const messageChannels: string[] = [];
                const voiceChannels: string[] = [];

                for (const bl of blacklisted) {
                    const channelMention = `<#${bl.channelId}>`;
                    if (bl.type === 'message') {
                        messageChannels.push(channelMention);
                    } else {
                        voiceChannels.push(channelMention);
                    }
                }

                const embed = new EmbedBuilder()
                    .setTitle('🚫 Blacklisted Channels')
                    .setColor(Theme.EmbedColor)
                    .setTimestamp();

                let description = '';
                if (messageChannels.length > 0) {
                    description += `**Message Tracking:**\n${messageChannels.join(', ')}\n\n`;
                }
                if (voiceChannels.length > 0) {
                    description += `**Voice Tracking:**\n${voiceChannels.join(', ')}`;
                }

                embed.setDescription(description || 'No channels blacklisted.');
                embed.setFooter({ text: `Total: ${blacklisted.length} channel(s)` });

                if (isInteraction) return ctx.reply({ embeds: [embed] });
                return ctx.channel.send({ embeds: [embed] });
            }

        } catch (error: any) {
            console.error('Blacklist command error:', error);
            const embed = new EmbedBuilder()
                .setDescription(`${Emojis.CROSS} This feature requires database migration. Please run \`migration.sql\` first.`)
                .setColor(Theme.ErrorColor)
                .setTimestamp();
            if (isInteraction) return ctx.reply({ embeds: [embed], ephemeral: true });
            return ctx.channel.send({ embeds: [embed] });
        }
    }
};
