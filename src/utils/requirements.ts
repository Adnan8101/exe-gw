import { Client, GuildMember } from 'discord.js';
import { PrismaClient, Giveaway } from '@prisma/client';

const prisma = new PrismaClient();

export interface RequirementResult {
    passed: boolean;
    reason?: string;
}

export async function checkAllRequirements(
    client: Client,
    guildId: string,
    userId: string,
    giveaway: Giveaway
): Promise<RequirementResult> {
    const guild = client.guilds.cache.get(guildId);
    if (!guild) return { passed: false, reason: "Guild not found" };

    let member: GuildMember;
    try {
        member = await guild.members.fetch(userId);
    } catch (e) {
        return { passed: false, reason: "Could not fetch member" };
    }

    
    if (giveaway.roleRequirement) {
        if (!member.roles.cache.has(giveaway.roleRequirement)) {
            return {
                passed: false,
                reason: `You need the <@&${giveaway.roleRequirement}> role to enter`
            };
        }
    }

    
    if (giveaway.inviteRequirement > 0) {
        try {
            const invites = await guild.invites.fetch();
            let userInvites = 0;
            invites.forEach(inv => {
                if (inv.inviterId === userId) {
                    userInvites += inv.uses || 0;
                }
            });

            if (userInvites < giveaway.inviteRequirement) {
                return {
                    passed: false,
                    reason: `You need at least ${giveaway.inviteRequirement} invites (you have ${userInvites})`
                };
            }
        } catch (e) {
            console.error("Error checking invites:", e);
        }
    }

    
    if (giveaway.accountAgeRequirement > 0) {
        const createdTimestamp = member.user.createdTimestamp;
        const ageDays = Math.floor((Date.now() - createdTimestamp) / (1000 * 60 * 60 * 24));

        if (ageDays < giveaway.accountAgeRequirement) {
            return {
                passed: false,
                reason: `Your account must be at least ${giveaway.accountAgeRequirement} days old (yours is ${ageDays} days)`
            };
        }
    }

    
    if (giveaway.serverAgeRequirement > 0 && member.joinedTimestamp) {
        const ageDays = Math.floor((Date.now() - member.joinedTimestamp) / (1000 * 60 * 60 * 24));
        if (ageDays < giveaway.serverAgeRequirement) {
            return {
                passed: false,
                reason: `You must be a member for at least ${giveaway.serverAgeRequirement} days (you've been here ${ageDays} days)`
            };
        }
    }

    
    if (giveaway.messageRequired > 0 || giveaway.voiceRequirement > 0) {
        const stats = await prisma.userStats.findUnique({
            where: {
                guildId_userId: {
                    guildId: guildId,
                    userId: userId
                }
            }
        });

        if (stats) {
            if (giveaway.messageRequired > 0 && stats.messageCount < giveaway.messageRequired) {
                return {
                    passed: false,
                    reason: `You need at least ${giveaway.messageRequired} messages (you have ${stats.messageCount})`
                };
            }

            if (giveaway.voiceRequirement > 0 && stats.voiceMinutes < giveaway.voiceRequirement) {
                return {
                    passed: false,
                    reason: `You need at least ${giveaway.voiceRequirement} minutes in voice chat (you have ${stats.voiceMinutes})`
                };
            }
        } else if (giveaway.messageRequired > 0 || giveaway.voiceRequirement > 0) {
            return {
                passed: false,
                reason: `You do not meet the activity requirements (No stats found)`
            };
        }
    }

    return { passed: true };
}
