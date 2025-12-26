"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const theme_1 = require("../../utils/theme");
exports.default = {
    data: new discord_js_1.SlashCommandBuilder()
        .setName('ghelp')
        .setDescription('Shows available commands')
        .setDefaultMemberPermissions(discord_js_1.PermissionFlagsBits.ManageGuild),
    async execute(interaction) {
        await interaction.reply({ embeds: [createHelpEmbed()], ephemeral: true });
    },
    async prefixRun(message) {
        await message.reply({ embeds: [createHelpEmbed()] });
    }
};
function createHelpEmbed() {
    return new discord_js_1.EmbedBuilder()
        .setTitle('📚 Giveaway Commands')
        .setColor(theme_1.Theme.EmbedColor)
        .setDescription('All commands require **Manage Server** permission.')
        .addFields({ name: '/gstart <time> <winners> <prize>', value: 'Quick start a giveaway.' }, { name: '/gcreate', value: 'Start a giveaway with advanced options (requirements, roles, etc.).' }, { name: '/gend <message_id>', value: 'End a giveaway immediately.' }, { name: '/greroll <message_id>', value: 'Pick a new winner for an ended giveaway.' }, { name: '/gdelete <message_id>', value: 'Delete a giveaway completely.' }, { name: '/glist', value: 'List all running giveaways.' }, { name: '/ginvite', value: 'Get the bot invite link.' }, { name: '/gabout', value: 'Bot information.' });
}
