import { Message, EmbedBuilder, PermissionFlagsBits, Role } from 'discord.js';
import { Theme } from '../../utils/theme';
import { Emojis } from '../../utils/emojis';
import { canModerate, hasManageRolesPermission } from '../../utils/moderationUtils';



export default {
 data: {
 name: 'role',
 description: 'Manage roles for members',
 syntax: '!role <add|remove|list|info> [user] [role]',
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

 const subcommand = args[0]?.toLowerCase();

 switch (subcommand) {
 case 'add':
 return handleRoleAdd(message, args);
 case 'remove':
 return handleRoleRemove(message, args);
 case 'list':
 return handleRoleList(message, args);
 case 'info':
 return handleRoleInfo(message, args);
 default:
 return message.reply({ embeds: [new EmbedBuilder()
 .setColor(Theme.ErrorColor)
          .setDescription(`${Emojis.CROSS} Invalid subcommand. Use: \`add\`, \`remove\`, \`list\`, or \`info\``)
        ]});
    }
  }
};

async function handleRoleAdd(message: Message, args: string[]) {
  const targetMember = message.mentions.members?.first() || 
    await message.guild!.members.fetch(args[1]).catch(() => null);

  if (!targetMember) {
    return message.reply({ embeds: [new EmbedBuilder()
      .setColor(Theme.ErrorColor)
      .setDescription(' Please mention a valid member.')
    ]});
  }

  const roleMention = message.mentions.roles.first();
 const roleId = args[2]?.replace(/[<@&>]/g, '');
 const role = roleMention || message.guild!.roles.cache.get(roleId!);

 if (!role) {
 return message.reply({ embeds: [new EmbedBuilder()
 .setColor(Theme.ErrorColor)
 .setDescription(' Please provide a valid role.')
 ]});
 }

 if (role.position >= message.guild!.members.me!.roles.highest.position) {
 return message.reply({ embeds: [new EmbedBuilder()
 .setColor(Theme.ErrorColor)
 .setDescription(`${Emojis.CROSS} I cannot manage this role (higher or equal to my highest role)`)
 ]});
 }

 if (role.position >= message.member!.roles.highest.position && message.guild!.ownerId !== message.author.id) {
 return message.reply({ embeds: [new EmbedBuilder()
 .setColor(Theme.ErrorColor)
 .setDescription(`${Emojis.CROSS} You cannot manage this role (higher or equal to your highest role)`)
 ]});
 }

 if (targetMember.roles.cache.has(role.id)) {
 return message.reply({ embeds: [new EmbedBuilder()
 .setColor(Theme.ErrorColor)
 .setDescription(` ${targetMember.user.tag} already has this role`)
 ]});
 }

 try {
 await targetMember.roles.add(role);
 
 const embed = new EmbedBuilder()
 .setColor(Theme.SuccessColor)
 .setTitle(' Role Added')
 .setDescription(`Added ${role} to ${targetMember.user.tag}`)
 .setFooter({ text: `Added by ${message.author.tag}` })
 .setTimestamp();
 
 await message.reply({ embeds: [embed] });
 } catch (error) {
 return message.reply({ embeds: [new EmbedBuilder()
 .setColor(Theme.ErrorColor)
 .setDescription(`${Emojis.CROSS} Failed to add role`)
 ]});
 }
}

async function handleRoleRemove(message: Message, args: string[]) {
 const targetMember = message.mentions.members?.first() || 
 await message.guild!.members.fetch(args[1]).catch(() => null);

 if (!targetMember) {
 return message.reply({ embeds: [new EmbedBuilder()
 .setColor(Theme.ErrorColor)
 .setDescription(' Please mention a valid member.')
 ]});
 }

 const roleMention = message.mentions.roles.first();
 const roleId = args[2]?.replace(/[<@&>]/g, '');
 const role = roleMention || message.guild!.roles.cache.get(roleId!);

 if (!role) {
 return message.reply({ embeds: [new EmbedBuilder()
 .setColor(Theme.ErrorColor)
 .setDescription(' Please provide a valid role.')
 ]});
 }

 if (role.position >= message.guild!.members.me!.roles.highest.position) {
 return message.reply({ embeds: [new EmbedBuilder()
 .setColor(Theme.ErrorColor)
 .setDescription(`${Emojis.CROSS} I cannot manage this role (higher or equal to my highest role)`)
 ]});
 }

 if (role.position >= message.member!.roles.highest.position && message.guild!.ownerId !== message.author.id) {
 return message.reply({ embeds: [new EmbedBuilder()
 .setColor(Theme.ErrorColor)
 .setDescription(`${Emojis.CROSS} You cannot manage this role (higher or equal to your highest role)`)
 ]});
 }

 if (!targetMember.roles.cache.has(role.id)) {
 return message.reply({ embeds: [new EmbedBuilder()
 .setColor(Theme.ErrorColor)
 .setDescription(` ${targetMember.user.tag} doesn't have this role`)
 ]});
 }

 try {
 await targetMember.roles.remove(role);
 
 const embed = new EmbedBuilder()
 .setColor(Theme.SuccessColor)
 .setTitle(' Role Removed')
 .setDescription(`Removed ${role} from ${targetMember.user.tag}`)
 .setFooter({ text: `Removed by ${message.author.tag}` })
 .setTimestamp();
 
 await message.reply({ embeds: [embed] });
 } catch (error) {
 return message.reply({ embeds: [new EmbedBuilder()
 .setColor(Theme.ErrorColor)
 .setDescription(`${Emojis.CROSS} Failed to remove role`)
 ]});
 }
}

async function handleRoleList(message: Message, args: string[]) {
 const targetMember = message.mentions.members?.first() || 
 await message.guild!.members.fetch(args[1]).catch(() => null) ||
 message.member;

 const roles = targetMember!.roles.cache
 .filter(role => role.id !== message.guild!.id)
 .sort((a, b) => b.position - a.position)
 .map(role => role.toString());

 const embed = new EmbedBuilder()
 .setColor(Theme.EmbedColor)
 .setTitle(` Roles for ${targetMember!.user.tag}`)
 .setDescription(roles.length > 0 ? roles.join(', ') : 'No roles')
 .addFields({ name: 'Total', value: roles.length.toString(), inline: true })
 .setTimestamp();

 await message.reply({ embeds: [embed] });
}

async function handleRoleInfo(message: Message, args: string[]) {
 const roleMention = message.mentions.roles.first();
 const roleId = args[1]?.replace(/[<@&>]/g, '');
 const role = roleMention || message.guild!.roles.cache.get(roleId!);

 if (!role) {
 return message.reply({ embeds: [new EmbedBuilder()
 .setColor(Theme.ErrorColor)
 .setDescription(' Please provide a valid role.')
 ]});
 }

 const members = role.members.size;
 const createdAt = new Date(role.createdTimestamp).toLocaleDateString();

 const embed = new EmbedBuilder()
 .setColor(role.color || Theme.EmbedColor)
 .setTitle(`📌 Role Info: ${role.name}`)
 .addFields(
 { name: 'ID', value: role.id, inline: true },
 { name: 'Members', value: members.toString(), inline: true },
 { name: 'Position', value: role.position.toString(), inline: true },
 { name: 'Color', value: role.hexColor, inline: true },
 { name: 'Hoisted', value: role.hoist ? 'Yes' : 'No', inline: true },
 { name: 'Mentionable', value: role.mentionable ? 'Yes' : 'No', inline: true },
 { name: 'Created', value: createdAt }
 )
 .setTimestamp();

 await message.reply({ embeds: [embed] });
}
