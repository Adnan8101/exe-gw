import { prisma } from '../../utils/database';
import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { Theme } from '../../utils/theme';
import { Emojis } from '../../utils/emojis';

export default {
    data: new SlashCommandBuilder()
        .setName('reset_my_vc')
        .setDescription('Reset your voice time in this server'),

    async execute(interaction: ChatInputCommandInteraction) {
        const userId = interaction.user.id;
        const guildId = interaction.guildId!;

        try {
            await prisma.userStats.updateMany({
                where: {
                    userId: userId,
                    guildId: guildId
                },
                data: {
                    voiceMinutes: 0
                }
            });

            const embed = new EmbedBuilder()
                .setColor(Theme.SuccessColor)
                .setDescription(`${Emojis.TICK} Your voice time has been reset to **0 minutes**`)
                .setTimestamp();

            await interaction.reply({ embeds: [embed], ephemeral: true });
        } catch (error) {
            console.error('Error resetting voice time:', error);
            const embed = new EmbedBuilder()
                .setColor(Theme.ErrorColor)
                .setDescription(`${Emojis.CROSS} Failed to reset your voice time`)
                .setTimestamp();

            await interaction.reply({ embeds: [embed], ephemeral: true });
        }
    }
};
