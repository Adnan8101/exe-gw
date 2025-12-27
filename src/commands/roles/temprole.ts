import { Message, EmbedBuilder, PermissionFlagsBits, ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { Theme } from '../../utils/theme';
import { Emojis } from '../../utils/emojis';
import { createMissingArgsEmbed } from '../../utils/commandHelp';
import { hasManageRolesPermission, parseDuration, formatDuration } from '../../utils/moderationUtils';
import { prisma } from '../../utils/database';



export default {
 data: new SlashCommandBuilder()
    .setName('temprole')
    .setDescription('Give a member a temporary role')
    .addUserOption(option => option.setName("user").setDescription("The user").setRequired(true)).addRoleOption(option => option.setName("role").setDescription("The role to assign temporarily").setRequired(true)).addStringOption(option => option.setName("duration").setDescription("Duration (e.g., 1h, 1d, 1w)").setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),
  
  metadata: {
    syntax: '!temprole <user> <role> <duration>',
    example: '!temprole @User @VIP 7d',
    permissions: 'Manage Roles',
    category: 'Role Management'
  },

  async execute(interaction: ChatInputCommandInteraction) {
    const args: string[] = [];
    
    // Parse slash command options
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
    if (args.length < 3) {
      return message.reply({ embeds: [createMissingArgsEmbed(this.data as any, 'user, role, and duration')] });
    }

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
 .setDescription(`${Emojis.TICK} Temporary ${role} added to ${targetMember.user} for ${formatDuration(duration)}`)
 .setFooter({ text: `Mod: ${message.author.tag} | Expires: ${Math.floor(expiresAt.getTime() / 1000)}` })
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