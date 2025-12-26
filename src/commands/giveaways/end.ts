import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits } from 'discord.js';
import { GiveawayService } from '../../services/GiveawayService';
import { hasGiveawayPermissions, hasGiveawayPermissionsMessage } from '../../utils/permissions';
import { Emojis } from '../../utils/emojis';

export default {
    data: new SlashCommandBuilder()
        .setName('gend')
        .setDescription('End a giveaway immediately')
        .addStringOption(option =>
            option.setName('message_id').setDescription('Message ID of the giveaway').setRequired(true)),

    requiresPermissions: true,
    
    async checkPermissions(message: any): Promise<boolean> {
        return await hasGiveawayPermissionsMessage(message);
    },

    async execute(interaction: ChatInputCommandInteraction) {
        if (!await hasGiveawayPermissions(interaction)) {
            return interaction.reply({ content: `${Emojis.CROSS} You need Manage Server permissions or the giveaway manager role to end giveaways.`, ephemeral: true });
        }
        const messageId = interaction.options.getString('message_id', true);
        await this.run(interaction, messageId);
    },

    async prefixRun(message: any, args: string[]) {
        if (args.length < 1) {
            return message.reply(`${Emojis.CROSS} Usage: \`!gend <message_id>\``);
        }
        await this.run(message, args[0]);
    },

    async run(ctx: any, messageId: string) {
        const service = new GiveawayService(ctx.client);
        try {
            await service.endGiveaway(messageId);
            const msg = `${Emojis.TICK} Giveaway ended successfully.`;
            if (ctx.reply) await ctx.reply({ content: msg, ephemeral: true });
        } catch (error) {
            console.error(error);
            const msg = `${Emojis.CROSS} Failed to end giveaway. Check ID or if already ended.`;
            if (ctx.reply) await ctx.reply({ content: msg, ephemeral: true });
        }
    }
};
