import { Message, EmbedBuilder } from 'discord.js';
import { Theme } from '../../utils/theme';
import { Emojis } from '../../utils/emojis';
import { hasModPermission } from '../../utils/moderationUtils';
import { prisma } from '../../utils/database';



export default {
 data: {
 name: 'warnings',
 description: 'View warnings for a member',
 syntax: '!warnings <user>',
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

 const warnings = await prisma.warning.findMany({
 where: {
 guildId: message.guild.id,
 userId: targetMember.id
 },
 orderBy: { createdAt: 'desc' },
 take: 10
 });

 if (warnings.length === 0) {
 return message.reply({ embeds: [new EmbedBuilder()
 .setColor(Theme.SuccessColor)
 .setDescription(` ${targetMember.user.tag} has no warnings`)
 ]});
 }

 const embed = new EmbedBuilder()
 .setColor(Theme.EmbedColor)
 .setTitle(` Warnings for ${targetMember.user.tag}`)
 .setDescription(`Total: **${warnings.length}** warning(s)`)
 .setTimestamp();

 warnings.forEach((warn, index) => {
 const date = new Date(warn.createdAt).toLocaleDateString();
 embed.addFields({
 name: `${index + 1}. ${date} - Case ${warn.caseId}`,
 value: `Reason: ${warn.reason || 'No reason'}\nModerator: <@${warn.moderatorId}>`,
 inline: false
 });
 });

 await message.reply({ embeds: [embed] });
}

};