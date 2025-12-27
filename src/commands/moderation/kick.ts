import { Message, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { canModerate, createModCase, createModEmbed, createDMEmbed, hasKickPermission } from '../../utils/moderationUtils';
import { Theme } from '../../utils/theme';
import { Emojis } from '../../utils/emojis';

export default {
 data: {
 name: 'kick',
 description: 'Kick a member from the server',
 category: 'moderation',
 syntax: '!kick <user> [reason]',
 example: '!kick @User Spamming',
 permissions: ['KickMembers']
 },

 async prefixRun(message: Message, args: string[]) {
 if (!message.guild || !message.member) return;

 if (!hasKickPermission(message.member)) {
 return message.reply({ embeds: [new EmbedBuilder()
 .setColor(Theme.ErrorColor)
 .setDescription(`${Emojis.CROSS} You need **Kick Members** permission`)
 ]});
 }

 if (!message.guild.members.me?.permissions.has(PermissionFlagsBits.KickMembers)) {
 return message.reply({ embeds: [new EmbedBuilder()
 .setColor(Theme.ErrorColor)
 .setDescription(`${Emojis.CROSS} I need **Kick Members** permission`)
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
 .setDescription(`${Emojis.CROSS} Cannot kick this member (higher or equal role)`)
 ]});
 }

 if (!canModerate(message.guild.members.me!, targetMember)) {
 return message.reply({ embeds: [new EmbedBuilder()
 .setColor(Theme.ErrorColor)
 .setDescription(`${Emojis.CROSS} I cannot kick this member (higher or equal role)`)
 ]});
 }

 const reason = args.slice(1).join(' ') || 'No reason provided';

 const caseId = await createModCase(message.guild.id, {
 action: 'kick',
 targetId: targetMember.id,
 targetTag: targetMember.user.tag,
 moderatorId: message.author.id,
 moderatorTag: message.author.tag,
 reason
 });

 try {
 const dmEmbed = createDMEmbed('kick', message.guild, reason);
 await targetMember.send({ embeds: [dmEmbed] });
 } catch (error) {}

 try {
 await targetMember.kick(reason);
 } catch (error) {
 return message.reply({ embeds: [new EmbedBuilder()
 .setColor(Theme.ErrorColor)
 .setDescription(`${Emojis.CROSS} Failed to kick member`)
 ]});
 }

 const embed = createModEmbed('kick', targetMember.user, message.author, reason, caseId);
 await message.reply({ embeds: [embed] });
 }
};
