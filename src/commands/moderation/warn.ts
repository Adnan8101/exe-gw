import { Message, EmbedBuilder } from 'discord.js';
import { Theme } from '../../utils/theme';
import { Emojis } from '../../utils/emojis';
import { canModerate, createModCase, createModEmbed, hasModPermission } from '../../utils/moderationUtils';
import { prisma } from '../../utils/database';



export default {
 data: {
 name: 'warn',
 description: 'Warn a member',
 syntax: '!warn <user> [reason]',
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
 reason
 });

 await prisma.warning.create({
 data: {
 guildId: message.guild.id,
 userId: targetMember.id,
 moderatorId: message.author.id,
 reason,
 caseId
 }
 });

 try {
 const dmEmbed = new EmbedBuilder()
 .setColor(Theme.EmbedColor)
 .setTitle(` You have been warned in ${message.guild.name}`)
 .addFields({ name: 'Reason', value: reason })
 .setFooter({ text: `Case ID: ${caseId}` })
 .setTimestamp();
 
 await targetMember.send({ embeds: [dmEmbed] });
 } catch (error) {}

 const warningCount = await prisma.warning.count({
 where: { guildId: message.guild.id, userId: targetMember.id }
 });

 const embed = createModEmbed('warn', targetMember.user, message.author, reason, caseId);
 embed.addFields({ name: 'Total Warnings', value: warningCount.toString(), inline: true });
 
 await message.reply({ embeds: [embed] });
}

};