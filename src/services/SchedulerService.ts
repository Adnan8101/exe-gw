import { Client, TextChannel } from 'discord.js';
import { PrismaClient } from '@prisma/client';
import { GiveawayService } from './GiveawayService';

const prisma = new PrismaClient();

export class SchedulerService {
    private client: Client;
    private giveawayService: GiveawayService;
    private interval: NodeJS.Timeout | null = null;

    constructor(client: Client) {
        this.client = client;
        this.giveawayService = new GiveawayService(client);
    }

    public start() {
        // Check every 10 seconds for better responsiveness
        this.interval = setInterval(() => this.checkScheduledGiveaways(), 10 * 1000);
        console.log("Scheduler service started.");
        // Initial check
        this.checkScheduledGiveaways();
    }

    public stop() {
        if (this.interval) clearInterval(this.interval);
    }

    private async checkScheduledGiveaways() {
        try {
            const now = BigInt(Date.now());

            // Find giveaways that are due (startTime <= now)
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
                        // --- Birthday Feature Flow ---
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
                                            // 1. Give Birthday Role
                                            if (config.birthdayRole) {
                                                await member.roles.add(config.birthdayRole).catch(e => console.error("[Scheduler] Failed to add bday role", e));
                                            }

                                            // 2. Generate Image
                                            console.log(`[Scheduler] Generating birthday image for ${member.user.tag}`);
                                            const { generateBirthdayImage } = await import('../utils/imageGenerator');
                                            const attachment = await generateBirthdayImage(member.user, guild);

                                            // 3. Prepare Message (Custom Text + Pings at end)
                                            let msgContent = "";
                                            if (config.message) {
                                                msgContent += config.message.replace(/{user}/g, `<@${member.id}>`);
                                            } else {
                                                msgContent += `Happy Birthday <@${member.id}>!`;
                                            }

                                            if (config.pingRole) {
                                                msgContent += `\n\n|| <@&${config.pingRole}> ||`;
                                            }

                                            // 4. Send Birthday Wish
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
                        // We continue to try starting giveaway, but startGiveaway will also fail if channel missing.
                        // However, we should try cleaning up if it's permanently gone?
                        // For now, let startGiveaway handle the error.
                    }

                    // Reconstruct giveaway data
                    const giveawayData = {
                        channelId: scheduled.channelId,
                        guildId: scheduled.guildId,
                        hostId: scheduled.hostId,
                        prize: scheduled.prize,
                        winnersCount: scheduled.winnersCount,
                        // Fix for Auto-Recovery: Use scheduled startTime to calculate correct endTime
                        endTime: scheduled.startTime + BigInt(payload.duration),
                        createdAt: BigInt(Date.now()),
                        emoji: payload.emoji,

                        // Optionals
                        roleRequirement: payload.roleRequirement,
                        inviteRequirement: payload.inviteRequirement,
                        captchaRequirement: payload.captchaRequirement,
                        winnerRole: payload.winnerRole,
                        assignRole: payload.assignRole,
                        customMessage: payload.customMessage,
                        thumbnail: payload.thumbnail
                    };

                    // Start it
                    console.log(`[Scheduler] Starting giveaway in channel ${scheduled.channelId}`);
                    await this.giveawayService.startGiveaway(giveawayData);
                    console.log(`[Scheduler] Giveaway started successfully.`);

                    // Delete from schedule
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
