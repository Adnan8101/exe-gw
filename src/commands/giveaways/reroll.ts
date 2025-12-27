import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits } from 'discord.js';
import { GiveawayService } from '../../services/GiveawayService';
import { hasGiveawayPermissions } from '../../utils/permissions';
import { Emojis } from '../../utils/emojis';

export default {
    data: new SlashCommandBuilder()
        .setName('greroll')
        .setDescription('Reroll a winner for an ended giveaway')
        .addStringOption(option =>
            option.setName('message_id').setDescription('Message ID of the giveaway').setRequired(true)),

    async execute(interaction: ChatInputCommandInteraction) {
        if (!await hasGiveawayPermissions(interaction)) {
            return interaction.reply({ content: `${Emojis.CROSS} You need Manage Server permissions or the giveaway manager role to reroll giveaways.`, ephemeral: true });
        }
        const messageId = interaction.options.getString('message_id', true);
        await this.run(interaction, messageId);
    },

    async prefixRun(message: any, args: string[]) {
        if (!message.member?.permissions.has(PermissionFlagsBits.ManageGuild)) {
            return message.reply(`${Emojis.CROSS} You need Manage Server permissions.`);
        }
        if (args.length < 1) {
            return message.reply(`${Emojis.CROSS} Usage: \`!greroll <message_id>\``);
        }
        await this.run(message, args[0]);
    },

    async run(ctx: any, messageId: string) {
        const service = new GiveawayService(ctx.client);
        try {
            const winners = await service.rerollGiveaway(messageId);
            if (winners.length > 0) {
                const msg = `${Emojis.TICK} Successfully rerolled!`;
                if (ctx.reply) {
                    await ctx.reply({ content: msg, ephemeral: true });
                    setTimeout(async () => {
                        try {
                            if (ctx.deleteReply) await ctx.deleteReply().catch(() => {});
                        } catch (e) { }
                    }, 3000);
                }
            } else {
                const msg = `${Emojis.CROSS} Could not find a new winner.`;
                if (ctx.reply) await ctx.reply({ content: msg, ephemeral: true });
            }
        } catch (error: any) {
            console.error(error);
            const msg = `${Emojis.CROSS} Check ID. ${error.message}`;
            if (ctx.reply) await ctx.reply({ content: msg, ephemeral: true });
        }
    }
};
