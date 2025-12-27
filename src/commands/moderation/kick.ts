import { Message, EmbedBuilder, PermissionFlagsBits, SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { canModerate, createModCase, createModEmbed, createDMEmbed, hasKickPermission } from '../../utils/moderationUtils';
import { Theme } from '../../utils/theme';
import { Emojis } from '../../utils/emojis';
import { createMissingArgsEmbed, createCommandHelpEmbed } from '../../utils/commandHelp';

export default {
 data: new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Kick a member from the server')
    .addUserOption(option => option.setName('user').setDescription('The user to kick').setRequired(true))
    .addStringOption(option => option.setName('reason').setDescription('Reason for the kick').setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),
  
  metadata: {
    syntax: '!kick <user> [reason]',
    example: '!kick @User Spamming',
    permissions: 'Kick Members',
    category: 'Moderation'
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
    // Validate required arguments - show help embed if missing
    if (args.length < 1) {
      const commandData = {
        name: 'kick',
        description: 'Kick a member from the server',
        metadata: this.metadata
      };
      return message.reply({ embeds: [createMissingArgsEmbed(commandData, 'user')] });
    }

 if (!message.guild || !message.member) return;

 if (!hasKickPermission(message.member)) {
 return message.reply({ embeds: [new EmbedBuilder()
 .setColor(Theme.ErrorColor)
 .setDescription(`${Emojis.CROSS} You need **Kick Members** permission`)
 ]});
 }

 if (!message.guild.members.me?.permissions.has(PermissionFlagsBits.KickMembers)) {
 return message.reply({ embeds: [new EmbedBuilder()
 .setColor(Theme.ErrorColor)
 .setDescription(`${Emojis.CROSS} I need **Kick Members** permission`)
 ]});
 }

 const targetMember = message.mentions.members?.first() || 
 await message.guild.members.fetch(args[0]).catch(() => null);

 if (!targetMember) {
 return message.reply({ embeds: [new EmbedBuilder()
 .setColor(Theme.ErrorColor)
 .setDescription(`${Emojis.CROSS} Please mention a valid member`)
 ]});
 }

 if (!canModerate(message.member, targetMember)) {
 return message.reply({ embeds: [new EmbedBuilder()
 .setColor(Theme.ErrorColor)
 .setDescription(`${Emojis.CROSS} Cannot kick this member (higher or equal role)`)
 ]});
 }

 if (!canModerate(message.guild.members.me!, targetMember)) {
 return message.reply({ embeds: [new EmbedBuilder()
 .setColor(Theme.ErrorColor)
 .setDescription(`${Emojis.CROSS} I cannot kick this member (higher or equal role)`)
 ]});
 }

 const reason = args.slice(1).join(' ') || 'No reason provided';

 const caseId = await createModCase(message.guild.id, {
 action: 'kick',
 targetId: targetMember.id,
 targetTag: targetMember.user.tag,
 moderatorId: message.author.id,
 moderatorTag: message.author.tag,
 reason
 });

 try {
 const dmEmbed = createDMEmbed('kick', message.guild, reason);
 await targetMember.send({ embeds: [dmEmbed] });
 } catch (error) {}

 try {
 await targetMember.kick(reason);
 } catch (error) {
 return message.reply({ embeds: [new EmbedBuilder()
 .setColor(Theme.ErrorColor)
 .setDescription(`${Emojis.CROSS} Failed to kick member`)
 ]});
 }

 const embed = createModEmbed('kick', targetMember.user, message.author, reason, caseId);
 await message.reply({ embeds: [embed] });
  }
};
