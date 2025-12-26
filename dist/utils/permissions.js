"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hasGiveawayPermissions = hasGiveawayPermissions;
const discord_js_1 = require("discord.js");
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function hasGiveawayPermissions(interaction) {
    const member = interaction.member;
    if (!member)
        return false;
    // Check if user has ManageGuild permission
    if (member.permissions.has(discord_js_1.PermissionFlagsBits.ManageGuild)) {
        return true;
    }
    // Check if user has the configured manager role
    const config = await prisma.giveawayConfig.findUnique({
        where: { guildId: interaction.guildId }
    });
    if (config?.managerRole && member.roles.cache.has(config.managerRole)) {
        return true;
    }
    return false;
}
