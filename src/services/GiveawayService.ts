import { Client, TextChannel, ActionRowBuilder, ButtonBuilder, ButtonStyle, Role, GuildMember } from 'discord.js';
import { PrismaClient } from '@prisma/client';
import { giveawayEndedEmbed, giveawayCancelledEmbed, createGiveawayEmbed } from '../utils/embeds';

const prisma = new PrismaClient();


const preCalculatedWinners: Map<string, { winners: string[], calculatedAt: number }> = new Map();

export class GiveawayService {
    private client: Client;

    constructor(client: Client) {
        this.client = client;
    }

    /**
     * Check if a role can be assigned by the bot (role hierarchy check)
     */
    private async canAssignRole(guild: any, roleId: string): Promise<{ canAssign: boolean; reason?: string }> {
        try {
            const role = await guild.roles.fetch(roleId);
            if (!role) {
                return { canAssign: false, reason: 'Role not found' };
            }

            const botMember = guild.members.me;
            if (!botMember) {
                return { canAssign: false, reason: 'Bot member not found' };
            }

            const botHighestRole = botMember.roles.highest;
            if (role.position >= botHighestRole.position) {
                return { canAssign: false, reason: `The role **${role.name}** is above or equal to my highest role. I cannot assign it.` };
            }

            if (!botMember.permissions.has('ManageRoles')) {
                return { canAssign: false, reason: 'I don\'t have the Manage Roles permission.' };
            }

            return { canAssign: true };
        } catch (e) {
            return { canAssign: false, reason: 'Failed to check role permissions' };
        }
    }

    async startGiveaway(giveawayData: any): Promise<void> {
        const channel = this.client.channels.cache.get(giveawayData.channelId) as TextChannel;
        if (!channel) throw new Error("Channel not found");

        const gForEmbed: any = { ...giveawayData, messageId: "", id: 0 };
        const embed = createGiveawayEmbed(gForEmbed, 0);

        const message = await channel.send({ embeds: [embed] });
        await message.react(giveawayData.emoji || "<a:Exe_Gw:1454033571273506929>");

        await prisma.giveaway.create({
            data: {
                ...giveawayData,
                messageId: message.id
            }
        });
    }

    /**
     * Pre-calculate winners before the giveaway ends
     * This should be called 15 seconds before end time for high participant giveaways
     */
    async preCalculateWinners(messageId: string): Promise<void> {
        const giveaway = await prisma.giveaway.findUnique({ where: { messageId } });
        if (!giveaway || giveaway.ended) return;

        const participants = await prisma.participant.findMany({
            where: { giveawayId: giveaway.id },
            select: { userId: true }
        });

        const winners = this.selectWinners(
            participants.map((p: { userId: string }) => p.userId), 
            giveaway.winnersCount
        );

        preCalculatedWinners.set(messageId, {
            winners,
            calculatedAt: Date.now()
        });

        console.log(`[GiveawayService] Pre-calculated ${winners.length} winners for giveaway ${messageId}`);
    }

    async endGiveaway(messageId: string): Promise<void> {
        const giveaway = await prisma.giveaway.findUnique({ where: { messageId } });
        if (!giveaway || giveaway.ended) return;

        
        await prisma.giveaway.update({
            where: { id: giveaway.id },
            data: { ended: true }
        });

        
        let winners: string[];
        const preCalc = preCalculatedWinners.get(messageId);
        
        if (preCalc && (Date.now() - preCalc.calculatedAt) < 30000) {
            
            winners = preCalc.winners;
            preCalculatedWinners.delete(messageId);
            console.log(`[GiveawayService] Using pre-calculated winners for ${messageId}`);
        } else {
            
            const participants = await prisma.participant.findMany({
                where: { giveawayId: giveaway.id },
                select: { userId: true }
            });
            winners = this.selectWinners(
                participants.map((p: { userId: string }) => p.userId), 
                giveaway.winnersCount
            );
        }

        
        for (const winnerId of winners) {
            await prisma.winner.create({
                data: {
                    giveawayId: giveaway.id,
                    userId: winnerId,
                    wonAt: BigInt(Date.now())
                }
            });
        }

        
        const channel = this.client.channels.cache.get(giveaway.channelId) as TextChannel;
        const guild = this.client.guilds.cache.get(giveaway.guildId);

        if (channel && guild) {
            try {
                
                const embed = giveawayEndedEmbed(giveaway, winners);
                let giveawayMessage;
                try {
                    giveawayMessage = await channel.messages.fetch(giveaway.messageId);
                    await giveawayMessage.edit({ embeds: [embed] });
                } catch (e) { }

                
                if (winners.length > 0) {
                    const mentions = winners.map(id => `<@${id}>`).join(", ");

                    
                    if (giveaway.winnerRole) {
                        const roleCheck = await this.canAssignRole(guild, giveaway.winnerRole);
                        if (!roleCheck.canAssign) {
                            await channel.send(`⚠️ Could not assign winner role: ${roleCheck.reason}`);
                        } else {
                            for (const winnerId of winners) {
                                try {
                                    const member = await guild.members.fetch(winnerId);
                                    await member.roles.add(giveaway.winnerRole);
                                } catch (e: any) {
                                    if (e.code === 50013) {
                                        console.error(`Failed to give winner role to ${winnerId}: Role hierarchy issue`);
                                    } else {
                                        console.error(`Failed to give winner role to ${winnerId}`, e);
                                    }
                                }
                            }
                        }
                    }

                    
                    const row = new ActionRowBuilder<ButtonBuilder>()
                        .addComponents(
                            new ButtonBuilder()
                                .setLabel('Giveaway Link')
                                .setStyle(ButtonStyle.Link)
                                .setURL(`https://discord.com/channels/${giveaway.guildId}/${giveaway.channelId}/${giveaway.messageId}`)
                        );

                    await channel.send({
                        content: `Congrats, ${mentions} you have won **${giveaway.prize}**\nhosted by <@${giveaway.hostId}>`,
                        components: [row]
                    });
                } else {
                    await channel.send(`No valid participants for the giveaway: **${giveaway.prize}**`);
                }
            } catch (error) {
                console.error("Error announcing giveaway:", error);
            }
        }
    }

    async rerollGiveaway(messageId: string): Promise<string[]> {
        const giveaway = await prisma.giveaway.findUnique({ where: { messageId } });
        if (!giveaway || !giveaway.ended) throw new Error("Giveaway not found or not ended");

        const participants = await prisma.participant.findMany({
            where: { giveawayId: giveaway.id },
            select: { userId: true }
        });

        const winner = this.selectWinners(participants.map((p: { userId: string }) => p.userId), 1);

        if (winner.length > 0) {
            const channel = this.client.channels.cache.get(giveaway.channelId) as TextChannel;
            if (channel) {
                await channel.send(`🎉 New winner: <@${winner[0]}>! You won **${giveaway.prize}**!`);
            }
        }
        return winner;
    }

    async cancelGiveaway(messageId: string): Promise<void> {
        const giveaway = await prisma.giveaway.findUnique({ where: { messageId } });
        if (!giveaway || giveaway.ended) return;

        await prisma.giveaway.update({
            where: { id: giveaway.id },
            data: { ended: true }
        });

        const channel = this.client.channels.cache.get(giveaway.channelId) as TextChannel;
        if (channel) {
            try {
                const embed = giveawayCancelledEmbed(giveaway);
                const message = await channel.messages.fetch(giveaway.messageId);
                await message.edit({ embeds: [embed] });
            } catch (error) {
                console.error("Error cancelling giveaway:", error);
            }
        }
    }

    private selectWinners(participants: string[], count: number): string[] {
        if (participants.length === 0) return [];
        const shuffled = participants.sort(() => 0.5 - Math.random());
        return shuffled.slice(0, count);
    }

    async deleteGiveaway(messageId: string): Promise<void> {
        const giveaway = await prisma.giveaway.findUnique({ where: { messageId } });
        if (!giveaway) throw new Error("Giveaway not found");

        
        await prisma.participant.deleteMany({ where: { giveawayId: giveaway.id } });
        await prisma.winner.deleteMany({ where: { giveawayId: giveaway.id } });

        await prisma.giveaway.delete({ where: { id: giveaway.id } });

        const channel = this.client.channels.cache.get(giveaway.channelId) as TextChannel;
        if (channel) {
            try {
                const message = await channel.messages.fetch(giveaway.messageId);
                await message.delete();
            } catch (error) {
                
            }
        }
    }
    async deleteScheduledGiveaway(id: number): Promise<void> {
        const scheduled = await prisma.scheduledGiveaway.findUnique({ where: { id } });
        if (!scheduled) throw new Error("Scheduled giveaway not found");

        await prisma.scheduledGiveaway.delete({ where: { id } });
    }
}
