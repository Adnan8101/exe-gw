import { Message, EmbedBuilder, PermissionFlagsBits, TextChannel, ChannelType } from 'discord.js';
import { Theme } from '../../utils/theme';
import { Emojis } from '../../utils/emojis';

function parseTime(time: string): number | null {
  const regex = /^(\d+)([smh])$/;
  const match = time.match(regex);
  
  if (!match) return null;
  
  const value = parseInt(match[1]);
  const unit = match[2];
  
  const multipliers: { [key: string]: number } = {
    s: 1,
    m: 60,
    h: 3600
  };
  
  return value * multipliers[unit];
}

function formatTime(seconds: number): string {
  if (seconds >= 3600) {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  }
  if (seconds >= 60) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
  }
  return `${seconds}s`;
}

export default {
  data: {
    name: 'slowmode',
    description: 'Set or remove slowmode in a channel',
    category: 'channel',
    syntax: '!slowmode <time|off> [channel]',
    example: '!slowmode 10s',
    permissions: ['ManageChannels']
  },

  async prefixRun(message: Message, args: string[]) {
    if (!message.guild || !message.member) return;

    if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
      return message.reply({ embeds: [new EmbedBuilder()
        .setColor(Theme.ErrorColor)
        .setDescription(`${Emojis.CROSS} You need **Manage Channels** permission`)
      ]});
    }

    if (!message.guild.members.me?.permissions.has(PermissionFlagsBits.ManageChannels)) {
      return message.reply({ embeds: [new EmbedBuilder()
        .setColor(Theme.ErrorColor)
        .setDescription(`${Emojis.CROSS} I need **Manage Channels** permission`)
      ]});
    }

    const timeArg = args[0]?.toLowerCase();

    if (!timeArg) {
      return message.reply({ embeds: [new EmbedBuilder()
        .setColor(Theme.ErrorColor)
        .setDescription(`${Emojis.CROSS} Please specify a time (e.g., 5s, 1m) or "off"`)
      ]});
    }

    const channel = message.mentions.channels.first() || 
      (args[1] ? await message.guild.channels.fetch(args[1]).catch(() => null) : null) ||
      message.channel;

    if (!channel || channel.type !== ChannelType.GuildText) {
      return message.reply({ embeds: [new EmbedBuilder()
        .setColor(Theme.ErrorColor)
        .setDescription(`${Emojis.CROSS} Invalid text channel`)
      ]});
    }

    if (timeArg === 'off') {
      try {
        await (channel as TextChannel).setRateLimitPerUser(0);
        
        const embed = new EmbedBuilder()
          .setColor(Theme.SuccessColor)
          .setDescription(`${Emojis.TICK} Slowmode disabled in ${channel}`)
          .setFooter({ text: `By ${message.author.tag}` })
          .setTimestamp();

        return message.reply({ embeds: [embed] });
      } catch (error) {
        return message.reply({ embeds: [new EmbedBuilder()
          .setColor(Theme.ErrorColor)
          .setDescription(`${Emojis.CROSS} Failed to disable slowmode`)
        ]});
      }
    }

    const seconds = parseTime(timeArg);

    if (seconds === null || seconds < 0 || seconds > 21600) {
      return message.reply({ embeds: [new EmbedBuilder()
        .setColor(Theme.ErrorColor)
        .setDescription(`${Emojis.CROSS} Invalid time (must be 0s-6h)`)
      ]});
    }

    try {
      await (channel as TextChannel).setRateLimitPerUser(seconds);
      
      const embed = new EmbedBuilder()
        .setColor(Theme.SuccessColor)
        .setDescription(`${Emojis.TICK} Slowmode set to **${formatTime(seconds)}** in ${channel}`)
        .setFooter({ text: `Set by ${message.author.tag}` })
        .setTimestamp();

      await message.reply({ embeds: [embed] });
    } catch (error) {
      return message.reply({ embeds: [new EmbedBuilder()
        .setColor(Theme.ErrorColor)
        .setDescription(`${Emojis.CROSS} Failed to set slowmode`)
      ]});
    }
  }
};