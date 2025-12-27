import { Message, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { hasBanPermission } from '../../utils/moderationUtils';
import { Theme } from '../../utils/theme';
import { Emojis } from '../../utils/emojis';

export default {
 data: {
 name: 'unban',
 description: 'Unban a user from the server',
 category: 'moderation',
 syntax: '!unban <user_id>',
 example: '!unban 123456789',
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

 const userId = args[0];
 if (!userId) {
 return message.reply({ embeds: [new EmbedBuilder()
 .setColor(Theme.ErrorColor)
 .setDescription(`${Emojis.CROSS} Please provide a user ID`)
 ]});
 }

 try {
 await message.guild.bans.fetch(userId);
 } catch (error) {
 return message.reply({ embeds: [new EmbedBuilder()
 .setColor(Theme.ErrorColor)
 .setDescription(`${Emojis.CROSS} This user is not banned`)
 ]});
 }

 try {
 await message.guild.bans.remove(userId);
 
 const embed = new EmbedBuilder()
 .setColor(Theme.SuccessColor)
 .setDescription(`${Emojis.TICK} Unbanned <@${userId}>`)
 .setFooter({ text: `Unbanned by ${message.author.tag}` })
 .setTimestamp();
 
 await message.reply({ embeds: [embed] });
 } catch (error) {
 return message.reply({ embeds: [new EmbedBuilder()
 .setColor(Theme.ErrorColor)
 .setDescription(`${Emojis.CROSS} Failed to unban user`)
 ]});
 }
 }
};
