import { Message, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { Theme } from '../../utils/theme';
import { Emojis } from '../../utils/emojis';
import { canModerate, createModCase, hasKickPermission } from '../../utils/moderationUtils';



export default {
 data: {
 name: 'silentkick',
 description: 'Kick a member without notifying them',
 syntax: '!silentkick <user> [reason]',
 category: 'moderation'
},

 async prefixRun(message: Message, args: string[]) {
 if (!message.guild || !message.member) return;

 if (!hasKickPermission(message.member)) {
 return message.reply({ embeds: [new EmbedBuilder()
 .setColor(Theme.ErrorColor)
 .setDescription(`${Emojis.CROSS} You need **Kick Members** permission to use this command`)
 ]});
 }

 if (!message.guild.members.me?.permissions.has(PermissionFlagsBits.KickMembers)) {
 return message.reply({ embeds: [new EmbedBuilder()
 .setColor(Theme.ErrorColor)
 .setDescription(`${Emojis.CROSS} I need **Kick Members** permission to execute this command`)
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
 .setDescription(`${Emojis.CROSS} You cannot kick this member (higher or equal role)`)
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
 reason,
 silent: true
 });

 try {
 await targetMember.kick(reason);
 } catch (error) {
 return message.reply({ embeds: [new EmbedBuilder()
 .setColor(Theme.ErrorColor)
 .setDescription(`${Emojis.CROSS} Failed to kick member`)
 ]});
 }

 const embed = new EmbedBuilder()
 .setColor(Theme.EmbedColor)
 .setTitle(' Silent Kick')
 .addFields(
 { name: 'User', value: `${targetMember.user.tag} (${targetMember.id})`, inline: true },
 { name: 'Moderator', value: `${message.author.tag}`, inline: true },
 { name: 'Reason', value: reason }
 )
 .setFooter({ text: `Case ID: ${caseId} • User was not notified` })
 .setTimestamp();

 await message.reply({ embeds: [embed] });
}

};