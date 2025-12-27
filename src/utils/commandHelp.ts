import { EmbedBuilder, Message } from 'discord.js';
import { Theme } from './theme';
import { Emojis } from './emojis';

interface CommandData {
  name: string;
  description: string;
  metadata?: {
    syntax: string;
    example: string;
    permissions: string;
    category: string;
  };
}

export function showCommandHelp(message: Message, commandData: CommandData) {
  const embed = new EmbedBuilder()
    .setColor(Theme.PrimaryColor)
    .setTitle(`${Emojis.INFO} Command Help: ${commandData.name}`)
    .setDescription(commandData.description);

  if (commandData.metadata) {
    embed.addFields(
      { name: '📝 Syntax', value: `\`${commandData.metadata.syntax}\``, inline: false },
      { name: '📚 Example', value: `\`${commandData.metadata.example}\``, inline: false },
      { name: '🔐 Permission Required', value: commandData.metadata.permissions, inline: true },
      { name: '📁 Category', value: commandData.metadata.category, inline: true }
    );
  }

  embed.setFooter({ text: 'Use !help <command> for more commands' });

  return message.reply({ embeds: [embed] });
}

export function createMissingArgsEmbed(commandData: CommandData, missingArg: string) {
  const embed = new EmbedBuilder()
    .setColor(Theme.ErrorColor)
    .setDescription(`${Emojis.CROSS} You need to provide: **${missingArg}**`);

  if (commandData.metadata) {
    embed.addFields(
      { name: 'Syntax', value: `\`${commandData.metadata.syntax}\``, inline: false },
      { name: 'Example', value: `\`${commandData.metadata.example}\``, inline: false }
    );
  }

  return embed;
}

export function createCommandHelpEmbed(commandData: CommandData) {
  const embed = new EmbedBuilder()
    .setColor(Theme.PrimaryColor)
    .setTitle(`Command: ${commandData.name}`)
    .setDescription(commandData.description);

  if (commandData.metadata) {
    embed.addFields(
      { name: 'Syntax', value: `\`${commandData.metadata.syntax}\``, inline: false },
      { name: 'Example', value: `\`${commandData.metadata.example}\``, inline: false },
      { name: 'Permission', value: commandData.metadata.permissions, inline: true },
      { name: 'Category', value: commandData.metadata.category, inline: true }
    );
  }

  embed.setFooter({ text: 'Use !help to see all commands' });
  embed.setTimestamp();

  return embed;
}
