import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } from 'discord.js';
import { Theme } from '../../utils/theme';
import { Emojis } from '../../utils/emojis';

const PAGES = [
    {
        title: 'Giveaway Commands',
        description: 'Powerful giveaway management system',
        color: '#5865F2',
        fields: [
            { 
                name: 'Quick Start', 
                value: '`/gstart <time> <winners> <prize>`\nStart a giveaway instantly with basic options',
                inline: false
            },
            { 
                name: 'Advanced Creation', 
                value: '`/gcreate`\nCreate giveaways with requirements, roles, and custom settings',
                inline: false
            },
            { 
                name: 'Management', 
                value: '`/gend <id>` - End giveaway immediately\n`/gcancel <id>` - Cancel and delete giveaway\n`/gstop <id>` - Pause giveaway countdown\n`/gresume <id>` - Resume paused giveaway\n`/greroll <id>` - Pick new winners\n`/gdelete <id>` - Delete giveaway from database',
                inline: false
            },
            { 
                name: 'Organization', 
                value: '`/glist` - View all active giveaways\n`/ghistory` - Complete history with export\n`/grefresh` - Update giveaway embeds\n`/gschedule` - Schedule future giveaways',
                inline: false
            }
        ],
        footer: 'Page 1/4 • Requires Manage Server permission'
    },
    {
        title: 'Statistics & Tracking',
        description: 'Track user activity and engagement',
        color: '#5865F2',
        fields: [
            { 
                name: 'Message Tracking', 
                value: '`/messages [@user]` or `!m [@user]`\nView total messages sent by a user\n\n`/lb -m` or `!lb -m`\nTop 10 message leaderboard with medals',
                inline: false
            },
            { 
                name: 'Voice Tracking', 
                value: '`/vc [@user]`\nCheck voice channel time statistics\n\n`/lb -v` or `!lb -vc`\nTop 10 voice time leaderboard',
                inline: false
            },
            { 
                name: 'Invite Tracking', 
                value: '`/invites [@user]` or `!i [@user]`\nView user invite statistics\n\n`/lb -i` or `!lb -i`\nTop 10 invite leaderboard',
                inline: false
            },
            { 
                name: 'Real-time Updates', 
                value: 'All statistics update every 10-30 seconds\nSupports mentions, user IDs, and usernames',
                inline: false
            }
        ],
        footer: 'Page 2/4 • Automatic tracking for all members'
    },
    {
        title: 'Admin & Configuration',
        description: 'Server management and customization',
        color: '#5865F2',
        fields: [
            { 
                name: 'Channel Blacklist', 
                value: '`/blacklist add <message|voice> <#channel>`\nStop tracking in specific channels\n\n`/blacklist remove <message|voice> <#channel>`\nResume tracking in channels\n\n`/blacklist show [type]`\nView all blacklisted channels\n\nSupports channel mention, ID, or name',
                inline: false
            },
            { 
                name: 'Server Settings', 
                value: '`/setprefix <prefix>`\nCustomize command prefix (default: !)\n\n`/bsetting`\nManage birthday system configuration',
                inline: false
            }
        ],
        footer: 'Page 3/4 • Requires Manage Server or Owner permission'
    },
    {
        title: 'Utility & Information',
        description: 'General bot features and info',
        color: '#5865F2',
        fields: [
            { 
                name: 'Bot Statistics', 
                value: '`/gstats`\nDetailed bot performance and usage stats\n\n`/gping`\nCheck bot latency and response time',
                inline: false
            },
            { 
                name: 'Links & Info', 
                value: '`/ginvite`\nGet bot invite link with permissions\n\n`/gabout`\nBot information and credits\n\n`/ghelp`\nView this help menu',
                inline: false
            },
            { 
                name: 'Tips', 
                value: '• Use `/` for slash commands or `!` for prefix\n• Most commands support both formats\n• Blacklisted channels are excluded from tracking',
                inline: false
            },
            { 
                name: 'Support', 
                value: '[Support Server](https://discord.gg/exe) • [Documentation](https://docs.exe.team)',
                inline: false
            }
        ],
        footer: 'Page 4/4 • Created by Exe Team'
    }
];

export default {
    data: new SlashCommandBuilder()
        .setName('ghelp')
        .setDescription('Shows available commands with interactive navigation'),

    async execute(interaction: ChatInputCommandInteraction) {
        let currentPage = 0;
        const message = await interaction.reply({ 
            embeds: [createPageEmbed(currentPage)], 
            components: [createButtons(currentPage)],
            ephemeral: true,
            fetchReply: true
        });

        const collector = message.createMessageComponentCollector({ 
            componentType: ComponentType.Button, 
            time: 300000 // 5 minutes
        });

        collector.on('collect', async (i) => {
            if (i.user.id !== interaction.user.id) {
                return i.reply({ content: `${Emojis.CROSS} This help menu is not for you!`, ephemeral: true });
            }

            if (i.customId === 'help_prev') {
                currentPage = currentPage > 0 ? currentPage - 1 : PAGES.length - 1;
            } else if (i.customId === 'help_next') {
                currentPage = currentPage < PAGES.length - 1 ? currentPage + 1 : 0;
            } else if (i.customId === 'help_home') {
                currentPage = 0;
            } else if (i.customId === 'help_close') {
                collector.stop();
                return i.update({ 
                    embeds: [createClosedEmbed()], 
                    components: [] 
                });
            }

            await i.update({ 
                embeds: [createPageEmbed(currentPage)], 
                components: [createButtons(currentPage)] 
            });
        });

        collector.on('end', () => {
            if (message.editable) {
                message.edit({ components: [] }).catch(() => {});
            }
        });
    },

    async prefixRun(message: any) {
        let currentPage = 0;
        const msg = await message.channel.send({ 
            embeds: [createPageEmbed(currentPage)], 
            components: [createButtons(currentPage)]
        });

        const collector = msg.createMessageComponentCollector({ 
            componentType: ComponentType.Button, 
            time: 300000 // 5 minutes
        });

        collector.on('collect', async (i: any) => {
            if (i.user.id !== message.author.id) {
                return i.reply({ content: `${Emojis.CROSS} This help menu is not for you!`, ephemeral: true });
            }

            if (i.customId === 'help_prev') {
                currentPage = currentPage > 0 ? currentPage - 1 : PAGES.length - 1;
            } else if (i.customId === 'help_next') {
                currentPage = currentPage < PAGES.length - 1 ? currentPage + 1 : 0;
            } else if (i.customId === 'help_home') {
                currentPage = 0;
            } else if (i.customId === 'help_close') {
                collector.stop();
                return i.update({ 
                    embeds: [createClosedEmbed()], 
                    components: [] 
                });
            }

            await i.update({ 
                embeds: [createPageEmbed(currentPage)], 
                components: [createButtons(currentPage)] 
            });
        });

        collector.on('end', () => {
            msg.edit({ components: [] }).catch(() => {});
        });
    }
};

function createPageEmbed(page: number): EmbedBuilder {
    const pageData = PAGES[page];
    const embed = new EmbedBuilder()
        .setTitle(pageData.title)
        .setDescription(pageData.description)
        .setColor(pageData.color as any)
        .setFooter({ text: pageData.footer })
        .setTimestamp();

    pageData.fields.forEach(field => {
        embed.addFields(field);
    });

    return embed;
}

function createButtons(currentPage: number): ActionRowBuilder<ButtonBuilder> {
    return new ActionRowBuilder<ButtonBuilder>()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('help_home')
                .setLabel('Home')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(currentPage === 0),
            new ButtonBuilder()
                .setCustomId('help_prev')
                .setLabel('Previous')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('help_next')
                .setLabel('Next')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('help_close')
                .setLabel('Close')
                .setStyle(ButtonStyle.Danger)
        );
}

function createClosedEmbed(): EmbedBuilder {
    return new EmbedBuilder()
        .setDescription(`${Emojis.TICK} Help menu closed. Use \`/ghelp\` or \`!help\` to view again.`)
        .setColor(Theme.SuccessColor)
        .setTimestamp();
}
