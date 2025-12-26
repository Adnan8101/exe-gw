import { CommandInteraction, PermissionFlagsBits, GuildMember } from 'discord.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function hasGiveawayPermissions(interaction: CommandInteraction): Promise<boolean> {
    const member = interaction.member as GuildMember;
    if (!member) return false;

    // Check if user has ManageGuild permission
    if (member.permissions.has(PermissionFlagsBits.ManageGuild)) {
        return true;
    }

    // Check if user has the configured manager role
    const config = await prisma.giveawayConfig.findUnique({
        where: { guildId: interaction.guildId! }
    });

    if (config?.managerRole && member.roles.cache.has(config.managerRole)) {
        return true;
    }

    return false;
}
