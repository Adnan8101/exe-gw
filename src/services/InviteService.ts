import { Client, Guild, Collection, Invite } from 'discord.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class InviteService {
    private invites: Collection<string, Collection<string, number>> = new Collection(); // GuildId -> InviteCode -> Uses

    constructor(private client: Client) { }

    // Initialize cache for a guild
    public async cacheGuildInvites(guild: Guild) {
        try {
            const currentInvites = await guild.invites.fetch();
            const inviteMap = new Collection<string, number>();

            currentInvites.forEach(inv => {
                inviteMap.set(inv.code, inv.uses || 0);
            });

            this.invites.set(guild.id, inviteMap);
        } catch (e) {
            console.error(`Failed to cache invites for guild ${guild.id}`, e);
        }
    }

    public async onMemberAdd(member: any) { // Type 'any' used to bypass partials if needed, though structure is Member
        if (member.user.bot) return;
        const guild = member.guild;

        const previousInvites = this.invites.get(guild.id);
        if (!previousInvites) {
            await this.cacheGuildInvites(guild);
            return;
        }

        try {
            const newInvites = await guild.invites.fetch();
            // Find which invite count increased
            const usedInvite = newInvites.find((inv: Invite) => {
                const prev = previousInvites.get(inv.code!) || 0;
                return (inv.uses || 0) > prev;
            });

            // Update cache
            const newMap = new Collection<string, number>();
            newInvites.forEach((inv: Invite) => newMap.set(inv.code!, inv.uses || 0));
            this.invites.set(guild.id, newMap);

            if (usedInvite && usedInvite.inviter) {
                const inviterId = usedInvite.inviter.id;

                // 1. Record the invite implementation
                await prisma.inviteTracker.create({
                    data: {
                        guildId: guild.id,
                        inviteeId: member.id,
                        inviterId: inviterId,
                        code: usedInvite.code!
                    }
                });

                // 2. Increment stats
                await prisma.userStats.upsert({
                    where: { guildId_userId: { guildId: guild.id, userId: inviterId } },
                    update: { inviteCount: { increment: 1 } },
                    create: { guildId: guild.id, userId: inviterId, inviteCount: 1 }
                });

                console.log(`Tracked invite: ${inviterId} invited ${member.id}`);
            } else {
                // Vanity URL or unknown
                console.log(`Member ${member.id} joined ${guild.id} via unknown/vanity/widget.`);
            }

        } catch (e) {
            console.error("Error tracking member join", e);
        }
    }

    public async onMemberRemove(member: any) {
        if (member.user.bot) return;

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
        } catch (e) {
            console.error("Error tracking member leave", e);
        }
    }
}
