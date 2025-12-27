import { prisma } from '../../utils/database';

import {
    SlashCommandBuilder,
    ChatInputCommandInteraction,
    EmbedBuilder,
    Message,
    User
} from 'discord.js';
import { Theme } from '../../utils/theme';
import { Emojis } from '../../utils/emojis';


const OWNER_ID = '929297205796417597';


const BADGES: { [key: string]: { name: string; emoji: string; description: string } } = {
    'es': {
        name: 'Early Supporter',
        emoji: '<:earlysupporter:1454433945885216850>',
        description: 'Supported the bot early stage'
    },
    'bh': {
        name: 'Bug Hunter',
        emoji: '<:bn_bughunter:1454433917640773726>',
        description: 'Found and reported bugs'
    },
    'dev': {
        name: 'Developer',
        emoji: '<:verifiedDeveloper:1454448916949893302>',
        description: 'Bot developer'
    },
    'owner': {
        name: 'Owner',
        emoji: '<:owner:1454449006078857357>',
        description: 'Bot owner'
    }
};

export default {
    data: new SlashCommandBuilder()
        .setName('bga')
        .setDescription('Add a badge to a user (Owner Only)')
        .setDefaultMemberPermissions(0)
        .addStringOption(option =>
            option.setName('badge')
                .setDescription('Badge type')
                .setRequired(true)
                .addChoices(
                    { name: 'Early Supporter', value: 'es' },
                    { name: 'Bug Hunter', value: 'bh' },
                    { name: 'Developer', value: 'dev' },
                    { name: 'Owner', value: 'owner' }
                ))
        .addUserOption(option =>
            option.setName('user')
                .setDescription('Target user')
                .setRequired(true)),

    async execute(interaction: ChatInputCommandInteraction) {
        if (interaction.user.id !== OWNER_ID) {
            return interaction.reply({
                content: `${Emojis.CROSS} This command is restricted to the bot owner.`,
                ephemeral: true
            });
        }

        const badge = interaction.options.getString('badge', true);
        const targetUser = interaction.options.getUser('user', true);

        await this.addBadge(interaction, badge, targetUser);
    },

    async prefixRun(message: Message, args: string[]) {
        if (message.author.id !== OWNER_ID) {
            return; 
        }

        const badge = args[0]?.toLowerCase();
        const userArg = args[1];

        if (!badge || !BADGES[badge]) {
            const embed = new EmbedBuilder()
                .setTitle(`${Emojis.CROSS} Invalid Usage`)
                .setDescription([
                    '**Syntax:** `!bga <badge> <user>`',
                    '',
                    '**Badges:**',
                    '• `es` - Early Supporter',
                    '• `bh` - Bug Hunter',
                    '• `dev` - Developer',
                    '• `owner` - Owner',
                    '',
                    '**Examples:**',
                    '`!bga es @user`',
                    '`!bga dev 123456789`'
                ].join('\n'))
                .setColor(Theme.ErrorColor);
            return message.reply({ embeds: [embed] });
        }

        
        let targetUser: User | null = null;
        if (message.mentions.users.first()) {
            targetUser = message.mentions.users.first()!;
        } else if (userArg) {
            try {
                targetUser = await message.client.users.fetch(userArg);
            } catch {
                
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

        await this.addBadge(message, badge, targetUser);
    },

    async addBadge(ctx: ChatInputCommandInteraction | Message, badge: string, targetUser: User | null) {
        const isInteraction = ctx instanceof ChatInputCommandInteraction;
        const replyFn = isInteraction
            ? (content: any) => (ctx as ChatInputCommandInteraction).reply(content)
            : (content: any) => (ctx as Message).reply(content);

        if (!targetUser) {
            const errorEmbed = new EmbedBuilder()
                .setDescription(`${Emojis.CROSS} Please specify a user.`)
                .setColor(Theme.ErrorColor);
            return replyFn({ embeds: [errorEmbed] });
        }

        const badgeInfo = BADGES[badge];
        const authorId = isInteraction ? (ctx as ChatInputCommandInteraction).user.id : (ctx as Message).author.id;

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
};
