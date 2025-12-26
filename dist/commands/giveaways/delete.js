"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const GiveawayService_1 = require("../../services/GiveawayService");
const permissions_1 = require("../../utils/permissions");
const emojis_1 = require("../../utils/emojis");
exports.default = {
    data: new discord_js_1.SlashCommandBuilder()
        .setName('gdelete')
        .setDescription('Delete a giveaway completely')
        .addStringOption(option => option.setName('message_id').setDescription('Message ID (active) or ID (scheduled)').setRequired(true)),
    async execute(interaction) {
        if (!await (0, permissions_1.hasGiveawayPermissions)(interaction)) {
            return interaction.reply({ content: `${emojis_1.Emojis.CROSS} You need Manage Server permissions or the giveaway manager role to delete giveaways.`, ephemeral: true });
        }
        const inputId = interaction.options.getString('message_id', true);
        await this.run(interaction, inputId);
    },
    async prefixRun(message, args) {
        if (!message.member?.permissions.has(discord_js_1.PermissionFlagsBits.ManageGuild)) {
            return message.reply(`${emojis_1.Emojis.CROSS} You need Manage Server permissions.`);
        }
        if (args.length < 1) {
            return message.reply(`${emojis_1.Emojis.CROSS} Usage: \`!gdelete <message_id>\``);
        }
        await this.run(message, args[0]);
    },
    async run(ctx, inputId) {
        const service = new GiveawayService_1.GiveawayService(ctx.client);
        try {
            if (/^\d+$/.test(inputId) && inputId.length < 10) {
                const id = parseInt(inputId);
                try {
                    await service.deleteScheduledGiveaway(id);
                    const msg = `${emojis_1.Emojis.TICK} Scheduled giveaway **#${id}** cancelled and deleted.`;
                    if (ctx.reply)
                        return ctx.reply({ content: msg, ephemeral: true });
                }
                catch (e) { }
            }
            await service.deleteGiveaway(inputId);
            const msg = `${emojis_1.Emojis.TICK} Giveaway deleted.`;
            if (ctx.reply)
                await ctx.reply({ content: msg, ephemeral: true });
        }
        catch (error) {
            console.error(error);
            const msg = `${emojis_1.Emojis.CROSS} Failed to delete giveaway. Check ID.`;
            if (ctx.reply)
                await ctx.reply({ content: msg, ephemeral: true });
        }
    }
};
