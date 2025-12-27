import { Message, EmbedBuilder, PermissionFlagsBits, ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { Theme } from '../../utils/theme';
import { Emojis } from '../../utils/emojis';
import { canModerate, createModCase, hasKickPermission } from '../../utils/moderationUtils';



export default {
 data: new SlashCommandBuilder()
    .setName('silentkick')
    .setDescription('Kick a member without notifying them')
    .addUserOption(option => option.setName("user").setDescription("The user to silently kick").setRequired(true)).addStringOption(option => option.setName("reason").setDescription("Reason for the kick").setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),

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
 if (!message.guild || !message.member) return;

 if (!hasKickPermission(message.member)) {
 return message.reply({ embeds: [new EmbedBuilder()
 .setColor(Theme.ErrorColor)
 .setDescription(`${Emojis.CROSS} You need **Kick Members** permission to use this command`)
 ]});
 }

 if (!message.guild.members.me?.permissions.has(PermissionFlagsBits.KickMembers)) {
 return message.reply({ embeds: [new EmbedBuilder()
 .setColor(Theme.ErrorColor)
 .setDescription(`${Emojis.CROSS} I need **Kick Members** permission to execute this command`)
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
 .setDescription(`${Emojis.CROSS} You cannot kick this member (higher or equal role)`)
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
 reason,
 silent: true
 });

 try {
 await targetMember.kick(reason);
 } catch (error) {
 return message.reply({ embeds: [new EmbedBuilder()
 .setColor(Theme.ErrorColor)
 .setDescription(`${Emojis.CROSS} Failed to kick member`)
 ]});
 }

 const embed = new EmbedBuilder()
 .setColor(Theme.EmbedColor)
 .setTitle(' Silent Kick')
 .addFields(
 { name: 'User', value: `${targetMember.user.tag} (${targetMember.id})`, inline: true },
 { name: 'Moderator', value: `${message.author.tag}`, inline: true },
 { name: 'Reason', value: reason }
 )
 .setFooter({ text: `Case ID: ${caseId} • User was not notified` })
 .setTimestamp();

 await message.reply({ embeds: [embed] });
  }

};