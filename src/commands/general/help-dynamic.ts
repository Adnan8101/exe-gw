import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, Message } from 'discord.js';
import { Theme } from '../../utils/theme';
import { Emojis } from '../../utils/emojis';
import * as fs from 'fs';
import * as path from 'path';

interface CommandMetadata {
  syntax: string;
  example: string;
  permissions: string;
  category: string;
}

interface CommandData {
  name: string;
  description: string;
  metadata?: CommandMetadata;
}

// Load all commands dynamically
function loadAllCommands(): Map<string, any> {
  const commands = new Map();
  const commandsPath = path.join(__dirname, '..');
  const categories = fs.readdirSync(commandsPath).filter(file => 
    fs.statSync(path.join(commandsPath, file)).isDirectory()
  );

  for (const category of categories) {
    const categoryPath = path.join(commandsPath, category);
    const files = fs.readdirSync(categoryPath).filter(file => 
      file.endsWith('.ts') || file.endsWith('.js')
    );

    for (const file of files) {
      try {
        const filePath = path.join(categoryPath, file);
        const command = require(filePath);
        const cmd = command.default || command;
        
        if (cmd.data && cmd.data.name) {
          commands.set(cmd.data.name, cmd);
        }
      } catch (error) {
        // Silently skip files that can't be loaded
      }
    }
  }

  return commands;
}

// Group commands by category
function groupCommandsByCategory(commands: Map<string, any>): Map<string, any[]> {
  const grouped = new Map<string, any[]>();

  for (const [name, cmd] of commands) {
    const category = cmd.metadata?.category || cmd.data.category || 'Other';
    
    if (!grouped.has(category)) {
      grouped.set(category, []);
    }
    
    grouped.get(category)!.push({
      name: cmd.data.name,
      description: cmd.data.description,
      metadata: cmd.metadata
    });
  }

  return grouped;
}

// Create embed for a specific command
function createCommandEmbed(commandData: CommandData): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setColor(Theme.PrimaryColor)
    .setTitle(`${Emojis.INFO} Command: ${commandData.name}`)
    .setDescription(commandData.description);

  if (commandData.metadata) {
    embed.addFields(
      { name: '📝 Syntax', value: `\`${commandData.metadata.syntax}\``, inline: false },
      { name: '📚 Example', value: `\`${commandData.metadata.example}\``, inline: false },
      { name: '🔐 Permission', value: commandData.metadata.permissions, inline: true },
      { name: '📁 Category', value: commandData.metadata.category, inline: true }
    );
  }

  embed.setFooter({ text: 'Use !help to see all commands' });
  embed.setTimestamp();

  return embed;
}

// Create category overview embed
function createCategoryEmbed(category: string, commands: any[]): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setColor(Theme.PrimaryColor)
    .setTitle(`${Emojis.INFO} ${category} Commands`)
    .setDescription(`Total commands: **${commands.length}**\n\nUse \`!help <command>\` for detailed information about a specific command.`);

  // Group into fields (max 25 fields, max 10 commands per field)
  const chunked = [];
  for (let i = 0; i < commands.length; i += 10) {
    chunked.push(commands.slice(i, i + 10));
  }

  chunked.forEach((chunk, index) => {
    const cmdList = chunk.map(cmd => `\`${cmd.name}\` - ${cmd.description}`).join('\n');
    embed.addFields({
      name: chunked.length > 1 ? `Commands (${index + 1}/${chunked.length})` : 'Commands',
      value: cmdList,
      inline: false
    });
  });

  embed.setFooter({ text: `Category: ${category} | Use !help <command> for details` });
  embed.setTimestamp();

  return embed;
}

// Create main help embed
function createMainHelpEmbed(categorizedCommands: Map<string, any[]>): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setColor(Theme.PrimaryColor)
    .setTitle(`${Emojis.INFO} Bot Command Help`)
    .setDescription(`Welcome to the help menu! Here are all available command categories.\n\nUse \`!help <command>\` to see details about a specific command.`);

  let totalCommands = 0;
  
  for (const [category, commands] of categorizedCommands) {
    totalCommands += commands.length;
    const commandNames = commands.slice(0, 8).map(c => `\`${c.name}\``).join(', ');
    const more = commands.length > 8 ? `\n+${commands.length - 8} more...` : '';
    
    embed.addFields({
      name: `${category} (${commands.length} commands)`,
      value: commandNames + more,
      inline: false
    });
  }

  embed.addFields({
    name: '\u200B',
    value: `**Total Commands:** ${totalCommands}\n\n📖 **Quick Start:**\n• \`!help <command>\` - View specific command info\n• Commands support both \`!\` and \`/\` prefixes`,
    inline: false
  });

  embed.setFooter({ text: 'Bot created by Exe Team' });
  embed.setTimestamp();

  return embed;
}

export default {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Shows help for commands')
    .addStringOption(option =>
      option
        .setName('command')
        .setDescription('Specific command to get help for')
        .setRequired(false)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const commandName = interaction.options.getString('command');
    const commands = loadAllCommands();

    if (commandName) {
      // Show specific command help
      const command = commands.get(commandName.toLowerCase());
      
      if (!command) {
        return interaction.reply({
          embeds: [new EmbedBuilder()
            .setColor(Theme.ErrorColor)
            .setDescription(`${Emojis.CROSS} Command \`${commandName}\` not found.`)
          ],
          ephemeral: true
        });
      }

      const commandData: CommandData = {
        name: command.data.name,
        description: command.data.description,
        metadata: command.metadata
      };

      return interaction.reply({
        embeds: [createCommandEmbed(commandData)],
        ephemeral: true
      });
    }

    // Show all commands grouped by category
    const categorized = groupCommandsByCategory(commands);
    return interaction.reply({
      embeds: [createMainHelpEmbed(categorized)],
      ephemeral: true
    });
  },

  async prefixRun(message: Message, args: string[]) {
    const commands = loadAllCommands();

    if (args.length > 0) {
      const commandName = args[0].toLowerCase();
      const command = commands.get(commandName);

      if (!command) {
        return message.reply({
          embeds: [new EmbedBuilder()
            .setColor(Theme.ErrorColor)
            .setDescription(`${Emojis.CROSS} Command \`${commandName}\` not found. Use \`!help\` to see all commands.`)
          ]
        });
      }

      const commandData: CommandData = {
        name: command.data.name,
        description: command.data.description,
        metadata: command.metadata
      };

      return message.reply({
        embeds: [createCommandEmbed(commandData)]
      });
    }

    // Show all commands grouped by category
    const categorized = groupCommandsByCategory(commands);
    return message.reply({
      embeds: [createMainHelpEmbed(categorized)]
    });
  }
};
