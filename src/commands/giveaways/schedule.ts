import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits, TextChannel, AutocompleteInteraction, EmbedBuilder, Message, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, ButtonInteraction } from 'discord.js';
import { PrismaClient } from '@prisma/client';
import * as moment from 'moment-timezone';
import { hasGiveawayPermissions } from '../../utils/permissions';
import { Emojis } from '../../utils/emojis';
import { Theme } from '../../utils/theme';
import { 
    parseDuration, 
    validateDuration, 
    toBigInt 
} from '../../utils/timeUtils';

const prisma = new PrismaClient();
function getScheduledTime(timeStr: string, timezone: string): number | null {
    
    const regex = /^([0-1]?[0-9]|2[0-3]):([0-5][0-9])$/;
    if (!regex.test(timeStr)) return null;

    
    if (!moment.tz.zone(timezone)) return null;

    const now = moment.tz(timezone);
    const [h, m] = timeStr.split(':').map(Number);

    
    const scheduled = moment.tz(timezone)
        .set({ hour: h, minute: m, second: 0, millisecond: 0 });

    
    if (scheduled.isBefore(now)) {
        scheduled.add(1, 'day');
    }

    return scheduled.valueOf();
}

export default {
    data: new SlashCommandBuilder()
        .setName('gschedule')
        .setDescription('Schedule a giveaway for a specific time')
        
        
        
        .addStringOption(option =>
            option.setName('prize').setDescription('Prize to give away').setRequired(true))
        .addIntegerOption(option =>
            option.setName('winners').setDescription('Number of winners').setRequired(true))
        .addStringOption(option =>
            option.setName('duration').setDescription('Duration (e.g. 30s, 1m, 1h)').setRequired(true))
        
        
        
        .addStringOption(option =>
            option.setName('time').setDescription('Start Time (24h format, e.g. 14:30)').setRequired(true))
        .addStringOption(option =>
            option.setName('timezone')
                .setDescription('Timezone (e.g. Asia/Kolkata, UTC, America/New_York)')
                .setRequired(true)
                .setAutocomplete(true))
        .addChannelOption(option =>
            option.setName('channel').setDescription('Channel to start the giveaway in'))

        
        .addRoleOption(option =>
            option.setName('role_requirement').setDescription('Role required to enter'))
        .addIntegerOption(option =>
            option.setName('invite_requirement').setDescription('Number of invites required'))
        .addBooleanOption(option =>
            option.setName('captcha').setDescription('Enable captcha verification (True/False)'))
        .addRoleOption(option =>
            option.setName('winner_role').setDescription('Role to give to winners'))
        .addRoleOption(option =>
            option.setName('assign_role').setDescription('Role to assign to participants'))
        .addStringOption(option =>
            option.setName('custom_message').setDescription('Custom message to display'))
        .addStringOption(option =>
            option.setName('thumbnail').setDescription('Thumbnail URL'))
        .addStringOption(option =>
            option.setName('custom_emoji').setDescription('Custom emoji'))
        .addUserOption(option =>
            option.setName('birthday_user').setDescription('User to wish happy birthday to'))
        .addStringOption(option =>
            option.setName('announcement').setDescription('Announcement text to post before giveaway starts'))
        .addStringOption(option =>
            option.setName('announcement_media').setDescription('Media URL (image/gif) for announcement')),

    async autocomplete(interaction: AutocompleteInteraction) {
        const focusedValue = interaction.options.getFocused();
        const choices = moment.tz.names();
        const filtered = choices.filter(choice => choice.toLowerCase().includes(focusedValue.toLowerCase())).slice(0, 25);
        await interaction.respond(
            filtered.map(choice => ({ name: choice, value: choice })),
        );
    },

    async execute(interaction: ChatInputCommandInteraction) {
        if (!await hasGiveawayPermissions(interaction)) {
            return interaction.reply({ content: `${Emojis.CROSS} You need Manage Server permissions or the giveaway manager role to schedule giveaways.`, ephemeral: true });
        }

        await interaction.deferReply({ ephemeral: true });

        const timeStr = interaction.options.getString('time', true);
        const timezone = interaction.options.getString('timezone', true);
        const prize = interaction.options.getString('prize', true);
        const winners = interaction.options.getInteger('winners', true);
        const durationStr = interaction.options.getString('duration', true);
        const channel = interaction.options.getChannel('channel') as TextChannel || interaction.channel as TextChannel;

        
        const roleReq = interaction.options.getRole('role_requirement');
        const inviteReq = interaction.options.getInteger('invite_requirement') || 0;
        const captchaReq = interaction.options.getBoolean('captcha') || false;
        const winnerRole = interaction.options.getRole('winner_role');
        const assignRole = interaction.options.getRole('assign_role');
        const customMessage = interaction.options.getString('custom_message');
        const thumbnail = interaction.options.getString('thumbnail');
        const emoji = interaction.options.getString('custom_emoji') || "<a:Exe_Gw:1454033571273506929>";
        const birthdayUser = interaction.options.getUser('birthday_user');
        const announcement = interaction.options.getString('announcement');
        const announcementMedia = interaction.options.getString('announcement_media');

        await this.run(interaction, channel, timeStr, timezone, winners, prize, durationStr, {
            roleReq: roleReq?.id,
            inviteReq,
            captchaReq,
            winnerRole: winnerRole?.id,
            assignRole: assignRole?.id,
            customMessage,
            thumbnail,
            emoji,
            birthdayUser: birthdayUser?.id,
            announcement,
            announcementMedia
        });
    },

    async prefixRun(message: any, args: string[]) {
        
        
        
        const command = message.client.application.commands.cache.find((c: any) => c.name === 'gschedule');
        const commandId = command ? command.id : '0';

        const embed = new EmbedBuilder()
            .setColor(Theme.EmbedColor)
            .setDescription(`${Emojis.CROSS} The \`!gschedule\` command has been moved to slash commands only.\n\nPlease use </gschedule:${commandId}> instead!`);

        await message.reply({ embeds: [embed] });
    },

    async run(ctx: any, channel: TextChannel, timeStr: string, timezone: string, winners: number, prize: string, durationStr: string, opts: any) {
        
        const reply = async (msg: any) => {
            if (ctx.deferred || ctx.replied) {
                return await ctx.editReply(msg);
            } else {
                return await ctx.reply(msg);
            }
        };

        
        const validation = validateDuration(durationStr);
        if (!validation.isValid) {
            const msg = { content: `${Emojis.CROSS} ${validation.error}`, ephemeral: true };
            return await reply(msg);
        }

        const durationMs = parseDuration(durationStr);
        if (!durationMs) {
            const msg = { content: `${Emojis.CROSS} Invalid duration format.`, ephemeral: true };
            return await reply(msg);
        }

        
        const startTimeMs = getScheduledTime(timeStr, timezone);
        if (!startTimeMs) {
            const msg = { content: `${Emojis.CROSS} Invalid time or timezone.\n**Time format**: HH:mm\n**Timezone**: Valid IANA Zone (e.g., Asia/Kolkata, UTC)\nYour input: ${timeStr} in ${timezone}`, ephemeral: true };
            return await reply(msg);
        }

        
        if (!opts.announcement && !opts.announcementMedia) {
            await this.promptForAnnouncement(ctx, channel, timeStr, timezone, startTimeMs, winners, prize, durationMs, opts);
        } else {
            
            const payload = {
                duration: durationMs,
                roleRequirement: opts.roleReq || null,
                inviteRequirement: opts.inviteReq || 0,
                captchaRequirement: opts.captchaReq || false,
                winnerRole: opts.winnerRole || null,
                assignRole: opts.assignRole || null,
                customMessage: opts.customMessage || null,
                thumbnail: opts.thumbnail || null,
                emoji: opts.emoji || "<a:Exe_Gw:1454033571273506929>",
                birthdayUser: opts.birthdayUser || null,
                announcement: opts.announcement || null,
                announcementMedia: opts.announcementMedia || null
            };

            await this.saveScheduledGiveaway(ctx, channel, startTimeMs, winners, prize, timezone, payload);
        }
    },

    async promptForAnnouncement(ctx: ChatInputCommandInteraction, channel: TextChannel, timeStr: string, timezone: string, startTimeMs: number, winners: number, prize: string, durationMs: number, opts: any) {
        const promptEmbed = new EmbedBuilder()
            .setTitle('📢 Add Giveaway Announcement?')
            .setDescription([
                'Would you like to add an announcement message that will be posted when the giveaway starts?',
                '',
                '**Announcements can include:**',
                '• Text message',
                '• Images or GIFs',
                '',
                '💡 *Choose below to continue*'
            ].join('\n'))
            .setColor(Theme.EmbedColor);

        const row = new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('add_announcement')
                    .setLabel('Yes, Add Announcement')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('📢'),
                new ButtonBuilder()
                    .setCustomId('skip_announcement')
                    .setLabel('No, Skip')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('⏭️')
            );

        const promptMsg = await ctx.editReply({ embeds: [promptEmbed], components: [row] });

        try {
            const selection = await promptMsg.awaitMessageComponent({ 
                filter: (btn) => btn.user.id === ctx.user.id, 
                time: 60000,
                componentType: ComponentType.Button
            });

            if (selection.customId === 'add_announcement') {
                await selection.update({ content: '', embeds: [], components: [] });
                await this.handleAnnouncementInput(ctx, channel, timeStr, timezone, startTimeMs, winners, prize, durationMs, opts);
            } else {
                
                const payload = {
                    duration: durationMs,
                    roleRequirement: opts.roleReq || null,
                    inviteRequirement: opts.inviteReq || 0,
                    captchaRequirement: opts.captchaReq || false,
                    winnerRole: opts.winnerRole || null,
                    assignRole: opts.assignRole || null,
                    customMessage: opts.customMessage || null,
                    thumbnail: opts.thumbnail || null,
                    emoji: opts.emoji || "<a:Exe_Gw:1454033571273506929>",
                    birthdayUser: opts.birthdayUser || null,
                    announcement: null,
                    announcementMedia: null
                };

                await selection.deferUpdate();
                await this.saveScheduledGiveaway(selection, channel, startTimeMs, winners, prize, timezone, payload);
            }
        } catch (e) {
            
            const payload = {
                duration: durationMs,
                roleRequirement: opts.roleReq || null,
                inviteRequirement: opts.inviteReq || 0,
                captchaRequirement: opts.captchaReq || false,
                winnerRole: opts.winnerRole || null,
                assignRole: opts.assignRole || null,
                customMessage: opts.customMessage || null,
                thumbnail: opts.thumbnail || null,
                emoji: opts.emoji || "<a:Exe_Gw:1454033571273506929>",
                birthdayUser: opts.birthdayUser || null,
                announcement: null,
                announcementMedia: null
            };

            await this.saveScheduledGiveaway(ctx, channel, startTimeMs, winners, prize, timezone, payload);
        }
    },

    async handleAnnouncementInput(ctx: ChatInputCommandInteraction, channel: TextChannel, timeStr: string, timezone: string, startTimeMs: number, winners: number, prize: string, durationMs: number, opts: any) {
        
        const promptEmbed = new EmbedBuilder()
            .setTitle('📢 Add Giveaway Announcement')
            .setDescription([
                'Please send your announcement message below.',
                '',
                '**You can include:**',
                '• Text message',
                '• Images (attach or paste URL)',
                '• GIFs',
                '',
                '⏰ You have **5 minutes** to send your message.',
                '',
                '💡 *This announcement will be posted in the giveaway channel when the giveaway starts.*'
            ].join('\n'))
            .setColor(Theme.EmbedColor)
            .setFooter({ text: 'Send your message now' });

        await ctx.editReply({ embeds: [promptEmbed] });

        
        const filter = (m: Message) => m.author.id === ctx.user.id && m.channel.id === ctx.channel!.id;
        const messageChannel = ctx.channel as TextChannel;
        const collected = await messageChannel.awaitMessages({ filter, max: 1, time: 300000, errors: ['time'] }).catch(() => null);

        if (!collected || collected.size === 0) {
            const timeoutEmbed = new EmbedBuilder()
                .setDescription(`${Emojis.CROSS} Timed out. Giveaway not scheduled.`)
                .setColor(Theme.ErrorColor);
            return await ctx.editReply({ embeds: [timeoutEmbed] });
        }

        const userMessage = collected.first()!;
        const announcementText = userMessage.content || '';
        const announcementMedia = userMessage.attachments.first()?.url || null;

        
        await userMessage.delete().catch(() => {});

        
        const previewEmbed = new EmbedBuilder()
            .setTitle('👀 Announcement Preview')
            .setDescription(announcementText || '*No text*')
            .setColor(Theme.EmbedColor)
            .setFooter({ text: 'This will be posted when the giveaway starts' });

        if (announcementMedia) {
            previewEmbed.setImage(announcementMedia);
        }

        const row = new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('save_announcement')
                    .setLabel('Save & Schedule')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('💾'),
                new ButtonBuilder()
                    .setCustomId('edit_announcement')
                    .setLabel('Edit')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('✏️'),
                new ButtonBuilder()
                    .setCustomId('cancel_announcement')
                    .setLabel('Cancel')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('❌')
            );

        const previewMsg = await ctx.editReply({ embeds: [previewEmbed], components: [row] });

        
        try {
            const selection = await previewMsg.awaitMessageComponent({ 
                filter: (btn) => btn.user.id === ctx.user.id, 
                time: 60000,
                componentType: ComponentType.Button
            });

            if (selection.customId === 'save_announcement') {
                const payload = {
                    duration: durationMs,
                    roleRequirement: opts.roleReq || null,
                    inviteRequirement: opts.inviteReq || 0,
                    captchaRequirement: opts.captchaReq || false,
                    winnerRole: opts.winnerRole || null,
                    assignRole: opts.assignRole || null,
                    customMessage: opts.customMessage || null,
                    thumbnail: opts.thumbnail || null,
                    emoji: opts.emoji || "<a:Exe_Gw:1454033571273506929>",
                    birthdayUser: opts.birthdayUser || null,
                    announcement: announcementText,
                    announcementMedia: announcementMedia
                };

                await selection.deferUpdate();
                await this.saveScheduledGiveaway(selection, channel, startTimeMs, winners, prize, timezone, payload);
            } else if (selection.customId === 'edit_announcement') {
                await selection.update({ content: '', embeds: [], components: [] });
                
                await this.handleAnnouncementInput(ctx, channel, timeStr, timezone, startTimeMs, winners, prize, durationMs, opts);
            } else {
                const cancelEmbed = new EmbedBuilder()
                    .setDescription(`${Emojis.CROSS} Giveaway scheduling cancelled.`)
                    .setColor(Theme.ErrorColor);
                await selection.update({ embeds: [cancelEmbed], components: [] });
            }
        } catch (e) {
            const timeoutEmbed = new EmbedBuilder()
                .setDescription(`${Emojis.CROSS} Timed out. Giveaway not scheduled.`)
                .setColor(Theme.ErrorColor);
            await ctx.editReply({ embeds: [timeoutEmbed], components: [] });
        }
    },

    async saveScheduledGiveaway(ctx: any, channel: TextChannel, startTimeMs: number, winners: number, prize: string, timezone: string, payload: any) {
        const reply = async (msg: any) => {
            if (ctx.deferred || ctx.replied) {
                return await ctx.editReply(msg);
            } else {
                return await ctx.reply(msg);
            }
        };

        try {
            await prisma.scheduledGiveaway.create({
                data: {
                    channelId: channel.id,
                    guildId: ctx.guildId!,
                    hostId: ctx.user ? ctx.user.id : ctx.author.id,
                    prize: prize,
                    winnersCount: winners,
                    startTime: toBigInt(startTimeMs),
                    payload: JSON.stringify(payload)
                }
            });

            const timestamp = Math.floor(startTimeMs / 1000);
            const successEmbed = new EmbedBuilder()
                .setTitle(`${Emojis.TICK} Giveaway Scheduled!`)
                .setDescription([
                    `**Prize:** ${prize}`,
                    `**Winners:** ${winners}`,
                    `**Channel:** ${channel}`,
                    `**Start Time:** <t:${timestamp}:F> (<t:${timestamp}:R>)`,
                    `**Timezone:** ${timezone}`,
                    payload.announcement ? '\n📢 *Announcement will be posted*' : ''
                ].join('\n'))
                .setColor(Theme.SuccessColor)
                .setTimestamp();

            await reply({ embeds: [successEmbed], components: [] });

        } catch (error) {
            console.error(error);
            await reply({ content: `${Emojis.CROSS} Failed to schedule giveaway.`, ephemeral: true });
        }
    }
};
