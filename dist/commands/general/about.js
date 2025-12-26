"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const theme_1 = require("../../utils/theme");
exports.default = {
    data: new discord_js_1.SlashCommandBuilder()
        .setName('gabout')
        .setDescription('Shows information about the bot')
        .setDefaultMemberPermissions(discord_js_1.PermissionFlagsBits.ManageGuild),
    async execute(interaction) {
        await interaction.reply({ embeds: [createAboutEmbed()], ephemeral: true });
    },
    async prefixRun(message) {
        await message.reply({ embeds: [createAboutEmbed()] });
    }
};
function createAboutEmbed() {
    return new discord_js_1.EmbedBuilder()
        .setTitle('🤖 About Extreme Giveaways')
        .setDescription('Advanced Giveaway Bot with modern features.')
        .addFields({ name: 'Developer', value: 'Adnan', inline: true }, { name: 'Version', value: '1.0.0', inline: true }, { name: 'Language', value: 'TypeScript + Discord.js', inline: true })
        .setColor(theme_1.Theme.EmbedColor)
        .setFooter({ text: 'Excellence in Giveaways' });
}
