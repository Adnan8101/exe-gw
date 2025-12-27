import { prisma } from '../../utils/database';
import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits, EmbedBuilder } from 'discord.js';
import { Theme } from '../../utils/theme';
import { Emojis } from '../../utils/emojis';

export default {
    data: new SlashCommandBuilder()
        .setName('reset_all_invites')
        .setDescription('Reset all invites in this server (Admin only)')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    async execute(interaction: ChatInputCommandInteraction) {
        const guildId = interaction.guildId!;

        try {
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
        } catch (error) {
            console.error('Error resetting all invites:', error);
            const embed = new EmbedBuilder()
                .setColor(Theme.ErrorColor)
                .setDescription(`${Emojis.CROSS} Failed to reset all invites`)
                .setTimestamp();

            await interaction.reply({ embeds: [embed], ephemeral: true });
        }
    }
};
