import { prisma } from '../../utils/database';
import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits, EmbedBuilder } from 'discord.js';
import { Theme } from '../../utils/theme';
import { Emojis } from '../../utils/emojis';

export default {
    data: new SlashCommandBuilder()
        .setName('stats_manage')
        .setDescription('Manage user statistics (Admin only)')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addSubcommand(subcommand =>
            subcommand
                .setName('add_messages')
                .setDescription('Add messages to a user')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('The user to add messages to')
                        .setRequired(true))
                .addIntegerOption(option =>
                    option.setName('amount')
                        .setDescription('Number of messages to add')
                        .setRequired(true)
                        .setMinValue(1)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('reset_user_messages')
                .setDescription('Reset messages for a specific user')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('The user to reset messages for')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('reset_all_messages')
                .setDescription('Reset all messages in this server'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('reset_user_invites')
                .setDescription('Reset invites for a specific user')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('The user to reset invites for')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('reset_all_invites')
                .setDescription('Reset all invites in this server'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('reset_user_vc')
                .setDescription('Reset voice time for a specific user')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('The user to reset voice time for')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('reset_all_vc')
                .setDescription('Reset all voice time in this server')),

    async execute(interaction: ChatInputCommandInteraction) {
        const subcommand = interaction.options.getSubcommand();
        const guildId = interaction.guildId!;

        try {
            switch (subcommand) {
                case 'add_messages': {
                    const user = interaction.options.getUser('user', true);
                    const amount = interaction.options.getInteger('amount', true);

                    await prisma.userStats.upsert({
                        where: {
                            guildId_userId: {
                                userId: user.id,
                                guildId: guildId
                            }
                        },
                        update: {
                            messageCount: { increment: amount }
                        },
                        create: {
                            userId: user.id,
                            guildId: guildId,
                            messageCount: amount,
                            inviteCount: 0,
                            voiceMinutes: 0
                        }
                    });

                    const embed = new EmbedBuilder()
                        .setColor(Theme.SuccessColor)
                        .setDescription(`${Emojis.TICK} Added **${amount}** messages to ${user.toString()}`)
                        .setTimestamp();

                    await interaction.reply({ embeds: [embed], ephemeral: true });
                    break;
                }

                case 'reset_user_messages': {
                    const user = interaction.options.getUser('user', true);

                    await prisma.userStats.updateMany({
                        where: {
                            userId: user.id,
                            guildId: guildId
                        },
                        data: {
                            messageCount: 0
                        }
                    });

                    const embed = new EmbedBuilder()
                        .setColor(Theme.SuccessColor)
                        .setDescription(`${Emojis.TICK} Reset messages for ${user.toString()}`)
                        .setTimestamp();

                    await interaction.reply({ embeds: [embed], ephemeral: true });
                    break;
                }

                case 'reset_all_messages': {
                    const result = await prisma.userStats.updateMany({
                        where: {
                            guildId: guildId
                        },
                        data: {
                            messageCount: 0
                        }
                    });

                    const embed = new EmbedBuilder()
                        .setColor(Theme.SuccessColor)
                        .setDescription(`${Emojis.TICK} Reset messages for **${result.count}** users in this server`)
                        .setTimestamp();

                    await interaction.reply({ embeds: [embed], ephemeral: true });
                    break;
                }

                case 'reset_user_invites': {
                    const user = interaction.options.getUser('user', true);

                    await prisma.userStats.updateMany({
                        where: {
                            userId: user.id,
                            guildId: guildId
                        },
                        data: {
                            inviteCount: 0
                        }
                    });

                    const embed = new EmbedBuilder()
                        .setColor(Theme.SuccessColor)
                        .setDescription(`${Emojis.TICK} Reset invites for ${user.toString()}`)
                        .setTimestamp();

                    await interaction.reply({ embeds: [embed], ephemeral: true });
                    break;
                }

                case 'reset_all_invites': {
                    const result = await prisma.userStats.updateMany({
                        where: {
                            guildId: guildId
                        },
                        data: {
                            inviteCount: 0
                        }
                    });

                    const embed = new EmbedBuilder()
                        .setColor(Theme.SuccessColor)
                        .setDescription(`${Emojis.TICK} Reset invites for **${result.count}** users in this server`)
                        .setTimestamp();

                    await interaction.reply({ embeds: [embed], ephemeral: true });
                    break;
                }

                case 'reset_user_vc': {
                    const user = interaction.options.getUser('user', true);

                    await prisma.userStats.updateMany({
                        where: {
                            userId: user.id,
                            guildId: guildId
                        },
                        data: {
                            voiceMinutes: 0
                        }
                    });

                    const embed = new EmbedBuilder()
                        .setColor(Theme.SuccessColor)
                        .setDescription(`${Emojis.TICK} Reset voice time for ${user.toString()}`)
                        .setTimestamp();

                    await interaction.reply({ embeds: [embed], ephemeral: true });
                    break;
                }

                case 'reset_all_vc': {
                    const result = await prisma.userStats.updateMany({
                        where: {
                            guildId: guildId
                        },
                        data: {
                            voiceMinutes: 0
                        }
                    });

                    const embed = new EmbedBuilder()
                        .setColor(Theme.SuccessColor)
                        .setDescription(`${Emojis.TICK} Reset voice time for **${result.count}** users in this server`)
                        .setTimestamp();

                    await interaction.reply({ embeds: [embed], ephemeral: true });
                    break;
                }
            }
        } catch (error) {
            console.error('Error managing stats:', error);
            const embed = new EmbedBuilder()
                .setColor(Theme.ErrorColor)
                .setDescription(`${Emojis.CROSS} Failed to update statistics`)
                .setTimestamp();

            await interaction.reply({ embeds: [embed], ephemeral: true });
        }
    }
};
