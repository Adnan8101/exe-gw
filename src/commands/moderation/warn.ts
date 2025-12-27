import { Message, EmbedBuilder, ChatInputCommandInteraction, SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { Theme } from '../../utils/theme';
import { Emojis } from '../../utils/emojis';
import { canModerate, createModCase, createModEmbed, hasModPermission } from '../../utils/moderationUtils';
import { prisma } from '../../utils/database';



export default {
 data: new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Warn a member')
    .addUserOption(option => option.setName("user").setDescription("The user to warn").setRequired(true)).addStringOption(option => option.setName("reason").setDescription("Reason for the warning").setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

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

 if (!hasModPermission(message.member)) {
 return message.reply({ embeds: [new EmbedBuilder()
 .setColor(Theme.ErrorColor)
 .setDescription(`${Emojis.CROSS} You need **Moderate Members** permission to use this command`)
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
 .setDescription(`${Emojis.CROSS} You cannot warn this member (higher or equal role)`)
 ]});
 }

 const reason = args.slice(1).join(' ') || 'No reason provided';

 const caseId = await createModCase(message.guild.id, {
 action: 'warn',
 targetId: targetMember.id,
 targetTag: targetMember.user.tag,
 moderatorId: message.author.id,
 moderatorTag: message.author.tag,
 reason
 });

 await prisma.warning.create({
 data: {
 guildId: message.guild.id,
 userId: targetMember.id,
 moderatorId: message.author.id,
 reason,
 caseId
 }
 });

 try {
 const dmEmbed = new EmbedBuilder()
 .setColor(Theme.EmbedColor)
 .setTitle(` You have been warned in ${message.guild.name}`)
 .addFields({ name: 'Reason', value: reason })
 .setFooter({ text: `Case ID: ${caseId}` })
 .setTimestamp();
 
 await targetMember.send({ embeds: [dmEmbed] });
 } catch (error) {}

 const warningCount = await prisma.warning.count({
 where: { guildId: message.guild.id, userId: targetMember.id }
 });

 const embed = createModEmbed('warn', targetMember.user, message.author, reason, caseId);
 embed.addFields({ name: 'Total Warnings', value: warningCount.toString(), inline: true });
 
 await message.reply({ embeds: [embed] });
  }

};