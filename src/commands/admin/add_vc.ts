import { prisma } from '../../utils/database';
import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits, EmbedBuilder } from 'discord.js';
import { Theme } from '../../utils/theme';
import { Emojis } from '../../utils/emojis';

export default {
    data: new SlashCommandBuilder()
        .setName('add_vc')
        .setDescription('Add voice time to a user (Admin only)')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to add voice time to')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('minutes')
                .setDescription('Number of minutes to add')
                .setRequired(true)
                .setMinValue(1)),

    async execute(interaction: ChatInputCommandInteraction) {
        const user = interaction.options.getUser('user', true);
        const minutes = interaction.options.getInteger('minutes', true);
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
                    voiceMinutes: { increment: minutes }
                },
                create: {
                    userId: user.id,
                    guildId: guildId,
                    messageCount: 0,
                    inviteCount: 0,
                    voiceMinutes: minutes
                }
            });

            const embed = new EmbedBuilder()
                .setColor(Theme.SuccessColor)
                .setDescription(`${Emojis.TICK} Added **${minutes}** minutes of voice time to ${user.toString()}`)
                .setTimestamp();

            await interaction.reply({ embeds: [embed], ephemeral: true });
        } catch (error) {
            console.error('Error adding voice time:', error);
            const embed = new EmbedBuilder()
                .setColor(Theme.ErrorColor)
                .setDescription(`${Emojis.CROSS} Failed to add voice time`)
                .setTimestamp();

            await interaction.reply({ embeds: [embed], ephemeral: true });
        }
    }
};
