import { Message, EmbedBuilder, PermissionFlagsBits, TextChannel } from 'discord.js';
import { Theme } from '../../utils/theme';
import { Emojis } from '../../utils/emojis';

export default {
  data: {
    name: 'purgebefore',
    description: 'Delete messages before a specific message',
    syntax: '!purgebefore <message_id>',
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
    const messageId = args[0];

    if (!messageId) {
      return message.reply({ embeds: [new EmbedBuilder()
        .setColor(Theme.ErrorColor)
        .setDescription(`${Emojis.CROSS} Please provide a message ID`)
      ]});
    }

    try {
      const messages = await channel.messages.fetch({ before: messageId, limit: 100 });
      
      await message.delete();
      const deleted = await channel.bulkDelete(messages, true);
      
      const reply = await channel.send({ embeds: [new EmbedBuilder()
        .setColor(Theme.SuccessColor)
        .setDescription(`${Emojis.TICK} Deleted **${deleted.size}** messages before the specified message`)
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
