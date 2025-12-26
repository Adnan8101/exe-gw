"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const client_1 = require("@prisma/client");
const embeds_1 = require("../../utils/embeds");
const permissions_1 = require("../../utils/permissions");
const emojis_1 = require("../../utils/emojis");
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
exports.default = {
    data: new discord_js_1.SlashCommandBuilder()
        .setName('gcreate')
        .setDescription('Start a new giveaway')
        .addStringOption(option => option.setName('prize')
        .setDescription('The prize to give away')
        .setRequired(true))
        .addIntegerOption(option => option.setName('winners')
        .setDescription('Number of winners')
        .setRequired(true))
        .addStringOption(option => option.setName('duration')
        .setDescription('Duration (e.g. 10m, 1h, 2d)')
        .setRequired(true))
        .addChannelOption(option => option.setName('channel')
        .setDescription('Channel to host the giveaway in (default: current channel)')
        .addChannelTypes(discord_js_1.ChannelType.GuildText))
        .addRoleOption(option => option.setName('role_requirement')
        .setDescription('Required role to enter'))
        .addIntegerOption(option => option.setName('invite_requirement')
        .setDescription('Minimum invites required'))
        .addIntegerOption(option => option.setName('account_age')
        .setDescription('Minimum account age in days'))
        .addIntegerOption(option => option.setName('server_age')
        .setDescription('Minimum days in server'))
        .addBooleanOption(option => option.setName('captcha')
        .setDescription('Require captcha verification'))
        .addIntegerOption(option => option.setName('message_required')
        .setDescription('Minimum messages required to enter'))
        .addIntegerOption(option => option.setName('voice')
        .setDescription('Minimum voice minutes required'))
        .addStringOption(option => option.setName('custom_message')
        .setDescription('Custom message to display in giveaway'))
        .addRoleOption(option => option.setName('winner_role')
        .setDescription('Role to give to winners'))
        .addRoleOption(option => option.setName('assign_role')
        .setDescription('Role to assign to participants'))
        .addStringOption(option => option.setName('thumbnail')
        .setDescription('URL for giveaway thumbnail'))
        .addStringOption(option => option.setName('custom_emoji')
        .setDescription('Custom emoji for giveaway reaction (default: 🎉)')),
    async execute(interaction) {
        if (!await (0, permissions_1.hasGiveawayPermissions)(interaction)) {
            return interaction.reply({ content: `${emojis_1.Emojis.CROSS} You need Manage Server permissions or the giveaway manager role to start giveaways.`, ephemeral: true });
        }
        const prize = interaction.options.getString('prize', true);
        const winners = interaction.options.getInteger('winners', true);
        const durationStr = interaction.options.getString('duration', true);
        const channel = interaction.options.getChannel('channel') || interaction.channel;
        const duration = parseDuration(durationStr);
        if (!duration) {
            return interaction.reply({ content: `${emojis_1.Emojis.CROSS} Invalid duration format. Use 10m, 1h, 2d, etc.`, ephemeral: true });
        }
        if (winners < 1) {
            return interaction.reply({ content: `${emojis_1.Emojis.CROSS} Invalid number of winners.`, ephemeral: true });
        }
        // Optional requirements
        const roleReq = interaction.options.getRole('role_requirement');
        const inviteReq = interaction.options.getInteger('invite_requirement') || 0;
        const accountAgeReq = interaction.options.getInteger('account_age') || 0;
        const serverAgeReq = interaction.options.getInteger('server_age') || 0;
        const captchaReq = interaction.options.getBoolean('captcha') || false;
        const messageReq = interaction.options.getInteger('message_required') || 0;
        const voiceReq = interaction.options.getInteger('voice') || 0;
        const customMessage = interaction.options.getString('custom_message');
        const assignRole = interaction.options.getRole('assign_role');
        const winnerRole = interaction.options.getRole('winner_role');
        const thumbnail = interaction.options.getString('thumbnail');
        const customEmoji = interaction.options.getString('custom_emoji') || "🎉";
        const endTime = Date.now() + duration;
        const giveawayData = {
            channelId: channel.id,
            guildId: interaction.guildId,
            hostId: interaction.user.id,
            prize: prize,
            winnersCount: winners,
            endTime: BigInt(endTime),
            createdAt: BigInt(Date.now()),
            roleRequirement: roleReq?.id || null,
            inviteRequirement: inviteReq,
            accountAgeRequirement: accountAgeReq,
            serverAgeRequirement: serverAgeReq,
            captchaRequirement: captchaReq,
            messageRequired: messageReq,
            voiceRequirement: voiceReq,
            customMessage: customMessage || null,
            assignRole: assignRole?.id || null,
            winnerRole: winnerRole?.id || null,
            thumbnail: thumbnail || null,
            emoji: customEmoji
        };
        try {
            await interaction.deferReply({ ephemeral: true });
            const gForEmbed = { ...giveawayData, messageId: "", id: 0 }; // Mock
            const embed = (0, embeds_1.createGiveawayEmbed)(gForEmbed, 0);
            const message = await channel.send({ embeds: [embed] });
            await message.react(customEmoji);
            // Now save to DB
            const giveaway = await prisma.giveaway.create({
                data: {
                    ...giveawayData,
                    messageId: message.id
                }
            });
            await interaction.editReply(`${emojis_1.Emojis.TICK} Giveaway created successfully in ${channel}!`);
        }
        catch (error) {
            console.error(error);
            await interaction.editReply(`${emojis_1.Emojis.CROSS} Failed to create giveaway.`);
        }
    },
    async prefixRun(message, args) {
        // Fetch global commands to find the ID for /gcreate
        const command = message.client.application.commands.cache.find((c) => c.name === 'gcreate');
        const commandId = command ? command.id : '0';
        // Dynamic import Theme to avoid circular dep if needed, but imported at top should be fine if available.
        // Wait, Theme is not imported in this file yet.
        await message.reply({
            content: `${emojis_1.Emojis.CROSS} The \`!gcreate\` command has been moved to slash commands only.\n\nPlease use </gcreate:${commandId}> instead!`
        });
    }
};
