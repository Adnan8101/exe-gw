import { prisma } from '../../utils/database';

import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits } from 'discord.js';
import { GiveawayService } from '../../services/GiveawayService';
import { hasGiveawayPermissions } from '../../utils/permissions';
import { Emojis } from '../../utils/emojis';


export default {
    data: new SlashCommandBuilder()
        .setName('gcancel')
        .setDescription('Cancel a giveaway')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addStringOption(option =>
            option.setName('message_id')
                .setDescription('The message ID of the giveaway')
                .setRequired(true)),

    async execute(interaction: ChatInputCommandInteraction) {
        if (!await hasGiveawayPermissions(interaction)) {
            return interaction.reply({
                content: `${Emojis.CROSS} You need Manage Server permissions or the giveaway manager role.`,
                ephemeral: true
            });
        }

        const messageId = interaction.options.getString('message_id', true);
        const giveawayService = new GiveawayService(interaction.client);

        try {
            await giveawayService.cancelGiveaway(messageId);
            await interaction.reply({
                content: `${Emojis.TICK} Giveaway cancelled successfully.`,
                ephemeral: true
            });
        } catch (error: any) {
            await interaction.reply({
                content: `${Emojis.CROSS} ${error.message}`,
                ephemeral: true
            });
        }
    },

    async prefixRun(message: any, args: string[]) {
        if (!message.member?.permissions.has('ManageGuild')) {
            return message.reply(`${Emojis.CROSS} You need Manage Server permissions.`);
        }

        if (args.length === 0) {
            return message.reply(`${Emojis.CROSS} Usage: \`!gcancel <message_id>\``);
        }

        const messageId = args[0];
        const giveawayService = new GiveawayService(message.client);

        try {
            await giveawayService.cancelGiveaway(messageId);
            const reply = await message.reply(`${Emojis.TICK} Giveaway cancelled successfully.`);
            
            setTimeout(async () => {
                try {
                    await message.delete().catch(() => {});
                    await reply.delete().catch(() => {});
                } catch (e) {}
            }, 3000);
        } catch (error: any) {
            await message.reply(`${Emojis.CROSS} ${error.message}`);
        }
    }
};
