import { Message, EmbedBuilder, PermissionFlagsBits, SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { Theme } from '../../utils/theme';
import { Emojis } from '../../utils/emojis';
import { createMissingArgsEmbed } from '../../utils/commandHelp';
import { hasManageRolesPermission } from '../../utils/moderationUtils';
import { prisma } from '../../utils/database';



export default {
 data: new SlashCommandBuilder()
    .setName('rolelock')
    .setDescription('Lock or unlock roles')
    .addSubcommand(subcommand =>
      subcommand
        .setName('add')
        .setDescription('Lock a role to specific users')
        .addRoleOption(option => option.setName('role').setDescription('The role to lock').setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('remove')
        .setDescription('Remove role lock')
        .addRoleOption(option => option.setName('role').setDescription('The role to unlock').setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('list')
        .setDescription('List all locked roles'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),
  
  metadata: {
    syntax: '!rolelock <add|remove|list> [role]',
    example: '!rolelock add @Admin',
    permissions: 'Manage Roles',
    category: 'Role Management'
  },

  async execute(interaction: ChatInputCommandInteraction) {
    // Convert interaction to message-like format for shared logic
    const args: string[] = [];
    
    // Extract args from slash command options
    if (interaction.options.data) {
      for (const opt of interaction.options.data) {
        if (opt.value !== undefined) {
          args.push(String(opt.value));
        } else if (opt.user) {
          args.push(opt.user.id);
        } else if (opt.channel) {
          args.push(opt.channel.id);
        } else if (opt.role) {
          args.push(opt.role.id);
        }
      }
    }
    
    // Create message-like object
    const message: any = {
      guild: interaction.guild,
      member: interaction.member,
      author: interaction.user,
      channel: interaction.channel,
      mentions: {
        members: interaction.options.getMember('user') ? 
          new Map(interaction.options.getMember('user') ? [[interaction.options.getUser('user')!.id, interaction.options.getMember('user')]] : []) : 
          new Map(),
        channels: interaction.options.getChannel('channel') ? 
          new Map([[interaction.options.getChannel('channel')!.id, interaction.options.getChannel('channel')]]) : 
          new Map(),
        roles: interaction.options.getRole('role') ? 
          new Map([[interaction.options.getRole('role')!.id, interaction.options.getRole('role')]]) : 
          new Map()
      },
      reply: async (options: any) => {
        if (interaction.replied || interaction.deferred) {
          return interaction.followUp(options);
        }
        return interaction.reply(options);
      }
    };
    
    return this._sharedLogic(message as Message, args);
  },
  
  async prefixRun(message: Message, args: string[]) {
    return this._sharedLogic(message, args);
  },
  
  
  async _sharedLogic(message: Message, args: string[]) {
    // Validate required arguments
    if (args.length < 1) {
      return message.reply({ embeds: [createMissingArgsEmbed(this.data as any, 'action')] });
    }

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
 .setTitle(`${Emojis.TICK} Role Locked`)
 .setDescription(`${role} is now locked`)
 .setFooter({ text: `By ${message.author.tag}` })
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
 .setTitle(`${Emojis.TICK} Role Unlocked`)
 .setDescription(`${role} is now unlocked`)
 .setFooter({ text: `By ${message.author.tag}` })
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
