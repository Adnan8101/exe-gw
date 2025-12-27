import { Message, EmbedBuilder, PermissionFlagsBits, TextChannel, ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { Theme } from '../../utils/theme';
import { Emojis } from '../../utils/emojis';
import { createMissingArgsEmbed } from '../../utils/commandHelp';

async function executePurge(
  guild: any,
  member: any,
  channel: TextChannel,
  amount: number,
  replyFn: (options: any) => Promise<any>
) {
  if (!member.permissions.has(PermissionFlagsBits.ManageMessages)) {
    return replyFn({ embeds: [new EmbedBuilder()
      .setColor(Theme.ErrorColor)
      .setDescription(`${Emojis.CROSS} You need **Manage Messages** permission to use this command`)
    ]});
  }

  if (!guild.members.me?.permissions.has(PermissionFlagsBits.ManageMessages)) {
    return replyFn({ embeds: [new EmbedBuilder()
      .setColor(Theme.ErrorColor)
      .setDescription(`${Emojis.CROSS} I need **Manage Messages** permission to execute this command`)
    ]});
  }

  if (isNaN(amount) || amount < 1 || amount > 100) {
    return replyFn({ embeds: [new EmbedBuilder()
      .setColor(Theme.ErrorColor)
      .setDescription(`${Emojis.CROSS} Please provide a number between 1 and 100`)
    ]});
  }

  try {
    const deleted = await channel.bulkDelete(amount + 1, true);
    
    const reply = await channel.send({ embeds: [new EmbedBuilder()
      .setColor(Theme.SuccessColor)
      .setDescription(`${Emojis.TICK} Deleted **${deleted.size - 1}** messages`)
    ]});

    setTimeout(() => reply.delete().catch(() => {}), 3000);
  } catch (error) {
    return replyFn({ embeds: [new EmbedBuilder()
      .setColor(Theme.ErrorColor)
      .setDescription(`${Emojis.CROSS} Failed to delete messages. Messages older than 14 days cannot be bulk deleted`)
    ]});
  }
}

export default {
  data: new SlashCommandBuilder()
    .setName('purge')
    .setDescription('Delete a specified number of messages')
    .addIntegerOption(option =>
      option.setName('amount')
        .setDescription('Number of messages to delete (1-100)')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(100)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
  
  metadata: {
    syntax: '!purge <amount>',
    example: '!purge 50',
    permissions: 'Manage Messages',
    category: 'Purge'
  },

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild || !interaction.member || !interaction.channel) return;

    if (!interaction.channel.isTextBased() || interaction.channel.isDMBased()) {
      return interaction.reply({ 
        embeds: [new EmbedBuilder()
          .setColor(Theme.ErrorColor)
          .setDescription(`${Emojis.CROSS} This command can only be used in text channels`)
        ],
        ephemeral: true
      });
    }

    const amount = interaction.options.getInteger('amount', true);
    
    await executePurge(
      interaction.guild,
      interaction.member,
      interaction.channel as TextChannel,
      amount,
      (options) => interaction.reply({ ...options, ephemeral: true })
    );
  },

  async prefixRun(message: Message, args: string[]) {
    if (!message.guild || !message.member) return;

    if (!message.channel.isTextBased() || message.channel.isDMBased()) {
      return message.reply({ embeds: [new EmbedBuilder()
        .setColor(Theme.ErrorColor)
        .setDescription(`${Emojis.CROSS} This command can only be used in text channels`)
      ]});
    }

    const amount = parseInt(args[0]);
    
    await executePurge(
      message.guild,
      message.member,
      message.channel as TextChannel,
      amount,
      (options) => message.reply(options)
    );
  }
};

