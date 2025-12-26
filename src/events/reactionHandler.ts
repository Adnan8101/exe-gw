import { Client, MessageReaction, User, TextChannel, EmbedBuilder, AttachmentBuilder } from 'discord.js';
import { PrismaClient } from '@prisma/client';
import { checkAllRequirements } from '../utils/requirements';
import { createGiveawayEmbed } from '../utils/embeds';

const prisma = new PrismaClient();

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
            await user.send(`❌ You cannot enter the giveaway for **${giveaway.prize}**: ${result.reason}`);
        } catch (e) { }
        return;
    }

    // CAPTCHA FLOW
    if (giveaway.captchaRequirement) {
        try {
            const { generateCaptcha } = await import('../utils/captcha');
            const { buffer, text } = await generateCaptcha();

            const dmChannel = await user.createDM();
            const attachment = new AttachmentBuilder(buffer, { name: 'captcha.png' });

            const embed = new EmbedBuilder()
                .setTitle('Security Check')
                .setDescription(`Please type the code you see in the image below to enter the giveaway for **${giveaway.prize}**.\nYou have **1 minute** to respond.`)
                .setImage('attachment://captcha.png')
                .setColor('#2F3136');

            await dmChannel.send({ embeds: [embed], files: [attachment] });

            try {
                // Wait for response
                const filter = (m: any) => m.author.id === user.id;
                const collected = await dmChannel.awaitMessages({ filter, max: 1, time: 60000, errors: ['time'] });
                const response = collected.first()?.content.toUpperCase();

                if (response !== text) {
                    await dmChannel.send('❌ Incorrect captcha code. Please try joining again.');
                    await reaction.users.remove(user.id);
                    return;
                }

                await dmChannel.send('✅ Captcha verified! You have been entered into the giveaway.');

            } catch (timeout) {
                await dmChannel.send('❌ Captcha timed out. Please try joining again.');
                await reaction.users.remove(user.id);
                return;
            }

        } catch (e) {
            console.error("Error sending captcha:", e);
            // If DM fails (closed DMs), we fail the entry
            await reaction.users.remove(user.id);
            return; // Or try to notify in channel? No, to avoid spam.
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

        // Assign Role
        if (giveaway.assignRole) {
            const guild = client.guilds.cache.get(giveaway.guildId);
            if (guild) {
                try {
                    const member = await guild.members.fetch(user.id);
                    await member.roles.add(giveaway.assignRole);
                } catch (e) {
                    console.error(`Failed to assign role to ${user.id}`, e);
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

    // Remove Assigned Role
    if (giveaway.assignRole) {
        const guild = client.guilds.cache.get(giveaway.guildId);
        if (guild) {
            try {
                const member = await guild.members.fetch(user.id);
                await member.roles.remove(giveaway.assignRole);
            } catch (e) {
                console.error(`Failed to remove role from ${user.id}`, e);
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
