import { Message, EmbedBuilder } from 'discord.js';
import { Theme } from '../../utils/theme';
import { Emojis } from '../../utils/emojis';
import { hasModPermission } from '../../utils/moderationUtils';
import { prisma } from '../../utils/database';



export default {
 data: {
 name: 'modlogs',
 description: 'View all moderation logs for a user',
 syntax: '!modlogs <user>',
 category: 'moderation'
},

 async prefixRun(message: Message, args: string[]) {
 if (!message.guild || !message.member) return;

 if (!hasModPermission(message.member)) {
 return message.reply({ embeds: [new EmbedBuilder()
 .setColor(Theme.ErrorColor)
 .setDescription(`${Emojis.CROSS} You need **Moderate Members** permission to use this command`)
 ]});
 }

 const targetMember = message.mentions.members?.first() || 
 await message.guild.members.fetch(args[0]).catch(() => null);

 if (!targetMember) {
 return message.reply({ embeds: [new EmbedBuilder()
 .setColor(Theme.ErrorColor)
 .setDescription(' Please mention a valid member.')
 ]});
 }

 const cases = await prisma.moderationCase.findMany({
 where: {
 guildId: message.guild.id,
 targetId: targetMember.id
 },
 orderBy: { createdAt: 'desc' },
 take: 20
 });

 if (cases.length === 0) {
 return message.reply({ embeds: [new EmbedBuilder()
 .setColor(Theme.SuccessColor)
 .setDescription(` ${targetMember.user.tag} has no moderation history`)
 ]});
 }

 const actionEmojis: { [key: string]: string } = {
 kick: '',
 ban: '',
 softban: '',
 tempban: '',
 timeout: '',
 warn: '',
 unban: '',
 untimeout: ''
 };

 const embed = new EmbedBuilder()
 .setColor(Theme.EmbedColor)
 .setTitle(` Moderation Logs for ${targetMember.user.tag}`)
 .setDescription(`Total Cases: **${cases.length}**`)
 .setThumbnail(targetMember.user.displayAvatarURL())
 .setTimestamp();

 for (const modCase of cases.slice(0, 10)) {
 const emoji = actionEmojis[modCase.action] || '🔧';
 const date = new Date(modCase.createdAt).toLocaleDateString();
 const time = new Date(modCase.createdAt).toLocaleTimeString();
 
 let fieldValue = `**Action:** ${emoji} ${modCase.action.toUpperCase()}`;
 fieldValue += `\n**Moderator:** <@${modCase.moderatorId}>`;
 fieldValue += `\n**Reason:** ${modCase.reason}`;
 fieldValue += `\n**Date:** ${date} at ${time}`;
 
 if (modCase.duration) {
 const duration = Number(modCase.duration);
 const hours = Math.floor(duration / 3600000);
 const days = Math.floor(hours / 24);
 fieldValue += `\n**Duration:** ${days > 0 ? `${days}d ${hours % 24}h` : `${hours}h`}`;
 }
 
 if (modCase.silent) {
 fieldValue += `\n**Silent:** Yes`;
 }

 embed.addFields({
 name: `Case ${modCase.caseId}`,
 value: fieldValue,
 inline: false
 });
 }

 if (cases.length > 10) {
 embed.setFooter({ text: `Showing 10 of ${cases.length} cases` });
 }

 await message.reply({ embeds: [embed] });
}

};