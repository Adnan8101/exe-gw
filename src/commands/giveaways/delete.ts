import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits } from 'discord.js';
import { GiveawayService } from '../../services/GiveawayService';
import { hasGiveawayPermissions } from '../../utils/permissions';
import { Emojis } from '../../utils/emojis';

export default {
    data: new SlashCommandBuilder()
        .setName('gdelete')
        .setDescription('Delete a giveaway completely')
        .addStringOption(option =>
            option.setName('message_id').setDescription('Message ID (active) or ID (scheduled)').setRequired(true)),

    async execute(interaction: ChatInputCommandInteraction) {
        if (!await hasGiveawayPermissions(interaction)) {
            return interaction.reply({ content: `${Emojis.CROSS} You need Manage Server permissions or the giveaway manager role to delete giveaways.`, ephemeral: true });
        }
        const inputId = interaction.options.getString('message_id', true);
        await this.run(interaction, inputId);
    },

    async prefixRun(message: any, args: string[]) {
        if (!message.member?.permissions.has(PermissionFlagsBits.ManageGuild)) {
            return message.reply(`${Emojis.CROSS} You need Manage Server permissions.`);
        }
        if (args.length < 1) {
            return message.reply(`${Emojis.CROSS} Usage: \`!gdelete <message_id>\``);
        }
        await this.run(message, args[0]);
    },

    async run(ctx: any, inputId: string) {
        const service = new GiveawayService(ctx.client);
        try {
            if (/^\d+$/.test(inputId) && inputId.length < 10) {
                const id = parseInt(inputId);
                try {
                    await service.deleteScheduledGiveaway(id);
                    const msg = `${Emojis.TICK} Scheduled giveaway **#${id}** cancelled and deleted.`;
                    if (ctx.reply) {
                        const reply = await ctx.reply({ content: msg, ephemeral: true });
                        setTimeout(async () => {
                            try {
                                if (ctx.deleteReply) await ctx.deleteReply().catch(() => {});
                            } catch (e) { }
                        }, 3000);
                        return;
                    }
                } catch (e) { }
            }

            await service.deleteGiveaway(inputId);
            const msg = `${Emojis.TICK} Giveaway deleted.`;
            if (ctx.reply) {
                await ctx.reply({ content: msg, ephemeral: true });
                setTimeout(async () => {
                    try {
                        if (ctx.deleteReply) await ctx.deleteReply().catch(() => {});
                    } catch (e) { }
                }, 3000);
            }
        } catch (error) {
            console.error(error);
            const msg = `${Emojis.CROSS} Failed to delete giveaway. Check ID.`;
            if (ctx.reply) await ctx.reply({ content: msg, ephemeral: true });
        }
    }
};
