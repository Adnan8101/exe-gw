import { Client, MessageReaction, User, TextChannel, EmbedBuilder, AttachmentBuilder } from 'discord.js';
import { PrismaClient } from '@prisma/client';
import { checkAllRequirements } from '../utils/requirements';
import { createGiveawayEmbed } from '../utils/embeds';
import { Theme } from '../utils/theme';
import { Emojis } from '../utils/emojis';

const prisma = new PrismaClient();

/**
 * Check if a role can be assigned by the bot (role hierarchy check)
 */
async function canAssignRole(guild: any, roleId: string): Promise<{ canAssign: boolean; reason?: string }> {
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
            return { canAssign: false, reason: `The role **${role.name}** is above or equal to my highest role` };
        }

        if (!botMember.permissions.has('ManageRoles')) {
            return { canAssign: false, reason: 'I don\'t have the Manage Roles permission' };
        }

        return { canAssign: true };
    } catch (e) {
        return { canAssign: false, reason: 'Failed to check role permissions' };
    }
}

export async function handleReactionAdd(reaction: MessageReaction, user: User, client: Client) {
    if (user.bot) return;
    if (reaction.partial) await reaction.fetch();

    const messageId = reaction.message.id;
    const giveaway = await prisma.giveaway.findUnique({ where: { messageId } });

    if (!giveaway || giveaway.ended) return;
    if (reaction.emoji.name !== giveaway.emoji && reaction.emoji.toString() !== giveaway.emoji) return;

    // Check if participant
    const existing = await prisma.participant.findFirst({
        where: { giveawayId: giveaway.id, userId: user.id }
    });

    if (existing) return;

    // Check requirements (including stats checks which we already have in checkAllRequirements)
    const result = await checkAllRequirements(client, reaction.message.guildId!, user.id, giveaway);
    if (!result.passed) {
        await reaction.users.remove(user.id);
        try {
            const errorEmbed = new EmbedBuilder()
                .setTitle(`${Emojis.CROSS} Entry Denied`)
                .setDescription(`You cannot enter the giveaway for **${giveaway.prize}**\n\n**Reason:** ${result.reason}`)
                .setColor(Theme.ErrorColor)
                .setTimestamp();
            await user.send({ embeds: [errorEmbed] });
        } catch (e) { }
        return;
    }

    // CAPTCHA FLOW - Allow reaction first, then verify
    if (giveaway.captchaRequirement) {
        try {
            const { generateCaptcha } = await import('../utils/captcha');
            const { buffer, text } = await generateCaptcha();

            const dmChannel = await user.createDM();
            const attachment = new AttachmentBuilder(buffer, { name: 'captcha.png' });

            const captchaEmbed = new EmbedBuilder()
                .setTitle('🔐 Security Verification')
                .setDescription([
                    `To enter the giveaway for **${giveaway.prize}**, please solve this captcha.`,
                    '',
                    '**Instructions:**',
                    '• Type the code shown in the image below',
                    '• The code is case-insensitive',
                    '• You have **1 minute** to respond',
                    '',
                    '⏰ *If you don\'t respond in time, your reaction will be removed.*'
                ].join('\n'))
                .setImage('attachment://captcha.png')
                .setColor(Theme.EmbedColor)
                .setFooter({ text: 'Giveaway Security Check' })
                .setTimestamp();

            await dmChannel.send({ embeds: [captchaEmbed], files: [attachment] });

            try {
                // Wait for response
                const filter = (m: any) => m.author.id === user.id;
                const collected = await dmChannel.awaitMessages({ filter, max: 1, time: 60000, errors: ['time'] });
                const response = collected.first()?.content.toUpperCase().trim();

                if (response !== text) {
                    const failEmbed = new EmbedBuilder()
                        .setTitle(`${Emojis.CROSS} Incorrect Captcha`)
                        .setDescription([
                            '**Your answer was incorrect.**',
                            '',
                            'Your reaction has been removed from the giveaway.',
                            'You can try again by reacting to the giveaway message.'
                        ].join('\n'))
                        .setColor(Theme.ErrorColor)
                        .setTimestamp();
                    await dmChannel.send({ embeds: [failEmbed] });
                    await reaction.users.remove(user.id);
                    return;
                }

                const successEmbed = new EmbedBuilder()
                    .setTitle(`${Emojis.TICK} Captcha Verified!`)
                    .setDescription([
                        '**You have been successfully entered into the giveaway!**',
                        '',
                        `**Prize:** ${giveaway.prize}`,
                        '',
                        '🎉 Good luck!'
                    ].join('\n'))
                    .setColor(Theme.SuccessColor)
                    .setTimestamp();
                await dmChannel.send({ embeds: [successEmbed] });

            } catch (timeout) {
                const timeoutEmbed = new EmbedBuilder()
                    .setTitle(`${Emojis.CROSS} Captcha Timed Out`)
                    .setDescription([
                        '**You did not respond in time.**',
                        '',
                        'Your reaction has been removed from the giveaway.',
                        'You can try again by reacting to the giveaway message.'
                    ].join('\n'))
                    .setColor(Theme.ErrorColor)
                    .setTimestamp();
                await dmChannel.send({ embeds: [timeoutEmbed] });
                await reaction.users.remove(user.id);
                return;
            }

        } catch (e: any) {
            console.error("Error sending captcha:", e);
            // If DM fails (closed DMs), we fail the entry
            await reaction.users.remove(user.id);
            
            // Try to notify in channel briefly
            try {
                const channel = reaction.message.channel as TextChannel;
                const msg = await channel.send(`<@${user.id}> Your DMs are closed. Please enable DMs to enter this giveaway (captcha required).`);
                setTimeout(() => msg.delete().catch(() => {}), 10000); // Delete after 10 seconds
            } catch (channelError) { }
            return;
        }
    }

    // Add participant
    try {
        await prisma.participant.create({
            data: {
                giveawayId: giveaway.id,
                userId: user.id,
                joinedAt: BigInt(Date.now())
            }
        });

        // Assign Role with hierarchy check
        if (giveaway.assignRole) {
            const guild = client.guilds.cache.get(giveaway.guildId);
            if (guild) {
                const roleCheck = await canAssignRole(guild, giveaway.assignRole);
                if (!roleCheck.canAssign) {
                    console.error(`Cannot assign entry role: ${roleCheck.reason}`);
                    // Notify in channel once
                    try {
                        const channel = client.channels.cache.get(giveaway.channelId) as TextChannel;
                        const existingWarning = await channel.messages.fetch({ limit: 10 });
                        const hasWarning = existingWarning.some(m => 
                            m.author.id === client.user?.id && 
                            m.content.includes('entry role') && 
                            m.content.includes('above my role')
                        );
                        if (!hasWarning) {
                            await channel.send(`⚠️ Cannot assign entry role: ${roleCheck.reason}. Please move my role higher in the role list.`);
                        }
                    } catch (e) { }
                } else {
                    try {
                        const member = await guild.members.fetch(user.id);
                        await member.roles.add(giveaway.assignRole);
                    } catch (e: any) {
                        if (e.code === 50013) {
                            console.error(`Failed to assign role to ${user.id}: Missing permissions or role hierarchy issue`);
                        } else {
                            console.error(`Failed to assign role to ${user.id}`, e);
                        }
                    }
                }
            }
        }
    } catch (e) {
        // Unique constraint violation if double-joined rapidly
        return;
    }

    // Update Embed
    updateGiveawayMessage(client, giveaway);
}

export async function handleReactionRemove(reaction: MessageReaction, user: User, client: Client) {
    if (user.bot) return;
    if (reaction.partial) await reaction.fetch();

    const messageId = reaction.message.id;
    const giveaway = await prisma.giveaway.findUnique({ where: { messageId } });

    if (!giveaway || giveaway.ended) return;

    // Check if participant
    const participant = await prisma.participant.findFirst({
        where: { giveawayId: giveaway.id, userId: user.id }
    });

    if (!participant) return;

    // Remove participant
    await prisma.participant.delete({
        where: { id: participant.id }
    });

    // Remove Assigned Role with hierarchy check
    if (giveaway.assignRole) {
        const guild = client.guilds.cache.get(giveaway.guildId);
        if (guild) {
            const roleCheck = await canAssignRole(guild, giveaway.assignRole);
            if (roleCheck.canAssign) {
                try {
                    const member = await guild.members.fetch(user.id);
                    await member.roles.remove(giveaway.assignRole);
                } catch (e: any) {
                    if (e.code === 50013) {
                        console.error(`Failed to remove role from ${user.id}: Missing permissions or role hierarchy issue`);
                    } else {
                        console.error(`Failed to remove role from ${user.id}`, e);
                    }
                }
            }
        }
    }

    updateGiveawayMessage(client, giveaway);
}

async function updateGiveawayMessage(client: Client, giveaway: any) {
    const count = await prisma.participant.count({ where: { giveawayId: giveaway.id } });
    const channel = client.channels.cache.get(giveaway.channelId) as TextChannel;
    if (channel) {
        try {
            const message = await channel.messages.fetch(giveaway.messageId);
            const embed = createGiveawayEmbed(giveaway, count);
            await message.edit({ embeds: [embed] });
        } catch (e) {
            console.error("Failed to update giveaway message", e);
        }
    }
}
