"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const client_1 = require("@prisma/client");
const emojis_1 = require("../../utils/emojis");
const theme_1 = require("../../utils/theme");
const prisma = new client_1.PrismaClient();
async function setPrefixLogic(guildId, newPrefix) {
    await prisma.giveawayConfig.upsert({
        where: { guildId },
        update: { prefix: newPrefix },
        create: { guildId, prefix: newPrefix }
    });
    return `${emojis_1.Emojis.TICK} Prefix updated to \`${newPrefix}\``;
}
exports.default = {
    data: new discord_js_1.SlashCommandBuilder()
        .setName('setprefix')
        .setDescription('Set the bot prefix for this server')
        .addStringOption(option => option.setName('prefix')
        .setDescription('The new prefix')
        .setRequired(true))
        .setDefaultMemberPermissions(discord_js_1.PermissionFlagsBits.ManageGuild),
    async execute(interaction) {
        if (!interaction.memberPermissions?.has(discord_js_1.PermissionFlagsBits.ManageGuild)) {
            return interaction.reply({ content: `${emojis_1.Emojis.CROSS} You need Manage Server permissions.`, ephemeral: true });
        }
        const newPrefix = interaction.options.getString('prefix', true);
        const response = await setPrefixLogic(interaction.guildId, newPrefix);
        const embed = new discord_js_1.EmbedBuilder()
            .setColor(theme_1.Theme.EmbedColor)
            .setDescription(response);
        await interaction.reply({ embeds: [embed], ephemeral: true });
    },
    async prefixRun(message, args) {
        if (!message.member?.permissions.has(discord_js_1.PermissionFlagsBits.ManageGuild)) {
            return message.reply(`${emojis_1.Emojis.CROSS} You need Manage Server permissions.`);
        }
        if (args.length === 0) {
            return message.reply(`${emojis_1.Emojis.CROSS} Usage: \`!setprefix <new_prefix>\``);
        }
        const newPrefix = args[0];
        const response = await setPrefixLogic(message.guildId, newPrefix);
        const embed = new discord_js_1.EmbedBuilder()
            .setColor(theme_1.Theme.EmbedColor)
            .setDescription(response);
        await message.reply({ embeds: [embed] });
    }
};
