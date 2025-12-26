import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { PrismaClient } from '@prisma/client';
import { Theme } from '../../utils/theme';

const prisma = new PrismaClient();

export default {
    data: new SlashCommandBuilder()
        .setName('invites')
        .setDescription('Check invite count of a user')
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

        const inviteCount = stats?.inviteCount || 0;

        const embed = new EmbedBuilder()
            .setTitle('Invite Count')
            .setDescription(`**User:** ${targetUser.tag}\n**Total Invites:** ${inviteCount}`)
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

        const inviteCount = stats?.inviteCount || 0;

        const embed = new EmbedBuilder()
            .setTitle('Invite Count')
            .setDescription(`**User:** ${targetUser.tag}\n**Total Invites:** ${inviteCount}`)
            .setColor(Theme.EmbedColor)
            .setThumbnail(targetUser.displayAvatarURL())
            .setTimestamp();

        await message.reply({ embeds: [embed] });
    }
};
