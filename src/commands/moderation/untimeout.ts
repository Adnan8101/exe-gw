import { Message, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { Theme } from '../../utils/theme';
import { Emojis } from '../../utils/emojis';
import { hasModPermission } from '../../utils/moderationUtils';



export default {
 data: {
 name: 'untimeout',
 description: 'Remove timeout from a member',
 syntax: '!untimeout <user>',
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

 if (!targetMember.communicationDisabledUntil) {
 return message.reply({ embeds: [new EmbedBuilder()
 .setColor(Theme.ErrorColor)
 .setDescription(`${Emojis.CROSS} This member is not timed out`)
 ]});
 }

 try {
 await targetMember.timeout(null);
 
 const embed = new EmbedBuilder()
 .setColor(Theme.SuccessColor)
 .setTitle(' Timeout Removed')
 .setDescription(`${targetMember.user.tag} can now communicate again`)
 .setFooter({ text: `Removed by ${message.author.tag}` })
 .setTimestamp();
 
 await message.reply({ embeds: [embed] });
 } catch (error) {
 return message.reply({ embeds: [new EmbedBuilder()
 .setColor(Theme.ErrorColor)
 .setDescription(`${Emojis.CROSS} Failed to remove timeout`)
 ]});
 }
}

};