import { Message, EmbedBuilder, PermissionFlagsBits, ChannelType } from 'discord.js';
import { Theme } from '../../utils/theme';
import { Emojis } from '../../utils/emojis';

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
  data: {
    name: 'cleanup',
    description: 'Advanced cleanup commands',
    category: 'purge',
    syntax: '!cleanup <thread|voice>',
    example: '!cleanup thread 123456789',
    permissions: ['ManageMessages']
  },

  async prefixRun(message: Message, args: string[]) {
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