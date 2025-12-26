"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GiveawayService = void 0;
const discord_js_1 = require("discord.js");
const client_1 = require("@prisma/client");
const embeds_1 = require("../utils/embeds");
const prisma = new client_1.PrismaClient();
class GiveawayService {
    client;
    constructor(client) {
        this.client = client;
    }
    async startGiveaway(giveawayData) {
        const channel = this.client.channels.cache.get(giveawayData.channelId);
        if (!channel)
            throw new Error("Channel not found");
        const gForEmbed = { ...giveawayData, messageId: "", id: 0 };
        const embed = (0, embeds_1.createGiveawayEmbed)(gForEmbed, 0);
        const message = await channel.send({ embeds: [embed] });
        await message.react(giveawayData.emoji || "🎉");
        await prisma.giveaway.create({
            data: {
                ...giveawayData,
                messageId: message.id
            }
        });
    }
    async endGiveaway(messageId) {
        const giveaway = await prisma.giveaway.findUnique({ where: { messageId } });
        if (!giveaway || giveaway.ended)
            return;
        // Mark ended
        await prisma.giveaway.update({
            where: { id: giveaway.id },
            data: { ended: true }
        });
        const participants = await prisma.participant.findMany({
            where: { giveawayId: giveaway.id },
            select: { userId: true }
        });
        const winners = this.selectWinners(participants.map((p) => p.userId), giveaway.winnersCount);
        // Save winners
        for (const winnerId of winners) {
            await prisma.winner.create({
                data: {
                    giveawayId: giveaway.id,
                    userId: winnerId,
                    wonAt: BigInt(Date.now())
                }
            });
        }
        // Announce
        const channel = this.client.channels.cache.get(giveaway.channelId);
        const guild = this.client.guilds.cache.get(giveaway.guildId);
        if (channel && guild) {
            try {
                // Update Embed
                const embed = (0, embeds_1.giveawayEndedEmbed)(giveaway, winners);
                let giveawayMessage;
                try {
                    giveawayMessage = await channel.messages.fetch(giveaway.messageId);
                    await giveawayMessage.edit({ embeds: [embed] });
                }
                catch (e) { }
                // Assign Roles & Announce
                if (winners.length > 0) {
                    const mentions = winners.map(id => `<@${id}>`).join(", ");
                    // Assign Winner Role
                    if (giveaway.winnerRole) {
                        for (const winnerId of winners) {
                            try {
                                const member = await guild.members.fetch(winnerId);
                                await member.roles.add(giveaway.winnerRole);
                            }
                            catch (e) {
                                console.error(`Failed to give winner role to ${winnerId}`, e);
                            }
                        }
                    }
                    // Button
                    const row = new discord_js_1.ActionRowBuilder()
                        .addComponents(new discord_js_1.ButtonBuilder()
                        .setLabel('Giveaway Link')
                        .setStyle(discord_js_1.ButtonStyle.Link)
                        .setURL(`https://discord.com/channels/${giveaway.guildId}/${giveaway.channelId}/${giveaway.messageId}`));
                    await channel.send({
                        content: `Congrats, ${mentions} you have won **${giveaway.prize}**\nhosted by <@${giveaway.hostId}>`,
                        components: [row]
                    });
                }
                else {
                    await channel.send(`No valid participants for the giveaway: **${giveaway.prize}**`);
                }
            }
            catch (error) {
                console.error("Error announcing giveaway:", error);
            }
        }
    }
    async rerollGiveaway(messageId) {
        const giveaway = await prisma.giveaway.findUnique({ where: { messageId } });
        if (!giveaway || !giveaway.ended)
            throw new Error("Giveaway not found or not ended");
        const participants = await prisma.participant.findMany({
            where: { giveawayId: giveaway.id },
            select: { userId: true }
        });
        const winner = this.selectWinners(participants.map((p) => p.userId), 1);
        if (winner.length > 0) {
            const channel = this.client.channels.cache.get(giveaway.channelId);
            if (channel) {
                await channel.send(`🎉 New winner: <@${winner[0]}>! You won **${giveaway.prize}**!`);
            }
        }
        return winner;
    }
    async cancelGiveaway(messageId) {
        const giveaway = await prisma.giveaway.findUnique({ where: { messageId } });
        if (!giveaway || giveaway.ended)
            return;
        await prisma.giveaway.update({
            where: { id: giveaway.id },
            data: { ended: true }
        });
        const channel = this.client.channels.cache.get(giveaway.channelId);
        if (channel) {
            try {
                const embed = (0, embeds_1.giveawayCancelledEmbed)(giveaway);
                const message = await channel.messages.fetch(giveaway.messageId);
                await message.edit({ embeds: [embed] });
            }
            catch (error) {
                console.error("Error cancelling giveaway:", error);
            }
        }
    }
    selectWinners(participants, count) {
        if (participants.length === 0)
            return [];
        const shuffled = participants.sort(() => 0.5 - Math.random());
        return shuffled.slice(0, count);
    }
    async deleteGiveaway(messageId) {
        const giveaway = await prisma.giveaway.findUnique({ where: { messageId } });
        if (!giveaway)
            throw new Error("Giveaway not found");
        // Delete related data first (cascade should handle this if configured, but explicit is safe for now)
        await prisma.participant.deleteMany({ where: { giveawayId: giveaway.id } });
        await prisma.winner.deleteMany({ where: { giveawayId: giveaway.id } });
        await prisma.giveaway.delete({ where: { id: giveaway.id } });
        const channel = this.client.channels.cache.get(giveaway.channelId);
        if (channel) {
            try {
                const message = await channel.messages.fetch(giveaway.messageId);
                await message.delete();
            }
            catch (error) {
                // Message might already be gone
            }
        }
    }
    async deleteScheduledGiveaway(id) {
        const scheduled = await prisma.scheduledGiveaway.findUnique({ where: { id } });
        if (!scheduled)
            throw new Error("Scheduled giveaway not found");
        await prisma.scheduledGiveaway.delete({ where: { id } });
    }
}
exports.GiveawayService = GiveawayService;
