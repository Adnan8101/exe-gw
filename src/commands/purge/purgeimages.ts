import { Message, EmbedBuilder, PermissionFlagsBits, TextChannel } from 'discord.js';
import { Theme } from '../../utils/theme';
import { Emojis } from '../../utils/emojis';

export default {
  data: {
    name: 'purgeimages',
    description: 'Delete messages containing images',
    syntax: '!purgeimages [amount]',
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
      const imageMessages = messages.filter(m => 
        m.attachments.size > 0 || 
        /\.(gif|jpe?g|tiff?|png|webp|bmp)$/i.test(m.content)
      ).first(amount);
      
      await message.delete();
      const deleted = await channel.bulkDelete(imageMessages, true);
      
      const reply = await channel.send({ embeds: [new EmbedBuilder()
        .setColor(Theme.SuccessColor)
        .setDescription(`${Emojis.TICK} Deleted **${deleted.size}** messages with images`)
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
