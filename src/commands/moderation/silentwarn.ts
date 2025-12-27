import { Message, EmbedBuilder } from 'discord.js';
import { Theme } from '../../utils/theme';
import { Emojis } from '../../utils/emojis';
import { canModerate, createModCase, hasModPermission } from '../../utils/moderationUtils';



export default {
 data: {
 name: 'silentwarn',
 description: 'Warn a member without notifying them',
 syntax: '!silentwarn <user> [reason]',
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

 if (!canModerate(message.member, targetMember)) {
 return message.reply({ embeds: [new EmbedBuilder()
 .setColor(Theme.ErrorColor)
 .setDescription(`${Emojis.CROSS} You cannot warn this member (higher or equal role)`)
 ]});
 }

 const reason = args.slice(1).join(' ') || 'No reason provided';

 const caseId = await createModCase(message.guild.id, {
 action: 'warn',
 targetId: targetMember.id,
 targetTag: targetMember.user.tag,
 moderatorId: message.author.id,
 moderatorTag: message.author.tag,
 reason,
 silent: true
 });

 const embed = new EmbedBuilder()
 .setColor(Theme.EmbedColor)
 .setTitle(' Silent Warning Issued')
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