import { Message, EmbedBuilder, PermissionFlagsBits, TextChannel } from 'discord.js';
import { Theme } from '../../utils/theme';
import { Emojis } from '../../utils/emojis';

export default {
  data: {
    name: 'purgeemojis',
    description: 'Delete messages containing emojis',
    syntax: '!purgeemojis [amount]',
    category: 'purge'
  },

  async prefixRun(message: Message, args: string[]) {
    if (!message.guild || !message.member) return;

    if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
      return message.reply({ embeds: [new EmbedBuilder()
        .setColor(Theme.ErrorColor)
        .setDescription(`${Emojis.CROSS} You need **Manage Messages** permission to use this command`)
      ]});
    }

    if (!message.guild.members.me?.permissions.has(PermissionFlagsBits.ManageMessages)) {
      return message.reply({ embeds: [new EmbedBuilder()
        .setColor(Theme.ErrorColor)
        .setDescription(`${Emojis.CROSS} I need **Manage Messages** permission to execute this command`)
      ]});
    }

    if (!message.channel.isTextBased() || message.channel.isDMBased()) {
      return message.reply({ embeds: [new EmbedBuilder()
        .setColor(Theme.ErrorColor)
        .setDescription(`${Emojis.CROSS} This command can only be used in text channels`)
      ]});
    }

    const channel = message.channel as TextChannel;
    const amount = parseInt(args[0]) || 100;

    if (amount < 1 || amount > 100) {
      return message.reply({ embeds: [new EmbedBuilder()
        .setColor(Theme.ErrorColor)
        .setDescription(`${Emojis.CROSS} Please provide a number between 1 and 100`)
      ]});
    }

    try {
      const messages = await channel.messages.fetch({ limit: 100 });
      const emojiRegex = /<a?:\w+:\d+>|[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu;
      const emojiMessages = messages.filter(m => emojiRegex.test(m.content)).first(amount);
      
      await message.delete();
      const deleted = await channel.bulkDelete(emojiMessages, true);
      
      const reply = await channel.send({ embeds: [new EmbedBuilder()
        .setColor(Theme.SuccessColor)
        .setDescription(`${Emojis.TICK} Deleted **${deleted.size}** messages with emojis`)
      ]});

      setTimeout(() => reply.delete().catch(() => {}), 3000);
    } catch (error) {
      return message.reply({ embeds: [new EmbedBuilder()
        .setColor(Theme.ErrorColor)
        .setDescription(`${Emojis.CROSS} Failed to delete messages`)
      ]});
    }
  }
};
