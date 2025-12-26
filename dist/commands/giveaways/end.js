"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const GiveawayService_1 = require("../../services/GiveawayService");
const permissions_1 = require("../../utils/permissions");
const emojis_1 = require("../../utils/emojis");
exports.default = {
    data: new discord_js_1.SlashCommandBuilder()
        .setName('gend')
        .setDescription('End a giveaway immediately')
        .addStringOption(option => option.setName('message_id').setDescription('Message ID of the giveaway').setRequired(true)),
    async execute(interaction) {
        if (!await (0, permissions_1.hasGiveawayPermissions)(interaction)) {
            return interaction.reply({ content: `${emojis_1.Emojis.CROSS} You need Manage Server permissions or the giveaway manager role to end giveaways.`, ephemeral: true });
        }
        const messageId = interaction.options.getString('message_id', true);
        await this.run(interaction, messageId);
    },
    async prefixRun(message, args) {
        if (!message.member?.permissions.has(discord_js_1.PermissionFlagsBits.ManageGuild)) {
            return message.reply(`${emojis_1.Emojis.CROSS} You need Manage Server permissions.`);
        }
        if (args.length < 1) {
            return message.reply(`${emojis_1.Emojis.CROSS} Usage: \`!gend <message_id>\``);
        }
        await this.run(message, args[0]);
    },
    async run(ctx, messageId) {
        const service = new GiveawayService_1.GiveawayService(ctx.client);
        try {
            await service.endGiveaway(messageId);
            const msg = `${emojis_1.Emojis.TICK} Giveaway ended successfully.`;
            if (ctx.reply)
                await ctx.reply({ content: msg, ephemeral: true });
        }
        catch (error) {
            console.error(error);
            const msg = `${emojis_1.Emojis.CROSS} Failed to end giveaway. Check ID or if already ended.`;
            if (ctx.reply)
                await ctx.reply({ content: msg, ephemeral: true });
        }
    }
};
