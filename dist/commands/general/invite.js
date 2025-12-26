"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const theme_1 = require("../../utils/theme");
exports.default = {
    data: new discord_js_1.SlashCommandBuilder()
        .setName('ginvite')
        .setDescription('Get the bot invite link')
        .setDefaultMemberPermissions(discord_js_1.PermissionFlagsBits.ManageGuild),
    async execute(interaction) {
        await interaction.reply({ embeds: [createInviteEmbed(interaction.client.user.id)], ephemeral: true });
    },
    async prefixRun(message) {
        await message.reply({ embeds: [createInviteEmbed(message.client.user.id)] });
    }
};
function createInviteEmbed(clientId) {
    const inviteLink = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&permissions=8&scope=bot%20applications.commands`;
    return new discord_js_1.EmbedBuilder()
        .setTitle('🔗 Invite Me')
        .setDescription(`[Click here to invite the bot to your server](${inviteLink})`)
        .setColor(theme_1.Theme.EmbedColor);
}
