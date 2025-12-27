import { prisma } from '../utils/database';

import { Client, Message, VoiceState } from 'discord.js';


class Tracker {
    private voiceSessions: Map<string, { guildId: string, joinTime: number }> = new Map();
    private messageCounts: Map<string, Map<string, number>> = new Map(); 
    private blacklistCache: Map<string, Set<string>> = new Map(); 

    constructor() {
        
        setInterval(() => this.flushMessageCounts(), 10 * 1000);
        
        setInterval(() => this.flushVoiceMinutes(), 30 * 1000);
        
        setInterval(() => this.refreshBlacklistCache(), 5 * 60 * 1000);
        this.refreshBlacklistCache();
    }

    private async refreshBlacklistCache() {
        try {
            const blacklists = await (prisma as any).blacklistChannel?.findMany();
            if (blacklists) {
                this.blacklistCache.clear();
                for (const bl of blacklists) {
                    const key = `${bl.guildId}_${bl.type}`;
                    if (!this.blacklistCache.has(key)) {
                        this.blacklistCache.set(key, new Set());
                    }
                    this.blacklistCache.get(key)!.add(bl.channelId);
                }
            }
        } catch (error) {
            
        }
    }

    
    public async forceRefreshBlacklist() {
        await this.refreshBlacklistCache();
    }

    private isChannelBlacklisted(guildId: string, channelId: string, type: 'message' | 'voice'): boolean {
        const key = `${guildId}_${type}`;
        return this.blacklistCache.get(key)?.has(channelId) || false;
    }

    public async onMessageCreate(message: Message) {
        if (message.author.bot || !message.guildId || !message.channelId) return;

        
        if (this.isChannelBlacklisted(message.guildId, message.channelId, 'message')) {
            return;
        }

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
        if (!userId || newState.member?.user.bot) return;
        const guildId = newState.guild.id;

        const now = Date.now();
        const isInVoice = newState.channelId !== null && !this.isChannelBlacklisted(guildId, newState.channelId, 'voice');
        const wasInVoice = oldState.channelId !== null;

        const sessionKey = `${guildId}_${userId}`;

        
        if (this.voiceSessions.has(sessionKey)) {
            const session = this.voiceSessions.get(sessionKey)!;
            const durationMs = now - session.joinTime;
            const minutes = Math.floor(durationMs / 1000 / 60);

            if (minutes > 0) {
                await this.addVoiceMinutes(session.guildId, userId, minutes);
            }
            
            this.voiceSessions.delete(sessionKey);
        }

        
        if (isInVoice) {
            this.voiceSessions.set(sessionKey, {
                guildId: guildId,
                joinTime: now
            });
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

    
    public getPendingMessageCount(guildId: string, userId: string): number {
        return this.messageCounts.get(guildId)?.get(userId) || 0;
    }

    private async flushVoiceMinutes() {
        const now = Date.now();
        for (const [sessionKey, session] of this.voiceSessions.entries()) {
            const durationMs = now - session.joinTime;
            const minutes = Math.floor(durationMs / 1000 / 60);

            if (minutes > 0) {
                const userId = sessionKey.split('_')[1];
                await this.addVoiceMinutes(session.guildId, userId, minutes);
                
                session.joinTime = now;
            }
        }
    }
}

export const tracker = new Tracker();
