import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { PrismaClient } from '@prisma/client';
import { Theme } from '../../utils/theme';

const prisma = new PrismaClient();

export default {
    data: new SlashCommandBuilder()
        .setName('vc')
        .setDescription('Check voice time statistics of a user')
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

        const voiceMinutes = stats?.voiceMinutes || 0;
        
        // Format time nicely
        const hours = Math.floor(voiceMinutes / 60);
        const minutes = voiceMinutes % 60;
        const days = Math.floor(hours / 24);
        const remainingHours = hours % 24;
        
        let timeStr = '';
        if (days > 0) {
            timeStr = `${days}d ${remainingHours}h ${minutes}m`;
        } else if (hours > 0) {
            timeStr = `${hours}h ${minutes}m`;
        } else {
            timeStr = `${minutes}m`;
        }

        const embed = new EmbedBuilder()
            .setTitle('🎙️ Voice Statistics')
            .setDescription(`**User:** ${targetUser.tag}\n**Total Voice Time:** ${timeStr}\n**Total Minutes:** ${voiceMinutes}`)
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

        const voiceMinutes = stats?.voiceMinutes || 0;
        
        // Format time nicely
        const hours = Math.floor(voiceMinutes / 60);
        const minutes = voiceMinutes % 60;
        const days = Math.floor(hours / 24);
        const remainingHours = hours % 24;
        
        let timeStr = '';
        if (days > 0) {
            timeStr = `${days}d ${remainingHours}h ${minutes}m`;
        } else if (hours > 0) {
            timeStr = `${hours}h ${minutes}m`;
        } else {
            timeStr = `${minutes}m`;
        }

        const embed = new EmbedBuilder()
            .setTitle('🎙️ Voice Statistics')
            .setDescription(`**User:** ${targetUser.tag}\n**Total Voice Time:** ${timeStr}\n**Total Minutes:** ${voiceMinutes}`)
            .setColor(Theme.EmbedColor)
            .setThumbnail(targetUser.displayAvatarURL())
            .setTimestamp();

        await message.channel.send({ embeds: [embed] });
    }
};
