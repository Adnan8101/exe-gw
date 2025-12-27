import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { PrismaClient } from '@prisma/client';
import { Theme } from '../../utils/theme';
import { Emojis } from '../../utils/emojis';

const prisma = new PrismaClient();

export default {
    data: new SlashCommandBuilder()
        .setName('lb')
        .setDescription('View server leaderboards')
        .addStringOption(option =>
            option.setName('type')
                .setDescription('Type of leaderboard')
                .setRequired(true)
                .addChoices(
                    { name: 'Messages', value: 'messages' },
                    { name: 'Invites', value: 'invites' },
                    { name: 'Voice Time', value: 'voice' }
                )),

    async execute(interaction: ChatInputCommandInteraction) {
        const type = interaction.options.getString('type', true);
        await this.run(interaction, type);
    },

    async prefixRun(message: any, args: string[]) {
        const flag = args[0]?.toLowerCase();
        
        let type: string;
        if (flag === '-m') {
            type = 'messages';
        } else if (flag === '-i') {
            type = 'invites';
        } else if (flag === '-v' || flag === '-vc') {
            type = 'voice';
        } else {
            const embed = new EmbedBuilder()
                .setDescription(`${Emojis.CROSS} **Invalid Usage**\n\`\`\`!lb -m (messages)\n!lb -i (invites)\n!lb -v (voice time)\`\`\``)
                .setColor(Theme.ErrorColor)
                .setTimestamp();
            return message.channel.send({ embeds: [embed] });
        }

        await this.run(message, type);
    },

    async run(ctx: any, type: string) {
        const guildId = ctx.guildId!;
        const isInteraction = !!ctx.options;

        try {
            if (type === 'messages') {
                
                const topUsers = await prisma.userStats.findMany({
                    where: { guildId },
                    orderBy: { messageCount: 'desc' },
                    take: 10
                });

                if (topUsers.length === 0) {
                    const embed = new EmbedBuilder()
                        .setDescription(`${Emojis.CROSS} No message statistics found for this server yet.`)
                        .setColor(Theme.ErrorColor)
                        .setTimestamp();
                    
                    if (isInteraction) {
                        return ctx.reply({ embeds: [embed], ephemeral: true });
                    }
                    return ctx.channel.send({ embeds: [embed] });
                }

                const guild = ctx.guild || await ctx.client.guilds.fetch(guildId);
                
                let description = '';
                for (let i = 0; i < topUsers.length; i++) {
                    const user = topUsers[i];
                    const rank = i + 1;
                    const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `\`${rank}.\``;
                    
                    try {
                        const member = await guild.members.fetch(user.userId);
                        description += `${medal} **__${member.user.username}__** - \`${user.messageCount}\` messages\n`;
                    } catch {
                        description += `${medal} <@${user.userId}> - \`${user.messageCount}\` messages\n`;
                    }
                }

                const embed = new EmbedBuilder()
                    .setTitle('📊 Message Leaderboard')
                    .setDescription(description)
                    .setColor(Theme.EmbedColor)
                    .setFooter({ text: `${guild.name} • Top 10 Users` })
                    .setTimestamp();

                if (guild.iconURL()) {
                    embed.setThumbnail(guild.iconURL()!);
                }

                if (isInteraction) {
                    return ctx.reply({ embeds: [embed] });
                }
                return ctx.channel.send({ embeds: [embed] });

            } else if (type === 'invites') {
                
                const inviteCounts = await prisma.inviteTracker.groupBy({
                    by: ['inviterId'],
                    where: { guildId },
                    _count: {
                        inviteeId: true
                    },
                    orderBy: {
                        _count: {
                            inviteeId: 'desc'
                        }
                    },
                    take: 10
                });

                if (inviteCounts.length === 0) {
                    const embed = new EmbedBuilder()
                        .setDescription(`${Emojis.CROSS} No invite statistics found for this server yet.`)
                        .setColor(Theme.ErrorColor)
                        .setTimestamp();
                    
                    if (isInteraction) {
                        return ctx.reply({ embeds: [embed], ephemeral: true });
                    }
                    return ctx.channel.send({ embeds: [embed] });
                }

                const guild = ctx.guild || await ctx.client.guilds.fetch(guildId);
                
                let description = '';
                for (let i = 0; i < inviteCounts.length; i++) {
                    const invite = inviteCounts[i];
                    const rank = i + 1;
                    const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `\`${rank}.\``;
                    const count = invite._count.inviteeId;
                    
                    try {
                        const member = await guild.members.fetch(invite.inviterId);
                        description += `${medal} **__${member.user.username}__** - \`${count}\` invites\n`;
                    } catch {
                        description += `${medal} <@${invite.inviterId}> - \`${count}\` invites\n`;
                    }
                }

                const embed = new EmbedBuilder()
                    .setTitle('📊 Invite Leaderboard')
                    .setDescription(description)
                    .setColor(Theme.EmbedColor)
                    .setFooter({ text: `${guild.name} • Top 10 Users` })
                    .setTimestamp();

                if (guild.iconURL()) {
                    embed.setThumbnail(guild.iconURL()!);
                }

                if (isInteraction) {
                    return ctx.reply({ embeds: [embed] });
                }
                return ctx.channel.send({ embeds: [embed] });

            } else if (type === 'voice') {
                
                const topUsers = await prisma.userStats.findMany({
                    where: { guildId },
                    orderBy: { voiceMinutes: 'desc' },
                    take: 10
                });

                if (topUsers.length === 0) {
                    const embed = new EmbedBuilder()
                        .setDescription(`${Emojis.CROSS} No voice statistics found for this server yet.`)
                        .setColor(Theme.ErrorColor)
                        .setTimestamp();
                    
                    if (isInteraction) {
                        return ctx.reply({ embeds: [embed], ephemeral: true });
                    }
                    return ctx.channel.send({ embeds: [embed] });
                }

                const guild = ctx.guild || await ctx.client.guilds.fetch(guildId);
                
                let description = '';
                for (let i = 0; i < topUsers.length; i++) {
                    const user = topUsers[i];
                    const rank = i + 1;
                    const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `\`${rank}.\``;
                    
                    
                    const hours = Math.floor(user.voiceMinutes / 60);
                    const minutes = user.voiceMinutes % 60;
                    let timeStr = '';
                    if (hours > 0) {
                        timeStr = `${hours}h ${minutes}m`;
                    } else {
                        timeStr = `${minutes}m`;
                    }
                    
                    try {
                        const member = await guild.members.fetch(user.userId);
                        description += `${medal} **__${member.user.username}__** - \`${timeStr}\`\n`;
                    } catch {
                        description += `${medal} <@${user.userId}> - \`${timeStr}\`\n`;
                    }
                }

                const embed = new EmbedBuilder()
                    .setTitle('🎙️ Voice Time Leaderboard')
                    .setDescription(description)
                    .setColor(Theme.EmbedColor)
                    .setFooter({ text: `${guild.name} • Top 10 Users` })
                    .setTimestamp();

                if (guild.iconURL()) {
                    embed.setThumbnail(guild.iconURL()!);
                }

                if (isInteraction) {
                    return ctx.reply({ embeds: [embed] });
                }
                return ctx.channel.send({ embeds: [embed] });
            }

        } catch (error) {
            console.error('Leaderboard command error:', error);
            const errorEmbed = new EmbedBuilder()
                .setDescription(`${Emojis.CROSS} An error occurred while fetching the leaderboard.`)
                .setColor(Theme.ErrorColor)
                .setTimestamp();

            if (isInteraction) {
                return ctx.reply({ embeds: [errorEmbed], ephemeral: true });
            }
            return ctx.channel.send({ embeds: [errorEmbed] });
        }
    }
};
