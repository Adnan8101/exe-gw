const fs = require('fs');
const path = require('path');

const commandDirs = [
  'src/commands/purge',
  'src/commands/moderation',
  'src/commands/roles',
  'src/commands/channel'
];

// Conversion templates based on command type
const conversionTemplates = {
  // Simple purge commands with amount parameter
  purgeSimple: (commandName, description, filterLogic) => `import { Message, EmbedBuilder, PermissionFlagsBits, TextChannel, ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { Theme } from '../../utils/theme';
import { Emojis } from '../../utils/emojis';

async function execute${commandName}(
  guild: any,
  member: any,
  channel: TextChannel,
  amount: number,
  replyFn: (options: any) => Promise<any>
) {
  if (!member.permissions.has(PermissionFlagsBits.ManageMessages)) {
    return replyFn({ embeds: [new EmbedBuilder()
      .setColor(Theme.ErrorColor)
      .setDescription(\`\${Emojis.CROSS} You need **Manage Messages** permission to use this command\`)
    ]});
  }

  if (!guild.members.me?.permissions.has(PermissionFlagsBits.ManageMessages)) {
    return replyFn({ embeds: [new EmbedBuilder()
      .setColor(Theme.ErrorColor)
      .setDescription(\`\${Emojis.CROSS} I need **Manage Messages** permission to execute this command\`)
    ]});
  }

  if (amount < 1 || amount > 100) {
    return replyFn({ embeds: [new EmbedBuilder()
      .setColor(Theme.ErrorColor)
      .setDescription(\`\${Emojis.CROSS} Please provide a number between 1 and 100\`)
    ]});
  }

  try {
    const messages = await channel.messages.fetch({ limit: 100 });
    ${filterLogic}
    
    await channel.bulkDelete(filtered, true);
    
    const reply = await channel.send({ embeds: [new EmbedBuilder()
      .setColor(Theme.SuccessColor)
      .setDescription(\`\${Emojis.TICK} Deleted **\${filtered.size}** messages\`)
    ]});

    setTimeout(() => reply.delete().catch(() => {}), 3000);
  } catch (error) {
    return replyFn({ embeds: [new EmbedBuilder()
      .setColor(Theme.ErrorColor)
      .setDescription(\`\${Emojis.CROSS} Failed to delete messages\`)
    ]});
  }
}

export default {
  data: new SlashCommandBuilder()
    .setName('${commandName.toLowerCase()}')
    .setDescription('${description}')
    .addIntegerOption(option =>
      option.setName('amount')
        .setDescription('Number of messages to process (1-100)')
        .setMinValue(1)
        .setMaxValue(100)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild || !interaction.member || !interaction.channel) return;
    if (!interaction.channel.isTextBased() || interaction.channel.isDMBased()) {
      return interaction.reply({ 
        embeds: [new EmbedBuilder()
          .setColor(Theme.ErrorColor)
          .setDescription(\`\${Emojis.CROSS} This command can only be used in text channels\`)
        ],
        ephemeral: true
      });
    }

    const amount = interaction.options.getInteger('amount') || 100;
    
    await execute${commandName}(
      interaction.guild,
      interaction.member,
      interaction.channel as TextChannel,
      amount,
      (options) => interaction.reply({ ...options, ephemeral: true })
    );
  },

  async prefixRun(message: Message, args: string[]) {
    if (!message.guild || !message.member || !message.channel.isTextBased() || message.channel.isDMBased()) return;

    const amount = parseInt(args[0]) || 100;
    
    await execute${commandName}(
      message.guild,
      message.member,
      message.channel as TextChannel,
      amount,
      (options) => message.reply(options)
    );
  }
};
`
};

// Convert files
console.log('Starting conversion...');

// For now, let's just print what we would do
console.log('Would convert files in:', commandDirs);
console.log('Run this script to batch convert all commands to hybrid slash/prefix format');
