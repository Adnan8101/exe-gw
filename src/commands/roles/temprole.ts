import { Message, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { Theme } from '../../utils/theme';
import { Emojis } from '../../utils/emojis';
import { hasManageRolesPermission, parseDuration, formatDuration } from '../../utils/moderationUtils';
import { prisma } from '../../utils/database';



export default {
 data: {
 name: 'temprole',
 description: 'Give a member a temporary role',
 syntax: '!temprole <user> <role> <duration>\nDuration: 1h, 2d, 7d',
 category: 'roles'
},

 async prefixRun(message: Message, args: string[]) {
 if (!message.guild || !message.member) return;

 if (!hasManageRolesPermission(message.member)) {
 return message.reply({ embeds: [new EmbedBuilder()
 .setColor(Theme.ErrorColor)
 .setDescription(`${Emojis.CROSS} You need **Manage Roles** permission to use this command`)
 ]});
 }

 if (!message.guild.members.me?.permissions.has(PermissionFlagsBits.ManageRoles)) {
 return message.reply({ embeds: [new EmbedBuilder()
 .setColor(Theme.ErrorColor)
 .setDescription(`${Emojis.CROSS} I need **Manage Roles** permission to execute this command`)
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

 const roleMention = message.mentions.roles.first();
 const roleId = args[1]?.replace(/[<@&>]/g, '');
 const role = roleMention || message.guild.roles.cache.get(roleId!);

 if (!role) {
 return message.reply({ embeds: [new EmbedBuilder()
 .setColor(Theme.ErrorColor)
 .setDescription(' Please provide a valid role.')
 ]});
 }

 if (role.position >= message.guild.members.me!.roles.highest.position) {
 return message.reply({ embeds: [new EmbedBuilder()
 .setColor(Theme.ErrorColor)
 .setDescription(`${Emojis.CROSS} I cannot manage this role (higher or equal to my highest role)`)
 ]});
 }

 if (role.position >= message.member.roles.highest.position && message.guild?.ownerId !== message.author.id) {
 return message.reply({ embeds: [new EmbedBuilder()
 .setColor(Theme.ErrorColor)
 .setDescription(`${Emojis.CROSS} You cannot manage this role (higher or equal to your highest role)`)
 ]});
 }

 const durationStr = args[2];
 const duration = parseDuration(durationStr);

 if (!duration) {
 return message.reply({ embeds: [new EmbedBuilder()
 .setColor(Theme.ErrorColor)
 .setDescription(`${Emojis.CROSS} Invalid duration format. Use: 1h, 2d, 7d`)
 ]});
 }

 try {
 await targetMember.roles.add(role);
 
 const expiresAt = new Date(Date.now() + duration);
 
 await prisma.temporaryRole.create({
 data: {
 guildId: message.guild.id,
 userId: targetMember.id,
 roleId: role.id,
 expiresAt
 }
 });

 // Schedule role removal
 setTimeout(async () => {
 try {
 const member = await message.guild!.members.fetch(targetMember.id).catch(() => null);
 if (member && member.roles.cache.has(role.id)) {
 await member.roles.remove(role);
 }
 await prisma.temporaryRole.deleteMany({
 where: {
 guildId: message.guild!.id,
 userId: targetMember.id,
 roleId: role.id
 }
 });
 } catch (error) {
 console.error('Failed to remove temporary role:', error);
 }
 }, duration);

 const embed = new EmbedBuilder()
 .setColor(Theme.SuccessColor)
 .setTitle(' Temporary Role Added')
 .setDescription(`Added ${role} to ${targetMember.user.tag}`)
 .addFields(
 { name: 'Duration', value: formatDuration(duration), inline: true },
 { name: 'Expires', value: `<t:${Math.floor(expiresAt.getTime() / 1000)}:R>`, inline: true }
 )
 .setFooter({ text: `Added by ${message.author.tag}` })
 .setTimestamp();
 
 await message.reply({ embeds: [embed] });
 } catch (error) {
 return message.reply({ embeds: [new EmbedBuilder()
 .setColor(Theme.ErrorColor)
 .setDescription(`${Emojis.CROSS} Failed to add temporary role`)
 ]});
 }
}

};