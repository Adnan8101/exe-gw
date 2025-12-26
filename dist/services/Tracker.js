"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tracker = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
class Tracker {
    voiceSessions = new Map();
    messageCounts = new Map(); // guildId -> userId -> count
    constructor() {
        // Start flusher
        setInterval(() => this.flushMessageCounts(), 5 * 60 * 1000);
    }
    async onMessageCreate(message) {
        if (message.author.bot || !message.guildId)
            return;
        const guildId = message.guildId;
        const userId = message.author.id;
        if (!this.messageCounts.has(guildId)) {
            this.messageCounts.set(guildId, new Map());
        }
        const guildCounts = this.messageCounts.get(guildId);
        guildCounts.set(userId, (guildCounts.get(userId) || 0) + 1);
    }
    async onVoiceStateUpdate(oldState, newState) {
        const userId = newState.member?.id;
        if (!userId)
            return;
        const guildId = newState.guild.id;
        const now = Date.now();
        const isInVoice = newState.channelId !== null;
        const wasInVoice = oldState.channelId !== null;
        // Check if previously in voice, calculate duration
        if (this.voiceSessions.has(userId)) {
            const joinTime = this.voiceSessions.get(userId);
            const durationMs = now - joinTime;
            const minutes = Math.floor(durationMs / 1000 / 60);
            if (minutes > 0) {
                await this.addVoiceMinutes(guildId, userId, minutes);
                // Reset timestamp if still in voice (switching channels)
                // or delete if left
            }
        }
        if (isInVoice) {
            // Started or switched channel, reset timer
            this.voiceSessions.set(userId, now);
        }
        else {
            // Left voice
            this.voiceSessions.delete(userId);
        }
    }
    async addVoiceMinutes(guildId, userId, minutes) {
        try {
            await prisma.userStats.upsert({
                where: {
                    guildId_userId: {
                        guildId: guildId,
                        userId: userId
                    }
                },
                update: {
                    voiceMinutes: { increment: minutes }
                },
                create: {
                    guildId: guildId,
                    userId: userId,
                    voiceMinutes: minutes,
                    messageCount: 0
                }
            });
        }
        catch (error) {
            console.error(`Error adding voice minutes for ${userId}:`, error);
        }
    }
    async flushMessageCounts() {
        for (const [guildId, userCounts] of this.messageCounts.entries()) {
            for (const [userId, count] of userCounts.entries()) {
                if (count === 0)
                    continue;
                try {
                    await prisma.userStats.upsert({
                        where: {
                            guildId_userId: {
                                guildId: guildId,
                                userId: userId
                            }
                        },
                        update: {
                            messageCount: { increment: count }
                        },
                        create: {
                            guildId: guildId,
                            userId: userId,
                            messageCount: count,
                            voiceMinutes: 0
                        }
                    });
                }
                catch (error) {
                    console.error(`Error flushing message count for ${userId}:`, error);
                }
            }
            userCounts.clear();
        }
    }
}
exports.tracker = new Tracker();
