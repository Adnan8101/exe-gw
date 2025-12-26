import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { PrismaClient } from '@prisma/client';
import { hasGiveawayPermissions } from '../../utils/permissions';
import { Emojis } from '../../utils/emojis';

const prisma = new PrismaClient();

export default {
    data: new SlashCommandBuilder()
        .setName('gresume')
        .setDescription('Resume a paused giveaway')
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

        try {
            const giveaway = await prisma.giveaway.findUnique({
                where: { messageId }
            });

            if (!giveaway) {
                return interaction.reply({
                    content: `${Emojis.CROSS} Giveaway not found.`,
                    ephemeral: true
                });
            }

            if (giveaway.ended) {
                return interaction.reply({
                    content: `${Emojis.CROSS} This giveaway has already ended.`,
                    ephemeral: true
                });
            }

            if (!giveaway.paused) {
                return interaction.reply({
                    content: `${Emojis.CROSS} This giveaway is not paused.`,
                    ephemeral: true
                });
            }

            // Calculate how long it was paused and extend the end time
            const pauseDuration = Date.now() - Number(giveaway.pausedAt);
            const newEndTime = Number(giveaway.endTime) + pauseDuration;

            await prisma.giveaway.update({
                where: { messageId },
                data: {
                    paused: false,
                    pausedAt: null,
                    endTime: BigInt(newEndTime)
                }
            });

            await interaction.reply({
                content: `${Emojis.TICK} Giveaway resumed successfully. The end time has been extended.`,
                ephemeral: true
            });
        } catch (error: any) {
            await interaction.reply({
                content: `${Emojis.CROSS} Failed to resume giveaway: ${error.message}`,
                ephemeral: true
            });
        }
    },

    async prefixRun(message: any, args: string[]) {
        if (!message.member?.permissions.has('ManageGuild')) {
            return message.reply(`${Emojis.CROSS} You need Manage Server permissions.`);
        }

        if (args.length === 0) {
            return message.reply(`${Emojis.CROSS} Usage: \`!gresume <message_id>\``);
        }

        const messageId = args[0];

        try {
            const giveaway = await prisma.giveaway.findUnique({
                where: { messageId }
            });

            if (!giveaway) {
                return message.reply(`${Emojis.CROSS} Giveaway not found.`);
            }

            if (giveaway.ended) {
                return message.reply(`${Emojis.CROSS} This giveaway has already ended.`);
            }

            if (!giveaway.paused) {
                return message.reply(`${Emojis.CROSS} This giveaway is not paused.`);
            }

            // Calculate how long it was paused and extend the end time
            const pauseDuration = Date.now() - Number(giveaway.pausedAt);
            const newEndTime = Number(giveaway.endTime) + pauseDuration;

            await prisma.giveaway.update({
                where: { messageId },
                data: {
                    paused: false,
                    pausedAt: null,
                    endTime: BigInt(newEndTime)
                }
            });

            const reply = await message.reply(`${Emojis.TICK} Giveaway resumed successfully. The end time has been extended.`);
            
            setTimeout(async () => {
                try {
                    await message.delete().catch(() => {});
                    await reply.delete().catch(() => {});
                } catch (e) {}
            }, 3000);
        } catch (error: any) {
            await message.reply(`${Emojis.CROSS} Failed to resume giveaway: ${error.message}`);
        }
    }
};
