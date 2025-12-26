"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InviteService = void 0;
const discord_js_1 = require("discord.js");
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
class InviteService {
    client;
    invites = new discord_js_1.Collection(); // GuildId -> InviteCode -> Uses
    constructor(client) {
        this.client = client;
    }
    // Initialize cache for a guild
    async cacheGuildInvites(guild) {
        try {
            const currentInvites = await guild.invites.fetch();
            const inviteMap = new discord_js_1.Collection();
            currentInvites.forEach(inv => {
                inviteMap.set(inv.code, inv.uses || 0);
            });
            this.invites.set(guild.id, inviteMap);
        }
        catch (e) {
            console.error(`Failed to cache invites for guild ${guild.id}`, e);
        }
    }
    async onMemberAdd(member) {
        if (member.user.bot)
            return;
        const guild = member.guild;
        const previousInvites = this.invites.get(guild.id);
        if (!previousInvites) {
            await this.cacheGuildInvites(guild);
            return;
        }
        try {
            const newInvites = await guild.invites.fetch();
            // Find which invite count increased
            const usedInvite = newInvites.find((inv) => {
                const prev = previousInvites.get(inv.code) || 0;
                return (inv.uses || 0) > prev;
            });
            // Update cache
            const newMap = new discord_js_1.Collection();
            newInvites.forEach((inv) => newMap.set(inv.code, inv.uses || 0));
            this.invites.set(guild.id, newMap);
            if (usedInvite && usedInvite.inviter) {
                const inviterId = usedInvite.inviter.id;
                // 1. Record the invite implementation
                await prisma.inviteTracker.create({
                    data: {
                        guildId: guild.id,
                        inviteeId: member.id,
                        inviterId: inviterId,
                        code: usedInvite.code
                    }
                });
                // 2. Increment stats
                await prisma.userStats.upsert({
                    where: { guildId_userId: { guildId: guild.id, userId: inviterId } },
                    update: { inviteCount: { increment: 1 } },
                    create: { guildId: guild.id, userId: inviterId, inviteCount: 1 }
                });
                console.log(`Tracked invite: ${inviterId} invited ${member.id}`);
            }
            else {
                // Vanity URL or unknown
                console.log(`Member ${member.id} joined ${guild.id} via unknown/vanity/widget.`);
            }
        }
        catch (e) {
            console.error("Error tracking member join", e);
        }
    }
    async onMemberRemove(member) {
        if (member.user.bot)
            return;
        try {
            // Find who invited them
            const tracker = await prisma.inviteTracker.findUnique({
                where: { guildId_inviteeId: { guildId: member.guild.id, inviteeId: member.id } }
            });
            if (tracker) {
                // Decrement inviter's count
                await prisma.userStats.update({
                    where: { guildId_userId: { guildId: member.guild.id, userId: tracker.inviterId } },
                    data: { inviteCount: { decrement: 1 } }
                }).catch(() => { }); // Ignore if user stats gone
                // Clean up tracker
                await prisma.inviteTracker.delete({
                    where: { id: tracker.id }
                });
                console.log(`Decremented invite for ${tracker.inviterId} as ${member.id} left.`);
            }
        }
        catch (e) {
            console.error("Error tracking member leave", e);
        }
    }
}
exports.InviteService = InviteService;
