import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { PrismaClient } from '@prisma/client';
import { Theme } from '../../utils/theme';
import { tracker } from '../../services/Tracker';

const prisma = new PrismaClient();

export default {
    data: new SlashCommandBuilder()
        .setName('messages')
        .setDescription('Check message count of a user')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to check')
                .setRequired(false)),

    async execute(interaction: ChatInputCommandInteraction) {
        const targetUser = interaction.options.getUser('user') || interaction.user;
        const guildId = interaction.guildId!;

        const stats = await prisma.userStats.findUnique({
            where: {
                guildId_userId: {
                    userId: targetUser.id,
                    guildId: guildId
                }
            }
        });

        const dbCount = stats?.messageCount || 0;
        const pendingCount = tracker.getPendingMessageCount(guildId, targetUser.id);
        const totalCount = dbCount + pendingCount;

        const embed = new EmbedBuilder()
            .setTitle('Message Count')
            .setDescription(`**User:** ${targetUser.tag}\n**Messages:** ${totalCount}`)
            .setColor(Theme.EmbedColor)
            .setThumbnail(targetUser.displayAvatarURL())
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    },

    async prefixRun(message: any, args: string[]) {
        const targetUser = message.mentions.users.first() || message.author;
        const guildId = message.guildId;

        const stats = await prisma.userStats.findUnique({
            where: {
                guildId_userId: {
                    userId: targetUser.id,
                    guildId: guildId
                }
            }
        });
        
        const dbCount = stats?.messageCount || 0;
        const pendingCount = tracker.getPendingMessageCount(guildId, targetUser.id);
        const totalCount = dbCount + pendingCount;

        const embed = new EmbedBuilder()
            .setTitle('Message Count')
            .setDescription(`**User:** ${targetUser.tag}\n**Messages:** ${totalCount}`)
            .setColor(Theme.EmbedColor)
            .setThumbnail(targetUser.displayAvatarURL())
            .setTimestamp();

        await message.channel.send({ embeds: [embed] });
    }
};
