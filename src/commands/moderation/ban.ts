import { Message, EmbedBuilder, PermissionFlagsBits, SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { canModerate, createModCase, createModEmbed, createDMEmbed, hasBanPermission } from '../../utils/moderationUtils';
import { Theme } from '../../utils/theme';
import { Emojis } from '../../utils/emojis';
import { createMissingArgsEmbed } from '../../utils/commandHelp';

export default {
 data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Ban a member from the server')
    .addStringOption(option => option.setName('user').setDescription('The user ID or mention to ban').setRequired(true))
    .addStringOption(option => option.setName('reason').setDescription('Reason for the ban').setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
  
  metadata: {
    syntax: '!ban <user> [reason]',
    example: '!ban @User Breaking rules',
    permissions: 'Ban Members',
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
    // Validate required arguments
    if (args.length < 1) {
      return message.reply({ embeds: [createMissingArgsEmbed(this.data as any, 'user')] });
    }

 if (!message.guild || !message.member) return;

 if (!hasBanPermission(message.member)) {
 return message.reply({ embeds: [new EmbedBuilder()
 .setColor(Theme.ErrorColor)
 .setDescription(`${Emojis.CROSS} You need **Ban Members** permission`)
 ]});
 }

 if (!message.guild.members.me?.permissions.has(PermissionFlagsBits.BanMembers)) {
 return message.reply({ embeds: [new EmbedBuilder()
 .setColor(Theme.ErrorColor)
 .setDescription(`${Emojis.CROSS} I need **Ban Members** permission`)
 ]});
 }

    // Try to get member from server first
    const targetMember = message.mentions.members?.first() || 
      await message.guild.members.fetch(args[0]).catch(() => null);

    // If member not in server, try to fetch user by ID (hackban)
    let targetUser;
    let userId = args[0];

    if (targetMember) {
      targetUser = targetMember.user;
      userId = targetMember.id;

      // Only check role hierarchy if user is in server
      if (!canModerate(message.member, targetMember)) {
        return message.reply({ embeds: [new EmbedBuilder()
          .setColor(Theme.ErrorColor)
          .setDescription(`${Emojis.CROSS} Cannot ban this member (higher or equal role)`)
        ]});
      }

      if (!canModerate(message.guild.members.me!, targetMember)) {
        return message.reply({ embeds: [new EmbedBuilder()
          .setColor(Theme.ErrorColor)
          .setDescription(`${Emojis.CROSS} I cannot ban this member (higher or equal role)`)
        ]});
      }
    } else {
      // Try to fetch user by ID for hackban
      if (message.mentions.users.first()) {
        targetUser = message.mentions.users.first()!;
        userId = targetUser.id;
      } else {
        try {
          targetUser = await message.client.users.fetch(userId);
        } catch (error) {
          return message.reply({ embeds: [new EmbedBuilder()
            .setColor(Theme.ErrorColor)
            .setDescription(`${Emojis.CROSS} Please provide a valid user mention or ID`)
          ]});
        }
      }
    }

    const reason = args.slice(1).join(' ') || 'No reason provided';

    const caseId = await createModCase(message.guild.id, {
      action: 'ban',
      targetId: userId,
      targetTag: targetUser.tag,
      moderatorId: message.author.id,
      moderatorTag: message.author.tag,
      reason
    });

    // Try to DM user if they're in server
    if (targetMember) {
      try {
        const dmEmbed = createDMEmbed('ban', message.guild, reason);
        await targetMember.send({ embeds: [dmEmbed] });
      } catch (error) {}
    }

    try {
      await message.guild.members.ban(userId, { reason });
    } catch (error) {
      return message.reply({ embeds: [new EmbedBuilder()
        .setColor(Theme.ErrorColor)
        .setDescription(`${Emojis.CROSS} Failed to ban user`)
      ]});
    }

    const embed = createModEmbed('ban', targetUser, message.author, reason, caseId);
    await message.reply({ embeds: [embed] });
  }
};