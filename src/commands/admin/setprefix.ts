import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits, Message, EmbedBuilder } from 'discord.js';
import { PrismaClient } from '@prisma/client';
import { Emojis } from '../../utils/emojis';
import { Theme } from '../../utils/theme';

const prisma = new PrismaClient();

async function setPrefixLogic(guildId: string, newPrefix: string): Promise<string> {
    await prisma.giveawayConfig.upsert({
        where: { guildId },
        update: { prefix: newPrefix },
        create: { guildId, prefix: newPrefix }
    });
    return `${Emojis.TICK} Prefix updated to \`${newPrefix}\``;
}

export default {
    data: new SlashCommandBuilder()
        .setName('setprefix')
        .setDescription('Set the bot prefix for this server')
        .addStringOption(option =>
            option.setName('prefix')
                .setDescription('The new prefix')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    async execute(interaction: ChatInputCommandInteraction) {
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
            return interaction.reply({ content: `${Emojis.CROSS} You need Manage Server permissions.`, ephemeral: true });
        }
        const newPrefix = interaction.options.getString('prefix', true);
        const response = await setPrefixLogic(interaction.guildId!, newPrefix);

        const embed = new EmbedBuilder()
            .setColor(Theme.EmbedColor)
            .setDescription(response);

        await interaction.reply({ embeds: [embed], ephemeral: true });
    },

    async prefixRun(message: Message, args: string[]) {
        if (!message.member?.permissions.has(PermissionFlagsBits.ManageGuild)) {
            return message.reply(`${Emojis.CROSS} You need Manage Server permissions.`);
        }
        if (args.length === 0) {
            return message.reply(`${Emojis.CROSS} Usage: \`!setprefix <new_prefix>\``);
        }
        const newPrefix = args[0];
        const response = await setPrefixLogic(message.guildId!, newPrefix);

        const embed = new EmbedBuilder()
            .setColor(Theme.EmbedColor)
            .setDescription(response);

        await message.reply({ embeds: [embed] });
    }
};
