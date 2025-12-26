"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const client_1 = require("@prisma/client");
const emojis_1 = require("../../utils/emojis");
const theme_1 = require("../../utils/theme");
const prisma = new client_1.PrismaClient();
exports.default = {
    data: new discord_js_1.SlashCommandBuilder()
        .setName('set_giveaway_admin')
        .setDescription('Set a role that can manage giveaways without admin permissions')
        .addRoleOption(option => option.setName('role')
        .setDescription('The role to grant giveaway manager permissions')
        .setRequired(true))
        .setDefaultMemberPermissions(discord_js_1.PermissionFlagsBits.ManageGuild),
    async execute(interaction) {
        const role = interaction.options.getRole('role');
        if (!role) {
            return interaction.reply({
                content: `${emojis_1.Emojis.CROSS} Invalid role specified.`,
                ephemeral: true
            });
        }
        try {
            await prisma.giveawayConfig.upsert({
                where: {
                    guildId: interaction.guildId
                },
                update: {
                    managerRole: role.id
                },
                create: {
                    guildId: interaction.guildId,
                    managerRole: role.id
                }
            });
            const embed = new discord_js_1.EmbedBuilder()
                .setColor(theme_1.Theme.EmbedColor)
                .setDescription(`${emojis_1.Emojis.TICK} Successfully set ${role} as the giveaway manager role.\nUsers with this role can now use all giveaway commands.`);
            await interaction.reply({ embeds: [embed], ephemeral: true });
        }
        catch (error) {
            console.error('Error setting giveaway admin role:', error);
            await interaction.reply({
                content: `${emojis_1.Emojis.CROSS} An error occurred while setting the giveaway admin role.`,
                ephemeral: true
            });
        }
    }
};
