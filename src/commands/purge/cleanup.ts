import { Message, EmbedBuilder, PermissionFlagsBits, ChannelType, SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { Theme } from '../../utils/theme';
import { Emojis } from '../../utils/emojis';
import { createMissingArgsEmbed } from '../../utils/commandHelp';

async function handleThreadCleanup(message: Message, args: string[]) {
  const threadId = args[1];
  
  if (!threadId) {
    return message.reply({ embeds: [new EmbedBuilder()
      .setColor(Theme.ErrorColor)
      .setDescription(`${Emojis.CROSS} Please provide a thread ID`)
    ]});
  }

  try {
    const thread = await message.guild!.channels.fetch(threadId);
    
    if (!thread || !thread.isThread()) {
      return message.reply({ embeds: [new EmbedBuilder()
        .setColor(Theme.ErrorColor)
        .setDescription(`${Emojis.CROSS} Invalid thread`)
      ]});
    }

    await thread.delete();
    
    const embed = new EmbedBuilder()
      .setColor(Theme.SuccessColor)
      .setDescription(`${Emojis.TICK} Thread deleted`)
      .setFooter({ text: `By ${message.author.tag}` })
      .setTimestamp();
    
    await message.reply({ embeds: [embed] });
  } catch (error) {
    return message.reply({ embeds: [new EmbedBuilder()
      .setColor(Theme.ErrorColor)
      .setDescription(`${Emojis.CROSS} Failed to delete thread`)
    ]});
  }
}

async function handleVoiceTextCleanup(message: Message) {
  try {
    const channels = message.guild!.channels.cache.filter(
      c => c.type === ChannelType.GuildText && c.name.includes('voice-')
    );

    let deletedCount = 0;
    
    for (const [, channel] of channels) {
      if (channel.type === ChannelType.GuildText) {
        try {
          await channel.delete();
          deletedCount++;
        } catch (error) {
          // Continue on error
        }
      }
    }
    
    const embed = new EmbedBuilder()
      .setColor(Theme.SuccessColor)
      .setDescription(`${Emojis.TICK} Deleted **${deletedCount}** voice text channels`)
      .setFooter({ text: `By ${message.author.tag}` })
      .setTimestamp();
    
    await message.reply({ embeds: [embed] });
  } catch (error) {
    return message.reply({ embeds: [new EmbedBuilder()
      .setColor(Theme.ErrorColor)
      .setDescription(`${Emojis.CROSS} Failed to cleanup channels`)
    ]});
  }
}

export default {
  data: new SlashCommandBuilder()
    .setName('cleanup')
    .setDescription('Advanced cleanup commands')
    .addStringOption(option => option.setName('target').setDescription('Channel ID or "all" for all threads').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
  
  metadata: {
    syntax: '!cleanup <thread_id|all>',
    example: '!cleanup all',
    permissions: 'Manage Messages',
    category: 'Purge'
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
      return message.reply({ embeds: [createMissingArgsEmbed(this.data as any, 'thread ID or "all"')] });
    }

    if (!message.guild || !message.member) return;

    if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
      return message.reply({ embeds: [new EmbedBuilder()
        .setColor(Theme.ErrorColor)
        .setDescription(`${Emojis.CROSS} You need **Manage Messages** permission`)
      ]});
    }

    const subcommand = args[0]?.toLowerCase();

    switch (subcommand) {
      case 'thread':
        return handleThreadCleanup(message, args);
      case 'voice':
        return handleVoiceTextCleanup(message);
      default:
        return message.reply({ embeds: [new EmbedBuilder()
          .setColor(Theme.ErrorColor)
          .setDescription(`${Emojis.CROSS} Invalid subcommand. Use: thread or voice`)
        ]});
    }
  }
};