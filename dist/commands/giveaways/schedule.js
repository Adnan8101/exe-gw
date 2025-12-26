"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const client_1 = require("@prisma/client");
const moment = __importStar(require("moment-timezone"));
const permissions_1 = require("../../utils/permissions");
const emojis_1 = require("../../utils/emojis");
const theme_1 = require("../../utils/theme");
const prisma = new client_1.PrismaClient();
function parseDuration(durationStr) {
    const regex = /^(\d+)(m|h|d|s)$/;
    const match = durationStr.match(regex);
    if (!match)
        return null;
    const value = parseInt(match[1]);
    const unit = match[2];
    switch (unit) {
        case 's': return value * 1000;
        case 'm': return value * 60 * 1000;
        case 'h': return value * 60 * 60 * 1000;
        case 'd': return value * 24 * 60 * 60 * 1000;
        default: return null;
    }
}
// Helper to parse Time "HH:mm" with Timezone
function getScheduledTime(timeStr, timezone) {
    // Validate format HH:mm
    const regex = /^([0-1]?[0-9]|2[0-3]):([0-5][0-9])$/;
    if (!regex.test(timeStr))
        return null;
    // Check if timezone is valid
    if (!moment.tz.zone(timezone))
        return null;
    const now = moment.tz(timezone);
    const [h, m] = timeStr.split(':').map(Number);
    // Create a moment object for "today" at the specified time in the correct timezone
    const scheduled = moment.tz(timezone)
        .set({ hour: h, minute: m, second: 0, millisecond: 0 });
    // If time has passed today, move to tomorrow
    if (scheduled.isBefore(now)) {
        scheduled.add(1, 'day');
    }
    return scheduled.valueOf();
}
exports.default = {
    data: new discord_js_1.SlashCommandBuilder()
        .setName('gschedule')
        .setDescription('Schedule a giveaway for a specific time')
        // ------------------------------------------------
        // Copy most options from gcreate, adding 'time'
        // ------------------------------------------------
        .addStringOption(option => option.setName('time').setDescription('Start Time (24h format, e.g. 14:30)').setRequired(true))
        .addStringOption(option => option.setName('timezone')
        .setDescription('Timezone (e.g. Asia/Kolkata, UTC, America/New_York)')
        .setRequired(true)
        .setAutocomplete(true))
        .addStringOption(option => option.setName('prize').setDescription('Prize to start').setRequired(true))
        .addIntegerOption(option => option.setName('winners').setDescription('Number of winners').setRequired(true))
        .addStringOption(option => option.setName('duration').setDescription('Duration (e.g. 30s, 1m, 1h)').setRequired(true))
        .addChannelOption(option => option.setName('channel').setDescription('Channel to start the giveaway in'))
        // --- Optional Requirements ---
        .addRoleOption(option => option.setName('role_requirement').setDescription('Role required to enter'))
        .addIntegerOption(option => option.setName('invite_requirement').setDescription('Number of invites required'))
        .addBooleanOption(option => option.setName('captcha').setDescription('Enable captcha verification (True/False)'))
        .addRoleOption(option => option.setName('winner_role').setDescription('Role to give to winners'))
        .addRoleOption(option => option.setName('assign_role').setDescription('Role to assign to participants'))
        .addStringOption(option => option.setName('custom_message').setDescription('Custom message to display'))
        .addStringOption(option => option.setName('thumbnail').setDescription('Thumbnail URL'))
        .addStringOption(option => option.setName('custom_emoji').setDescription('Custom emoji'))
        .addUserOption(option => option.setName('birthday_user').setDescription('User to wish happy birthday to')),
    async autocomplete(interaction) {
        const focusedValue = interaction.options.getFocused();
        const choices = moment.tz.names();
        const filtered = choices.filter(choice => choice.toLowerCase().includes(focusedValue.toLowerCase())).slice(0, 25);
        await interaction.respond(filtered.map(choice => ({ name: choice, value: choice })));
    },
    async execute(interaction) {
        if (!await (0, permissions_1.hasGiveawayPermissions)(interaction)) {
            return interaction.reply({ content: `${emojis_1.Emojis.CROSS} You need Manage Server permissions or the giveaway manager role to schedule giveaways.`, ephemeral: true });
        }
        await interaction.deferReply({ ephemeral: true });
        const timeStr = interaction.options.getString('time', true);
        const timezone = interaction.options.getString('timezone', true);
        const prize = interaction.options.getString('prize', true);
        const winners = interaction.options.getInteger('winners', true);
        const durationStr = interaction.options.getString('duration', true);
        const channel = interaction.options.getChannel('channel') || interaction.channel;
        // Optional logic handling for interactions
        const roleReq = interaction.options.getRole('role_requirement');
        const inviteReq = interaction.options.getInteger('invite_requirement') || 0;
        const captchaReq = interaction.options.getBoolean('captcha') || false;
        const winnerRole = interaction.options.getRole('winner_role');
        const assignRole = interaction.options.getRole('assign_role');
        const customMessage = interaction.options.getString('custom_message');
        const thumbnail = interaction.options.getString('thumbnail');
        const emoji = interaction.options.getString('custom_emoji') || "🎉";
        const birthdayUser = interaction.options.getUser('birthday_user');
        await this.run(interaction, channel, timeStr, timezone, winners, prize, durationStr, {
            roleReq: roleReq?.id,
            inviteReq,
            captchaReq,
            winnerRole: winnerRole?.id,
            assignRole: assignRole?.id,
            customMessage,
            thumbnail,
            emoji,
            birthdayUser: birthdayUser?.id
        });
    },
    async prefixRun(message, args) {
        // Fetch global commands to find the ID for /gschedule
        // This relies on the command being registered. 
        // We can search the client cache.
        const command = message.client.application.commands.cache.find((c) => c.name === 'gschedule');
        const commandId = command ? command.id : '0';
        const embed = new discord_js_1.EmbedBuilder()
            .setColor(theme_1.Theme.EmbedColor)
            .setDescription(`${emojis_1.Emojis.CROSS} The \`!gschedule\` command has been moved to slash commands only.\n\nPlease use </gschedule:${commandId}> instead!`);
        await message.reply({ embeds: [embed] });
    },
    async run(ctx, channel, timeStr, timezone, winners, prize, durationStr, opts) {
        // Helper to reply or editReply
        const reply = async (msg) => {
            if (ctx.deferred || ctx.replied) {
                return await ctx.editReply(msg);
            }
            else {
                return await ctx.reply(msg);
            }
        };
        // Parse Duration
        const duration = parseDuration(durationStr);
        if (!duration) {
            const msg = { content: `${emojis_1.Emojis.CROSS} Invalid duration format.`, ephemeral: true };
            return await reply(msg);
        }
        // Parse Start Time with Timezone
        const startTime = getScheduledTime(timeStr, timezone);
        if (!startTime) {
            const msg = { content: `${emojis_1.Emojis.CROSS} Invalid time or timezone.\n**Time format**: HH:mm\n**Timezone**: Valid IANA Zone (e.g., Asia/Kolkata, UTC)\nYour input: ${timeStr} in ${timezone}`, ephemeral: true };
            return await reply(msg);
        }
        // JSON Payload for later execution
        const payload = {
            duration,
            roleRequirement: opts.roleReq || null,
            inviteRequirement: opts.inviteReq || 0,
            captchaRequirement: opts.captchaReq || false,
            winnerRole: opts.winnerRole || null,
            assignRole: opts.assignRole || null,
            customMessage: opts.customMessage || null,
            thumbnail: opts.thumbnail || null,
            emoji: opts.emoji || "🎉",
            birthdayUser: opts.birthdayUser || null
        };
        try {
            await prisma.scheduledGiveaway.create({
                data: {
                    channelId: channel.id,
                    guildId: ctx.guildId,
                    hostId: ctx.user ? ctx.user.id : ctx.author.id,
                    prize: prize,
                    winnersCount: winners,
                    startTime: BigInt(startTime),
                    payload: JSON.stringify(payload)
                }
            });
            const timestamp = Math.floor(startTime / 1000);
            const msg = { content: `${emojis_1.Emojis.TICK} Giveaway scheduled for <t:${timestamp}:F> (<t:${timestamp}:R>) in ${channel}!\n**Prize:** ${prize}\n**Timezone:** ${timezone}`, ephemeral: true };
            await reply(msg);
        }
        catch (error) {
            console.error(error);
            await reply({ content: `${emojis_1.Emojis.CROSS} Failed to schedule giveaway.`, ephemeral: true });
        }
    }
};
