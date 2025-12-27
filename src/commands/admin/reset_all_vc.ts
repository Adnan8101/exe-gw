import { prisma } from '../../utils/database';
import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits, EmbedBuilder } from 'discord.js';
import { Theme } from '../../utils/theme';
import { Emojis } from '../../utils/emojis';

export default {
    data: new SlashCommandBuilder()
        .setName('reset_all_vc')
        .setDescription('Reset all voice time in this server (Admin only)')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    async execute(interaction: ChatInputCommandInteraction) {
        const guildId = interaction.guildId!;

        try {
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
        } catch (error) {
            console.error('Error resetting all voice time:', error);
            const embed = new EmbedBuilder()
                .setColor(Theme.ErrorColor)
                .setDescription(`${Emojis.CROSS} Failed to reset all voice time`)
                .setTimestamp();

            await interaction.reply({ embeds: [embed], ephemeral: true });
        }
    }
};
