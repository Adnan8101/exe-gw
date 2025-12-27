import { prisma } from '../../utils/database';

import { SlashCommandBuilder, PermissionFlagsBits, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { Emojis } from '../../utils/emojis';
import { Theme } from '../../utils/theme';


export default {
    data: new SlashCommandBuilder()
        .setName('set_giveaway_admin')
        .setDescription('Set a role that can manage giveaways without admin permissions')
        .addRoleOption(option =>
            option.setName('role')
                .setDescription('The role to grant giveaway manager permissions')
                .setRequired(true)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    async execute(interaction: ChatInputCommandInteraction) {
        const role = interaction.options.getRole('role');

        if (!role) {
            return interaction.reply({
                content: `${Emojis.CROSS} Invalid role specified.`,
                ephemeral: true
            });
        }

        try {
            await prisma.giveawayConfig.upsert({
                where: {
                    guildId: interaction.guildId!
                },
                update: {
                    managerRole: role.id
                },
                create: {
                    guildId: interaction.guildId!,
                    managerRole: role.id
                }
            });

            const embed = new EmbedBuilder()
                .setColor(Theme.EmbedColor)
                .setDescription(`${Emojis.TICK} Successfully set ${role} as the giveaway manager role.\nUsers with this role can now use all giveaway commands.`);

            await interaction.reply({ embeds: [embed], ephemeral: true });

        } catch (error) {
            console.error('Error setting giveaway admin role:', error);
            await interaction.reply({
                content: `${Emojis.CROSS} An error occurred while setting the giveaway admin role.`,
                ephemeral: true
            });
        }
    }
};
