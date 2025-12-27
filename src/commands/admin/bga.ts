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

const OWNER_ID = '929297205796417597';

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
        .setName('bga')
        .setDescription('Manage user badges (Owner Only)')
        .addStringOption(option =>
            option.setName('action')
                .setDescription('Action to perform')
                .setRequired(true)
                .addChoices(
                    { name: 'Add', value: 'add' },
                    { name: 'Remove', value: 'remove' },
                    { name: 'Show', value: 'show' }
                ))
        .addStringOption(option =>
            option.setName('badge')
                .setDescription('Badge type')
                .setRequired(false)
                .addChoices(
                    { name: 'Early Supporter', value: 'es' },
                    { name: 'Bug Hunter', value: 'bh' }
                ))
        .addUserOption(option =>
            option.setName('user')
                .setDescription('Target user')
                .setRequired(false)),

    async execute(interaction: ChatInputCommandInteraction) {
        if (interaction.user.id !== OWNER_ID) {
            return interaction.reply({
                content: `${Emojis.CROSS} This command is restricted to the bot owner.`,
                ephemeral: true
            });
        }

        const action = interaction.options.getString('action', true);
        const badge = interaction.options.getString('badge');
        const targetUser = interaction.options.getUser('user');

        await this.run(interaction, action, badge, targetUser);
    },

    async prefixRun(message: Message, args: string[]) {
        if (message.author.id !== OWNER_ID) {
            return; // Silent fail for non-owners
        }

        const action = args[0]?.toLowerCase();
        const badge = args[1]?.toLowerCase();
        const userArg = args[2];

        if (!action || !['add', 'remove', 'show'].includes(action)) {
            const embed = new EmbedBuilder()
                .setTitle(`${Emojis.CROSS} Invalid Usage`)
                .setDescription([
                    '**Syntax:** `!bga <action> <badge> <user>`',
                    '',
                    '**Actions:**',
                    '• `add` - Add a badge to user',
                    '• `remove` - Remove a badge from user',
                    '• `show` - Show user\'s badges',
                    '',
                    '**Badges:**',
                    '• `es` - Early Supporter',
                    '• `bh` - Bug Hunter',
                    '',
                    '**Examples:**',
                    '`!bga add es @user`',
                    '`!bga remove bh 123456789`',
                    '`!bga show @user`'
                ].join('\n'))
                .setColor(Theme.ErrorColor);
            return message.reply({ embeds: [embed] });
        }

        // Get target user
        let targetUser: User | null = null;
        if (message.mentions.users.first()) {
            targetUser = message.mentions.users.first()!;
        } else if (userArg) {
            try {
                targetUser = await message.client.users.fetch(userArg);
            } catch {
                // Try to find by username
                const guilds = message.client.guilds.cache;
                for (const [, guild] of guilds) {
                    const member = guild.members.cache.find(m => 
                        m.user.username.toLowerCase() === userArg.toLowerCase() ||
                        m.user.tag.toLowerCase() === userArg.toLowerCase()
                    );
                    if (member) {
                        targetUser = member.user;
                        break;
                    }
                }
            }
        }

        await this.run(message, action, badge || null, targetUser);
    },

    async run(ctx: ChatInputCommandInteraction | Message, action: string, badge: string | null, targetUser: User | null) {
        const isInteraction = ctx instanceof ChatInputCommandInteraction;
        const replyFn = isInteraction
            ? (content: any) => (ctx as ChatInputCommandInteraction).reply(content)
            : (content: any) => (ctx as Message).reply(content);

        // Handle show action
        if (action === 'show') {
            if (!targetUser) {
                const errorEmbed = new EmbedBuilder()
                    .setDescription(`${Emojis.CROSS} Please specify a user.`)
                    .setColor(Theme.ErrorColor);
                return replyFn({ embeds: [errorEmbed] });
            }

            const userBadges = await prisma.userBadge.findMany({
                where: { userId: targetUser.id }
            });

            const embed = new EmbedBuilder()
                .setTitle(`${targetUser.username}'s Badges`)
                .setThumbnail(targetUser.displayAvatarURL({ size: 256 }))
                .setColor(Theme.EmbedColor)
                .setTimestamp();

            if (userBadges.length === 0) {
                embed.setDescription('*No badges yet*');
            } else {
                const badgeList = userBadges.map((ub: { badge: string }) => {
                    const badgeInfo = BADGES[ub.badge];
                    return badgeInfo ? `${badgeInfo.emoji} **${badgeInfo.name}**` : ub.badge;
                }).join('\n');
                embed.setDescription(badgeList);
            }

            return replyFn({ embeds: [embed] });
        }

        // For add/remove actions, need badge and user
        if (!badge || !BADGES[badge]) {
            const errorEmbed = new EmbedBuilder()
                .setDescription(`${Emojis.CROSS} Invalid badge. Use \`es\` (Early Supporter) or \`bh\` (Bug Hunter).`)
                .setColor(Theme.ErrorColor);
            return replyFn({ embeds: [errorEmbed] });
        }

        if (!targetUser) {
            const errorEmbed = new EmbedBuilder()
                .setDescription(`${Emojis.CROSS} Please specify a user.`)
                .setColor(Theme.ErrorColor);
            return replyFn({ embeds: [errorEmbed] });
        }

        const badgeInfo = BADGES[badge];
        const authorId = isInteraction ? (ctx as ChatInputCommandInteraction).user.id : (ctx as Message).author.id;

        if (action === 'add') {
            try {
                await prisma.userBadge.create({
                    data: {
                        userId: targetUser.id,
                        badge: badge,
                        addedBy: authorId
                    }
                });

                const successEmbed = new EmbedBuilder()
                    .setTitle(`${Emojis.TICK} Badge Added`)
                    .setDescription(`${badgeInfo.emoji} **${badgeInfo.name}** has been added to **${targetUser.username}**`)
                    .setColor(Theme.SuccessColor)
                    .setThumbnail(targetUser.displayAvatarURL())
                    .setTimestamp();

                return replyFn({ embeds: [successEmbed] });
            } catch (e: any) {
                if (e.code === 'P2002') {
                    const errorEmbed = new EmbedBuilder()
                        .setDescription(`${Emojis.CROSS} **${targetUser.username}** already has the **${badgeInfo.name}** badge.`)
                        .setColor(Theme.ErrorColor);
                    return replyFn({ embeds: [errorEmbed] });
                }
                throw e;
            }
        }

        if (action === 'remove') {
            const deleted = await prisma.userBadge.deleteMany({
                where: {
                    userId: targetUser.id,
                    badge: badge
                }
            });

            if (deleted.count === 0) {
                const errorEmbed = new EmbedBuilder()
                    .setDescription(`${Emojis.CROSS} **${targetUser.username}** doesn't have the **${badgeInfo.name}** badge.`)
                    .setColor(Theme.ErrorColor);
                return replyFn({ embeds: [errorEmbed] });
            }

            const successEmbed = new EmbedBuilder()
                .setTitle(`${Emojis.TICK} Badge Removed`)
                .setDescription(`${badgeInfo.emoji} **${badgeInfo.name}** has been removed from **${targetUser.username}**`)
                .setColor(Theme.SuccessColor)
                .setThumbnail(targetUser.displayAvatarURL())
                .setTimestamp();

            return replyFn({ embeds: [successEmbed] });
        }
    }
};
