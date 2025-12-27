import { Message, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { Theme } from '../../utils/theme';
import { Emojis } from '../../utils/emojis';
import { hasManageRolesPermission } from '../../utils/moderationUtils';
import { prisma } from '../../utils/database';



export default {
 data: {
 name: 'rolelock',
 description: 'Lock or unlock roles',
 syntax: '!rolelock <lock|unlock|show> [role]',
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

 const subcommand = args[0]?.toLowerCase();

 switch (subcommand) {
 case 'lock':
 return handleRoleLock(message, args);
 case 'unlock':
 return handleRoleUnlock(message, args);
 case 'show':
 return handleRoleLockShow(message);
 default:
 return message.reply({ embeds: [new EmbedBuilder()
 .setColor(Theme.ErrorColor)
          .setDescription(`${Emojis.CROSS} Invalid subcommand. Use: \`lock\`, \`unlock\`, or \`show\``)
        ]});
    }
  }
};

async function handleRoleLock(message: Message, args: string[]) {
  const roleMention = message.mentions.roles.first();
  const roleId = args[1]?.replace(/[<@&>]/g, '');
  const role = roleMention || message.guild!.roles.cache.get(roleId!);

  if (!role) {
    return message.reply({ embeds: [new EmbedBuilder()
      .setColor(Theme.ErrorColor)
      .setDescription(' Please provide a valid role.')
    ]});
  }

  const existing = await prisma.lockedRole.findUnique({
 where: {
 guildId_roleId: {
 guildId: message.guild!.id,
 roleId: role.id
 }
 }
 });

 if (existing) {
 return message.reply({ embeds: [new EmbedBuilder()
 .setColor(Theme.ErrorColor)
 .setDescription(` ${role} is already locked`)
 ]});
 }

 await prisma.lockedRole.create({
 data: {
 guildId: message.guild!.id,
 roleId: role.id,
 lockedBy: message.author.id
 }
 });

 const embed = new EmbedBuilder()
 .setColor(Theme.ErrorColor)
 .setTitle(' Role Locked')
 .setDescription(`${role} is now locked and cannot be assigned by members`)
 .setFooter({ text: `Locked by ${message.author.tag}` })
 .setTimestamp();

 await message.reply({ embeds: [embed] });
}

async function handleRoleUnlock(message: Message, args: string[]) {
 const roleMention = message.mentions.roles.first();
 const roleId = args[1]?.replace(/[<@&>]/g, '');
 const role = roleMention || message.guild!.roles.cache.get(roleId!);

 if (!role) {
 return message.reply({ embeds: [new EmbedBuilder()
 .setColor(Theme.ErrorColor)
 .setDescription(' Please provide a valid role.')
 ]});
 }

 const result = await prisma.lockedRole.deleteMany({
 where: {
 guildId: message.guild!.id,
 roleId: role.id
 }
 });

 if (result.count === 0) {
 return message.reply({ embeds: [new EmbedBuilder()
 .setColor(Theme.ErrorColor)
 .setDescription(` ${role} is not locked`)
 ]});
 }

 const embed = new EmbedBuilder()
 .setColor(Theme.SuccessColor)
 .setTitle(' Role Unlocked')
 .setDescription(`${role} has been unlocked`)
 .setFooter({ text: `Unlocked by ${message.author.tag}` })
 .setTimestamp();

 await message.reply({ embeds: [embed] });
}

async function handleRoleLockShow(message: Message) {
 const lockedRoles = await prisma.lockedRole.findMany({
 where: { guildId: message.guild!.id }
 });

 if (lockedRoles.length === 0) {
 return message.reply({ embeds: [new EmbedBuilder()
 .setColor(Theme.EmbedColor)
 .setDescription(' No roles are currently locked.')
 ]});
 }

 const rolesList = lockedRoles
 .map(lr => {
 const role = message.guild!.roles.cache.get(lr.roleId);
 return role ? `${role} - Locked by <@${lr.lockedBy}>` : `Unknown Role (${lr.roleId})`;
 })
 .join('\n');

 const embed = new EmbedBuilder()
 .setColor(Theme.EmbedColor)
 .setTitle(' Locked Roles')
 .setDescription(rolesList)
 .setFooter({ text: `Total: ${lockedRoles.length}` })
 .setTimestamp();

 await message.reply({ embeds: [embed] });
}
