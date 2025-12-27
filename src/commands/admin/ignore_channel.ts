import { prisma } from '../../utils/database';
import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits, EmbedBuilder, ChannelType } from 'discord.js';
import { Theme } from '../../utils/theme';
import { Emojis } from '../../utils/emojis';

export default {
    data: new SlashCommandBuilder()
        .setName('ignore_channel')
        .setDescription('Manage ignored channels (bot will ignore non-giveaway commands) (Admin only)')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addSubcommand(subcommand =>
            subcommand
                .setName('add')
                .setDescription('Add a channel to ignore list')
                .addChannelOption(option =>
                    option.setName('channel')
                        .setDescription('The channel to ignore')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription('Remove a channel from ignore list')
                .addChannelOption(option =>
                    option.setName('channel')
                        .setDescription('The channel to stop ignoring')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('show')
                .setDescription('Show all ignored channels')),

    async execute(interaction: ChatInputCommandInteraction) {
        const subcommand = interaction.options.getSubcommand();
        const guildId = interaction.guildId!;

        try {
            switch (subcommand) {
                case 'add': {
                    const channel = interaction.options.getChannel('channel', true);

                    const existing = await prisma.ignoredChannel.findUnique({
                        where: {
                            guildId_channelId: {
                                guildId: guildId,
                                channelId: channel.id
                            }
                        }
                    });

                    if (existing) {
                        const embed = new EmbedBuilder()
                            .setColor(Theme.ErrorColor)
                            .setDescription(`${Emojis.CROSS} ${channel.toString()} is already in the ignore list`)
                            .setTimestamp();

                        return interaction.reply({ embeds: [embed], ephemeral: true });
                    }

                    await prisma.ignoredChannel.create({
                        data: {
                            guildId: guildId,
                            channelId: channel.id
                        }
                    });

                    const embed = new EmbedBuilder()
                        .setColor(Theme.SuccessColor)
                        .setDescription(`${Emojis.TICK} Added ${channel.toString()} to ignore list\n\n⚠️ Bot will ignore all non-giveaway commands in this channel`)
                        .setTimestamp();

                    await interaction.reply({ embeds: [embed], ephemeral: true });
                    break;
                }

                case 'remove': {
                    const channel = interaction.options.getChannel('channel', true);

                    const result = await prisma.ignoredChannel.deleteMany({
                        where: {
                            guildId: guildId,
                            channelId: channel.id
                        }
                    });

                    if (result.count === 0) {
                        const embed = new EmbedBuilder()
                            .setColor(Theme.ErrorColor)
                            .setDescription(`${Emojis.CROSS} ${channel.toString()} is not in the ignore list`)
                            .setTimestamp();

                        return interaction.reply({ embeds: [embed], ephemeral: true });
                    }

                    const embed = new EmbedBuilder()
                        .setColor(Theme.SuccessColor)
                        .setDescription(`${Emojis.TICK} Removed ${channel.toString()} from ignore list`)
                        .setTimestamp();

                    await interaction.reply({ embeds: [embed], ephemeral: true });
                    break;
                }

                case 'show': {
                    const ignoredChannels = await prisma.ignoredChannel.findMany({
                        where: {
                            guildId: guildId
                        }
                    });

                    const embed = new EmbedBuilder()
                        .setTitle('🚫 Ignored Channels')
                        .setColor(Theme.EmbedColor)
                        .setTimestamp();

                    if (ignoredChannels.length === 0) {
                        embed.setDescription('No channels are being ignored');
                    } else {
                        const channelList = ignoredChannels
                            .map(ic => `<#${ic.channelId}>`)
                            .join('\n');
                        
                        embed.setDescription(`Bot will ignore non-giveaway commands in these channels:\n\n${channelList}`);
                        embed.setFooter({ text: `${ignoredChannels.length} channel(s) ignored` });
                    }

                    await interaction.reply({ embeds: [embed], ephemeral: true });
                    break;
                }
            }
        } catch (error) {
            console.error('Error managing ignored channels:', error);
            const embed = new EmbedBuilder()
                .setColor(Theme.ErrorColor)
                .setDescription(`${Emojis.CROSS} Failed to manage ignored channels`)
                .setTimestamp();

            await interaction.reply({ embeds: [embed], ephemeral: true });
        }
    }
};
