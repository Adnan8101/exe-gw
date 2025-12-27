import { prisma } from '../../utils/database';
import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits, EmbedBuilder } from 'discord.js';
import { Theme } from '../../utils/theme';
import { Emojis } from '../../utils/emojis';

export default {
    data: new SlashCommandBuilder()
        .setName('add_invites')
        .setDescription('Add invites to a user (Admin only)')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to add invites to')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('amount')
                .setDescription('Number of invites to add')
                .setRequired(true)
                .setMinValue(1)),

    async execute(interaction: ChatInputCommandInteraction) {
        const user = interaction.options.getUser('user', true);
        const amount = interaction.options.getInteger('amount', true);
        const guildId = interaction.guildId!;

        try {
            await prisma.userStats.upsert({
                where: {
                    guildId_userId: {
                        userId: user.id,
                        guildId: guildId
                    }
                },
                update: {
                    inviteCount: { increment: amount }
                },
                create: {
                    userId: user.id,
                    guildId: guildId,
                    messageCount: 0,
                    inviteCount: amount,
                    voiceMinutes: 0
                }
            });

            const embed = new EmbedBuilder()
                .setColor(Theme.SuccessColor)
                .setDescription(`${Emojis.TICK} Added **${amount}** invites to ${user.toString()}`)
                .setTimestamp();

            await interaction.reply({ embeds: [embed], ephemeral: true });
        } catch (error) {
            console.error('Error adding invites:', error);
            const embed = new EmbedBuilder()
                .setColor(Theme.ErrorColor)
                .setDescription(`${Emojis.CROSS} Failed to add invites`)
                .setTimestamp();

            await interaction.reply({ embeds: [embed], ephemeral: true });
        }
    }
};
