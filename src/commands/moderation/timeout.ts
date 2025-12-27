import { Message, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { Theme } from '../../utils/theme';
import { Emojis } from '../../utils/emojis';
import { canModerate, createModCase, createModEmbed, createDMEmbed, hasModPermission, parseDuration, formatDuration } from '../../utils/moderationUtils';



export default {
 data: {
 name: 'timeout',
 description: 'Timeout a member',
 syntax: '!timeout <user> <duration> [reason]\nDuration: 1s, 5m, 1h, 2d',
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

 if (!message.guild.members.me?.permissions.has(PermissionFlagsBits.ModerateMembers)) {
 return message.reply({ embeds: [new EmbedBuilder()
 .setColor(Theme.ErrorColor)
 .setDescription(`${Emojis.CROSS} I need **Moderate Members** permission to execute this command`)
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

 if (!canModerate(message.member, targetMember)) {
 return message.reply({ embeds: [new EmbedBuilder()
 .setColor(Theme.ErrorColor)
 .setDescription(`${Emojis.CROSS} You cannot timeout this member (higher or equal role)`)
 ]});
 }

 if (!canModerate(message.guild.members.me!, targetMember)) {
 return message.reply({ embeds: [new EmbedBuilder()
 .setColor(Theme.ErrorColor)
 .setDescription(`${Emojis.CROSS} I cannot timeout this member (higher or equal role)`)
 ]});
 }

 const durationStr = args[1];
 const duration = parseDuration(durationStr);

 if (!duration) {
 return message.reply({ embeds: [new EmbedBuilder()
 .setColor(Theme.ErrorColor)
 .setDescription(`${Emojis.CROSS} Invalid duration format. Use: 1s, 5m, 1h, 2d`)
 ]});
 }

 if (duration > 2419200000) { // Max 28 days
 return message.reply({ embeds: [new EmbedBuilder()
 .setColor(Theme.ErrorColor)
 .setDescription(`${Emojis.CROSS} Duration cannot exceed 28 days`)
 ]});
 }

 const reason = args.slice(2).join(' ') || 'No reason provided';

 const caseId = await createModCase(message.guild.id, {
 action: 'timeout',
 targetId: targetMember.id,
 targetTag: targetMember.user.tag,
 moderatorId: message.author.id,
 moderatorTag: message.author.tag,
 reason,
 duration
 });

 try {
 const dmEmbed = createDMEmbed('timeout', message.guild, reason, formatDuration(duration));
 await targetMember.send({ embeds: [dmEmbed] });
 } catch (error) {}

 try {
 await targetMember.timeout(duration, reason);
 } catch (error) {
 return message.reply({ embeds: [new EmbedBuilder()
 .setColor(Theme.ErrorColor)
 .setDescription(`${Emojis.CROSS} Failed to timeout member`)
 ]});
 }

 const embed = createModEmbed('timeout', targetMember.user, message.author, reason, caseId, formatDuration(duration));
 await message.reply({ embeds: [embed] });
}

};