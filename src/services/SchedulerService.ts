import { Client, TextChannel } from 'discord.js';
import { PrismaClient } from '@prisma/client';
import { GiveawayService } from './GiveawayService';
import { getNowUTC, hasEnded, toBigInt } from '../utils/timeUtils';

const prisma = new PrismaClient();


const preCalculatedGiveaways: Set<string> = new Set();

export class SchedulerService {
    private client: Client;
    private giveawayService: GiveawayService;
    private interval: NodeJS.Timeout | null = null;
    private activeGiveawayTimers: Map<string, NodeJS.Timeout> = new Map();

    constructor(client: Client) {
        this.client = client;
        this.giveawayService = new GiveawayService(client);
    }

    public start() {
        
        this.interval = setInterval(() => {
            this.checkScheduledGiveaways();
            this.checkActiveGiveaways();
            this.preCalculateUpcomingGiveaways();
        }, 1000);
        console.log("Scheduler service started with 1-second intervals for precise timing.");
        
        
        this.recoverActiveGiveaways();
        this.checkScheduledGiveaways();
        this.checkActiveGiveaways();
    }

    public stop() {
        if (this.interval) clearInterval(this.interval);
        
        this.activeGiveawayTimers.forEach(timer => clearTimeout(timer));
        this.activeGiveawayTimers.clear();
    }

    /**
     * Pre-calculate winners for giveaways ending in the next 15 seconds
     * Only for giveaways with high participant counts (10+)
     */
    private async preCalculateUpcomingGiveaways() {
        try {
            const nowUTC = toBigInt(getNowUTC());
            const fifteenSecondsLater = nowUTC + BigInt(15000);

            
            const upcomingGiveaways = await prisma.giveaway.findMany({
                where: {
                    ended: false,
                    endTime: {
                        gt: nowUTC,
                        lte: fifteenSecondsLater
                    }
                }
            });

            for (const giveaway of upcomingGiveaways) {
                
                if (preCalculatedGiveaways.has(giveaway.messageId)) {
                    continue;
                }

                
                const participantCount = await prisma.participant.count({
                    where: { giveawayId: giveaway.id }
                });

                if (participantCount >= 10) {
                    console.log(`[Scheduler] Pre-calculating winners for giveaway ${giveaway.messageId} (${participantCount} participants)`);
                    await this.giveawayService.preCalculateWinners(giveaway.messageId);
                    preCalculatedGiveaways.add(giveaway.messageId);
                }
            }
        } catch (error) {
            console.error('[Scheduler] Error pre-calculating winners:', error);
        }
    }

    /**
     * Recover active giveaways on bot restart
     * Updates embeds and ensures all active giveaways are being monitored
     */
    private async recoverActiveGiveaways() {
        try {
            console.log('[Scheduler] Recovering active giveaways...');
            
            const activeGiveaways = await prisma.giveaway.findMany({
                where: {
                    ended: false
                }
            });

            console.log(`[Scheduler] Found ${activeGiveaways.length} active giveaways to recover`);

            for (const giveaway of activeGiveaways) {
                try {
                    const channel = await this.client.channels.fetch(giveaway.channelId).catch(() => null) as TextChannel | null;
                    if (!channel) {
                        console.log(`[Scheduler] Channel ${giveaway.channelId} not found for giveaway ${giveaway.messageId}`);
                        continue;
                    }

                    
                    const message = await channel.messages.fetch(giveaway.messageId).catch(() => null);
                    if (!message) {
                        console.log(`[Scheduler] Message ${giveaway.messageId} not found, marking giveaway as ended`);
                        await prisma.giveaway.update({
                            where: { id: giveaway.id },
                            data: { ended: true }
                        });
                        continue;
                    }

                    
                    const participantCount = await prisma.participant.count({
                        where: { giveawayId: giveaway.id }
                    });

                    
                    const { createGiveawayEmbed } = await import('../utils/embeds');
                    const embed = createGiveawayEmbed(giveaway, participantCount);
                    await message.edit({ embeds: [embed] }).catch(e => 
                        console.log(`[Scheduler] Failed to update embed for ${giveaway.messageId}:`, e.message)
                    );

                    console.log(`[Scheduler] Recovered giveaway ${giveaway.messageId} with ${participantCount} participants`);

                } catch (error) {
                    console.error(`[Scheduler] Error recovering giveaway ${giveaway.messageId}:`, error);
                }
            }

            console.log('[Scheduler] Active giveaway recovery complete');
        } catch (error) {
            console.error('[Scheduler] Error in recoverActiveGiveaways:', error);
        }
    }

    /**
     * Check for active giveaways that need to end
     * Uses precise UTC timing
     */
    private async checkActiveGiveaways() {
        try {
            const nowUTC = toBigInt(getNowUTC());

            
            const endedGiveaways = await prisma.giveaway.findMany({
                where: {
                    ended: false,
                    endTime: {
                        lte: nowUTC
                    }
                }
            });

            for (const giveaway of endedGiveaways) {
                
                if (this.activeGiveawayTimers.has(giveaway.messageId)) {
                    continue;
                }

                console.log(`[Scheduler] Giveaway ${giveaway.messageId} has ended. Ending now...`);
                
                try {
                    await this.giveawayService.endGiveaway(giveaway.messageId);
                    console.log(`[Scheduler] Successfully ended giveaway ${giveaway.messageId}`);
                } catch (error) {
                    console.error(`[Scheduler] Failed to end giveaway ${giveaway.messageId}:`, error);
                }
            }
        } catch (error) {
            console.error('[Scheduler] Error checking active giveaways:', error);
        }
    }

    private async checkScheduledGiveaways() {
        try {
            const now = BigInt(Date.now());

            
            const dueGiveaways = await prisma.scheduledGiveaway.findMany({
                where: {
                    startTime: {
                        lte: now
                    }
                }
            });

            for (const scheduled of dueGiveaways) {
                try {
                    console.log(`[Scheduler] Processing scheduled giveaway ID: ${scheduled.id}`);
                    const payload = JSON.parse(scheduled.payload);

                    let channel: TextChannel | null = null;
                    try {
                        channel = await this.client.channels.fetch(scheduled.channelId) as TextChannel;
                    } catch (e) {
                        console.error(`[Scheduler] Failed to fetch channel ${scheduled.channelId}:`, e);
                    }

                    if (channel) {
                        
                        if (payload.birthdayUser) {
                            try {
                                const config = await prisma.birthdayConfig.findUnique({
                                    where: { guildId: scheduled.guildId }
                                });

                                if (config) {
                                    const guild = await this.client.guilds.fetch(scheduled.guildId).catch(() => null);
                                    if (guild) {
                                        const member = await guild.members.fetch(payload.birthdayUser).catch(() => null);
                                        if (member) {
                                            
                                            if (config.birthdayRole) {
                                                const role = await guild.roles.fetch(config.birthdayRole).catch(() => null);
                                                if (role) {
                                                    const botMember = guild.members.me;
                                                    if (botMember && role.position < botMember.roles.highest.position) {
                                                        await member.roles.add(config.birthdayRole).catch(e => console.error("[Scheduler] Failed to add bday role", e));
                                                    } else {
                                                        console.warn(`[Scheduler] Cannot assign birthday role: Role ${role.name} is above or equal to bot's highest role`);
                                                        if (channel) {
                                                            await channel.send(`⚠️ Cannot assign birthday role **${role.name}** to ${member}: The role is above my highest role. Please move my role higher in the role list.`).catch(() => {});
                                                        }
                                                    }
                                                }
                                            }

                                            
                                            console.log(`[Scheduler] Generating birthday image for ${member.user.tag}`);
                                            const { generateBirthdayImage } = await import('../utils/imageGenerator');
                                            const attachment = await generateBirthdayImage(member.user, guild);

                                            
                                            let msgContent = "";
                                            if (config.message) {
                                                msgContent += config.message.replace(/{user}/g, `<@${member.id}>`);
                                            } else {
                                                msgContent += `Happy Birthday <@${member.id}>!`;
                                            }

                                            if (config.pingRole) {
                                                msgContent += `\n\n|| <@&${config.pingRole}> ||`;
                                            }

                                            
                                            await channel.send({ content: msgContent, files: [attachment] });
                                            console.log(`[Scheduler] Birthday wish sent to ${channel.name}`);
                                        } else {
                                            console.warn(`[Scheduler] Birthday member ${payload.birthdayUser} not found in guild.`);
                                        }
                                    }
                                } else {
                                    console.warn(`[Scheduler] No birthday config found for guild ${scheduled.guildId}. Skipping birthday message.`);
                                }
                            } catch (err) {
                                console.error(`[Scheduler] Birthday flow failed for ${scheduled.id}:`, err);
                            }
                        }
                    } else {
                        console.error(`[Scheduler] Channel ${scheduled.channelId} not found or inaccessible.`);
                        
                        
                        
                    }

                    
                    if (channel && payload.announcement) {
                        try {
                            const { EmbedBuilder } = await import('discord.js');
                            const announcementEmbed = new EmbedBuilder()
                                .setDescription(payload.announcement)
                                .setColor('#FFD700')
                                .setTimestamp();

                            if (payload.announcementMedia) {
                                announcementEmbed.setImage(payload.announcementMedia);
                            }

                            await channel.send({ embeds: [announcementEmbed] });
                            console.log(`[Scheduler] Announcement sent for scheduled giveaway ${scheduled.id}`);
                        } catch (err) {
                            console.error(`[Scheduler] Failed to send announcement for ${scheduled.id}:`, err);
                        }
                    }

                    
                    const giveawayData = {
                        channelId: scheduled.channelId,
                        guildId: scheduled.guildId,
                        hostId: scheduled.hostId,
                        prize: scheduled.prize,
                        winnersCount: scheduled.winnersCount,
                        
                        endTime: scheduled.startTime + BigInt(payload.duration),
                        createdAt: BigInt(Date.now()),
                        emoji: payload.emoji,

                        
                        roleRequirement: payload.roleRequirement,
                        inviteRequirement: payload.inviteRequirement,
                        captchaRequirement: payload.captchaRequirement,
                        winnerRole: payload.winnerRole,
                        assignRole: payload.assignRole,
                        customMessage: payload.customMessage,
                        thumbnail: payload.thumbnail
                    };

                    
                    console.log(`[Scheduler] Starting giveaway in channel ${scheduled.channelId}`);
                    await this.giveawayService.startGiveaway(giveawayData);
                    console.log(`[Scheduler] Giveaway started successfully.`);

                    
                    await prisma.scheduledGiveaway.delete({
                        where: { id: scheduled.id }
                    });

                } catch (error) {
                    console.error(`[Scheduler] Failed to start scheduled giveaway ${scheduled.id}:`, error);
                }
            }

        } catch (error) {
            console.error("[Scheduler] Error in SchedulerService loop:", error);
        }
    }
}
