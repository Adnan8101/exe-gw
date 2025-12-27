import { Message, EmbedBuilder, PermissionFlagsBits, ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { Theme } from '../../utils/theme';
import { Emojis } from '../../utils/emojis';
import { createMissingArgsEmbed } from '../../utils/commandHelp';
import { canModerate, createModCase, createModEmbed, createDMEmbed, hasBanPermission, parseDuration, formatDuration } from '../../utils/moderationUtils';



export default {
 data: new SlashCommandBuilder()
    .setName('tempban')
    .setDescription('Temporarily ban a member')
    .addUserOption(option => option.setName("user").setDescription("The user to temporarily ban").setRequired(true)).addStringOption(option => option.setName("duration").setDescription("Ban duration (e.g., 1h, 1d, 1w)").setRequired(true)).addStringOption(option => option.setName("reason").setDescription("Reason for the ban").setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
  
  metadata: {
    syntax: '!tempban <user> <duration> [reason]',
    example: '!tempban @User 7d Repeated warnings',
    permissions: 'Ban Members',
    category: 'Moderation'
  }

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
    if (args.length < 2) {
      return message.reply({ embeds: [createMissingArgsEmbed(this.data as any, 'user and duration')] });
    }

 if (!message.guild || !message.member) return;

 if (!hasBanPermission(message.member)) {
 return message.reply({ embeds: [new EmbedBuilder()
 .setColor(Theme.ErrorColor)
 .setDescription(`${Emojis.CROSS} You need **Ban Members** permission to use this command`)
 ]});
 }

 if (!message.guild.members.me?.permissions.has(PermissionFlagsBits.BanMembers)) {
 return message.reply({ embeds: [new EmbedBuilder()
 .setColor(Theme.ErrorColor)
 .setDescription(`${Emojis.CROSS} I need **Ban Members** permission to execute this command`)
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

 if (!canModerate(message.member, targetMember)) {
 return message.reply({ embeds: [new EmbedBuilder()
 .setColor(Theme.ErrorColor)
 .setDescription(`${Emojis.CROSS} You cannot tempban this member (higher or equal role)`)
 ]});
 }

 if (!canModerate(message.guild.members.me!, targetMember)) {
 return message.reply({ embeds: [new EmbedBuilder()
 .setColor(Theme.ErrorColor)
 .setDescription(`${Emojis.CROSS} I cannot tempban this member (higher or equal role)`)
 ]});
 }

 const durationStr = args[1];
 const duration = parseDuration(durationStr);

 if (!duration) {
 return message.reply({ embeds: [new EmbedBuilder()
 .setColor(Theme.ErrorColor)
 .setDescription(`${Emojis.CROSS} Invalid duration format. Use: 1h, 2d, 7d`)
 ]});
 }

 const reason = args.slice(2).join(' ') || 'No reason provided';

 const caseId = await createModCase(message.guild.id, {
 action: 'tempban',
 targetId: targetMember.id,
 targetTag: targetMember.user.tag,
 moderatorId: message.author.id,
 moderatorTag: message.author.tag,
 reason,
 duration
 });

 try {
 const dmEmbed = createDMEmbed('tempban', message.guild, reason, formatDuration(duration));
 await targetMember.send({ embeds: [dmEmbed] });
 } catch (error) {}

 try {
 await targetMember.ban({ reason: `${reason} (Temporary - ${formatDuration(duration)})` });
 
 // Schedule unban
 setTimeout(async () => {
 try {
 await message.guild!.bans.remove(targetMember.id, 'Temporary ban expired');
 } catch (error) {
 console.error('Failed to unban:', error);
 }
 }, duration);
 } catch (error) {
 return message.reply({ embeds: [new EmbedBuilder()
 .setColor(Theme.ErrorColor)
 .setDescription(`${Emojis.CROSS} Failed to tempban member`)
 ]});
 }

 const embed = createModEmbed('tempban', targetMember.user, message.author, reason, caseId, formatDuration(duration));
 await message.reply({ embeds: [embed] });
  }

};