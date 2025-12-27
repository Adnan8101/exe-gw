import { Message, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { canModerate, createModCase, createModEmbed, createDMEmbed, hasBanPermission } from '../../utils/moderationUtils';
import { Theme } from '../../utils/theme';
import { Emojis } from '../../utils/emojis';

export default {
 data: {
 name: 'ban',
 description: 'Ban a member from the server',
 category: 'moderation',
 syntax: '!ban <user> [reason]',
 example: '!ban @User Raid attempt',
 permissions: ['BanMembers']
 },

 async prefixRun(message: Message, args: string[]) {
 if (!message.guild || !message.member) return;

 if (!hasBanPermission(message.member)) {
 return message.reply({ embeds: [new EmbedBuilder()
 .setColor(Theme.ErrorColor)
 .setDescription(`${Emojis.CROSS} You need **Ban Members** permission`)
 ]});
 }

 if (!message.guild.members.me?.permissions.has(PermissionFlagsBits.BanMembers)) {
 return message.reply({ embeds: [new EmbedBuilder()
 .setColor(Theme.ErrorColor)
 .setDescription(`${Emojis.CROSS} I need **Ban Members** permission`)
 ]});
 }

 const targetMember = message.mentions.members?.first() || 
 await message.guild.members.fetch(args[0]).catch(() => null);

 if (!targetMember) {
 return message.reply({ embeds: [new EmbedBuilder()
 .setColor(Theme.ErrorColor)
 .setDescription(`${Emojis.CROSS} Please mention a valid member`)
 ]});
 }

 if (!canModerate(message.member, targetMember)) {
 return message.reply({ embeds: [new EmbedBuilder()
 .setColor(Theme.ErrorColor)
 .setDescription(`${Emojis.CROSS} Cannot ban this member (higher or equal role)`)
 ]});
 }

 if (!canModerate(message.guild.members.me!, targetMember)) {
 return message.reply({ embeds: [new EmbedBuilder()
 .setColor(Theme.ErrorColor)
 .setDescription(`${Emojis.CROSS} I cannot ban this member (higher or equal role)`)
 ]});
 }

 const reason = args.slice(1).join(' ') || 'No reason provided';

 const caseId = await createModCase(message.guild.id, {
 action: 'ban',
 targetId: targetMember.id,
 targetTag: targetMember.user.tag,
 moderatorId: message.author.id,
 moderatorTag: message.author.tag,
 reason
 });

 try {
 const dmEmbed = createDMEmbed('ban', message.guild, reason);
 await targetMember.send({ embeds: [dmEmbed] });
 } catch (error) {}

 try {
 await targetMember.ban({ reason });
 } catch (error) {
 return message.reply({ embeds: [new EmbedBuilder()
 .setColor(Theme.ErrorColor)
 .setDescription(`${Emojis.CROSS} Failed to ban member`)
 ]});
 }

 const embed = createModEmbed('ban', targetMember.user, message.author, reason, caseId);
 await message.reply({ embeds: [embed] });
 }
};
