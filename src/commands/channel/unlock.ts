import { Message, EmbedBuilder, PermissionFlagsBits, TextChannel, ChannelType } from 'discord.js';
import { Theme } from '../../utils/theme';
import { Emojis } from '../../utils/emojis';



export default {
 data: {
 name: 'unlock',
 description: 'Unlock a channel',
 syntax: '!unlock [channel]',
 category: 'channel'
},

 async prefixRun(message: Message, args: string[]) {
 if (!message.guild || !message.member) return;

 if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
 return message.reply({ embeds: [new EmbedBuilder()
 .setColor(Theme.ErrorColor)
 .setDescription(`${Emojis.CROSS} You need **Manage Channels** permission to use this command`)
 ]});
 }

 if (!message.guild.members.me?.permissions.has(PermissionFlagsBits.ManageChannels)) {
 return message.reply({ embeds: [new EmbedBuilder()
 .setColor(Theme.ErrorColor)
 .setDescription(`${Emojis.CROSS} I need **Manage Channels** permission to execute this command`)
 ]});
 }

 const channel = message.mentions.channels.first() || 
 (args[0] ? await message.guild.channels.fetch(args[0]).catch(() => null) : null) ||
 message.channel;

 if (!channel || (channel.type !== ChannelType.GuildText && channel.type !== ChannelType.GuildAnnouncement)) {
 return message.reply({ embeds: [new EmbedBuilder()
 .setColor(Theme.ErrorColor)
 .setDescription(`${Emojis.CROSS} Invalid channel`)
 ]});
 }

 const everyoneRole = message.guild.roles.everyone;

 try {
 await (channel as TextChannel).permissionOverwrites.edit(everyoneRole, {
 SendMessages: null
 });

 const embed = new EmbedBuilder()
 .setColor(Theme.SuccessColor)
 .setTitle(' Channel Unlocked')
 .setDescription(`${channel} has been unlocked`)
 .setFooter({ text: `Unlocked by ${message.author.tag}` })
 .setTimestamp();

 await message.reply({ embeds: [embed] });
 } catch (error) {
 return message.reply({ embeds: [new EmbedBuilder()
 .setColor(Theme.ErrorColor)
 .setDescription(`${Emojis.CROSS} Failed to unlock channel`)
 ]});
 }
}

};