import { Message, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { Theme } from '../../utils/theme';
import { Emojis } from '../../utils/emojis';
import { canModerate, createModCase, createModEmbed, createDMEmbed, hasBanPermission, parseDuration, formatDuration } from '../../utils/moderationUtils';



export default {
 data: {
 name: 'tempban',
 description: 'Temporarily ban a member',
 syntax: '!tempban <user> <duration> [reason]\nDuration: 1h, 2d, 7d',
 category: 'moderation'
},

 async prefixRun(message: Message, args: string[]) {
 if (!message.guild || !message.member) return;

 if (!hasBanPermission(message.member)) {
 return message.reply({ embeds: [new EmbedBuilder()
 .setColor(Theme.ErrorColor)
 .setDescription(`${Emojis.CROSS} You need **Ban Members** permission to use this command`)
 ]});
 }

 if (!message.guild.members.me?.permissions.has(PermissionFlagsBits.BanMembers)) {
 return message.reply({ embeds: [new EmbedBuilder()
 .setColor(Theme.ErrorColor)
 .setDescription(`${Emojis.CROSS} I need **Ban Members** permission to execute this command`)
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
 .setDescription(`${Emojis.CROSS} You cannot tempban this member (higher or equal role)`)
 ]});
 }

 if (!canModerate(message.guild.members.me!, targetMember)) {
 return message.reply({ embeds: [new EmbedBuilder()
 .setColor(Theme.ErrorColor)
 .setDescription(`${Emojis.CROSS} I cannot tempban this member (higher or equal role)`)
 ]});
 }

 const durationStr = args[1];
 const duration = parseDuration(durationStr);

 if (!duration) {
 return message.reply({ embeds: [new EmbedBuilder()
 .setColor(Theme.ErrorColor)
 .setDescription(`${Emojis.CROSS} Invalid duration format. Use: 1h, 2d, 7d`)
 ]});
 }

 const reason = args.slice(2).join(' ') || 'No reason provided';

 const caseId = await createModCase(message.guild.id, {
 action: 'tempban',
 targetId: targetMember.id,
 targetTag: targetMember.user.tag,
 moderatorId: message.author.id,
 moderatorTag: message.author.tag,
 reason,
 duration
 });

 try {
 const dmEmbed = createDMEmbed('tempban', message.guild, reason, formatDuration(duration));
 await targetMember.send({ embeds: [dmEmbed] });
 } catch (error) {}

 try {
 await targetMember.ban({ reason: `${reason} (Temporary - ${formatDuration(duration)})` });
 
 // Schedule unban
 setTimeout(async () => {
 try {
 await message.guild!.bans.remove(targetMember.id, 'Temporary ban expired');
 } catch (error) {
 console.error('Failed to unban:', error);
 }
 }, duration);
 } catch (error) {
 return message.reply({ embeds: [new EmbedBuilder()
 .setColor(Theme.ErrorColor)
 .setDescription(`${Emojis.CROSS} Failed to tempban member`)
 ]});
 }

 const embed = createModEmbed('tempban', targetMember.user, message.author, reason, caseId, formatDuration(duration));
 await message.reply({ embeds: [embed] });
}

};