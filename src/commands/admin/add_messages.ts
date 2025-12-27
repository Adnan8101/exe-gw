import { prisma } from '../../utils/database';
import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits, EmbedBuilder } from 'discord.js';
import { Theme } from '../../utils/theme';
import { Emojis } from '../../utils/emojis';

export default {
    data: new SlashCommandBuilder()
        .setName('add_messages')
        .setDescription('Add messages to a user (Admin only)')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to add messages to')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('amount')
                .setDescription('Number of messages to add')
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
        } catch (error) {
            console.error('Error adding messages:', error);
            const embed = new EmbedBuilder()
                .setColor(Theme.ErrorColor)
                .setDescription(`${Emojis.CROSS} Failed to add messages`)
                .setTimestamp();

            await interaction.reply({ embeds: [embed], ephemeral: true });
        }
    }
};
