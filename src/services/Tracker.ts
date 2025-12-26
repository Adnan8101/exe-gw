import { Client, Message, VoiceState } from 'discord.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

class Tracker {
    private voiceSessions: Map<string, number> = new Map();
    private messageCounts: Map<string, Map<string, number>> = new Map(); // guildId -> userId -> count

    constructor() {
        // Start flusher
        setInterval(() => this.flushMessageCounts(), 5 * 60 * 1000);
    }

    public async onMessageCreate(message: Message) {
        if (message.author.bot || !message.guildId) return;

        const guildId = message.guildId;
        const userId = message.author.id;

        if (!this.messageCounts.has(guildId)) {
            this.messageCounts.set(guildId, new Map());
        }

        const guildCounts = this.messageCounts.get(guildId)!;
        guildCounts.set(userId, (guildCounts.get(userId) || 0) + 1);
    }

    public async onVoiceStateUpdate(oldState: VoiceState, newState: VoiceState) {
        const userId = newState.member?.id;
        if (!userId) return;
        const guildId = newState.guild.id;

        const now = Date.now();
        const isInVoice = newState.channelId !== null;
        const wasInVoice = oldState.channelId !== null;

        // Check if previously in voice, calculate duration
        if (this.voiceSessions.has(userId)) {
            const joinTime = this.voiceSessions.get(userId)!;
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
        } else {
            // Left voice
            this.voiceSessions.delete(userId);
        }
    }

    private async addVoiceMinutes(guildId: string, userId: string, minutes: number) {
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
        } catch (error) {
            console.error(`Error adding voice minutes for ${userId}:`, error);
        }
    }

    private async flushMessageCounts() {
        for (const [guildId, userCounts] of this.messageCounts.entries()) {
            for (const [userId, count] of userCounts.entries()) {
                if (count === 0) continue;

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
                } catch (error) {
                    console.error(`Error flushing message count for ${userId}:`, error);
                }
            }
            userCounts.clear();
        }
    }
}

export const tracker = new Tracker();
