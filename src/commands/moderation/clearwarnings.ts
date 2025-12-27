import { Message, EmbedBuilder } from 'discord.js';
import { Theme } from '../../utils/theme';
import { Emojis } from '../../utils/emojis';
import { hasModPermission } from '../../utils/moderationUtils';
import { prisma } from '../../utils/database';



export default {
 data: {
 name: 'clearwarnings',
 description: 'Clear all warnings for a member',
 syntax: '!clearwarnings <user>',
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

 const result = await prisma.warning.deleteMany({
 where: {
 guildId: message.guild.id,
 userId: targetMember.id
 }
 });

 const embed = new EmbedBuilder()
 .setColor(Theme.SuccessColor)
 .setTitle(' Warnings Cleared')
 .setDescription(`Cleared **${result.count}** warning(s) for ${targetMember.user.tag}`)
 .setFooter({ text: `Cleared by ${message.author.tag}` })
 .setTimestamp();

 await message.reply({ embeds: [embed] });
}

};