import {
    SlashCommandBuilder,
    ChatInputCommandInteraction,
    EmbedBuilder,
    Message,
    User
} from 'discord.js';
import { PrismaClient } from '@prisma/client';
import { Theme } from '../../utils/theme';
import { Emojis } from '../../utils/emojis';

const prisma = new PrismaClient();

// Badge definitions
const BADGES: { [key: string]: { name: string; emoji: string; description: string } } = {
    'es': {
        name: 'Early Supporter',
        emoji: '<:earlysupporter:1454433945885216850>',
        description: 'Supported the bot early on'
    },
    'bh': {
        name: 'Bug Hunter',
        emoji: '<:bn_bughunter:1454433917640773726>',
        description: 'Found and reported bugs'
    }
};

export default {
    data: new SlashCommandBuilder()
        .setName('badge')
        .setDescription('View your badges or another user\'s badges')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('User to check badges for')
                .setRequired(false)),

    async execute(interaction: ChatInputCommandInteraction) {
        const targetUser = interaction.options.getUser('user') || interaction.user;
        await this.showBadges(interaction, targetUser);
    },

    async prefixRun(message: Message, args: string[]) {
        let targetUser: User = message.author;

        // Check for mentioned user or user ID
        if (message.mentions.users.first()) {
            targetUser = message.mentions.users.first()!;
        } else if (args[0]) {
            try {
                targetUser = await message.client.users.fetch(args[0]);
            } catch {
                // Stay with message author
            }
        }

        await this.showBadges(message, targetUser);
    },

    async showBadges(ctx: ChatInputCommandInteraction | Message, targetUser: User) {
        const isInteraction = ctx instanceof ChatInputCommandInteraction;

        const userBadges = await prisma.userBadge.findMany({
            where: { userId: targetUser.id },
            orderBy: { createdAt: 'asc' }
        });

        const embed = new EmbedBuilder()
            .setAuthor({
                name: targetUser.username,
                iconURL: targetUser.displayAvatarURL()
            })
            .setThumbnail(targetUser.displayAvatarURL({ size: 256 }))
            .setColor(Theme.EmbedColor)
            .setTimestamp();

        if (userBadges.length === 0) {
            embed.setTitle('🏷️ Badges');
            embed.setDescription('*No badges yet*\n\n> Badges are awarded to special users who support or help improve the bot.');
        } else {
            // Create badge display
            const badgeIcons = userBadges.map((ub: { badge: string }) => {
                const badgeInfo = BADGES[ub.badge];
                return badgeInfo ? badgeInfo.emoji : '🏷️';
            }).join(' ');

            const badgeList = userBadges.map((ub: { badge: string }) => {
                const badgeInfo = BADGES[ub.badge];
                return badgeInfo 
                    ? `${badgeInfo.emoji} **${badgeInfo.name}**\n> *${badgeInfo.description}*` 
                    : `🏷️ ${ub.badge}`;
            }).join('\n\n');

            embed.setTitle(`🏷️ Badges ${badgeIcons}`);
            embed.setDescription(badgeList);
            embed.setFooter({ text: `${userBadges.length} badge${userBadges.length > 1 ? 's' : ''} earned` });
        }

        if (isInteraction) {
            await (ctx as ChatInputCommandInteraction).reply({ embeds: [embed] });
        } else {
            await (ctx as Message).reply({ embeds: [embed] });
        }
    }
};
