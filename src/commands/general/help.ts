import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, Message, ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ComponentType } from 'discord.js';
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

// Create main help embed with category overview
function createMainHelpEmbed(categorizedCommands: Map<string, any[]>): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setColor(Theme.PrimaryColor)
    .setTitle(`${Emojis.INFO} Bot Command Help`)
    .setDescription(`Welcome to the help menu! Select a category from the dropdown below to view commands.\n\n**Available Categories:**`);

  let totalCommands = 0;
  
  for (const [category, commands] of categorizedCommands) {
    totalCommands += commands.length;
    embed.addFields({
      name: `${category}`,
      value: `${commands.length} commands`,
      inline: true
    });
  }

  embed.addFields({
    name: '\u200B',
    value: `**Total Commands:** ${totalCommands}\n\n📖 **How to use:**\n• Select a category from the dropdown menu below\n• Use \`!help <command>\` for specific command info\n• Commands support both \`!\` and \`/\` prefixes`,
    inline: false
  });

  embed.setFooter({ text: 'Bot created by Exe Team' });
  embed.setTimestamp();

  return embed;
}

// Create dropdown menu for categories
function createCategorySelectMenu(categorizedCommands: Map<string, any[]>): ActionRowBuilder<StringSelectMenuBuilder> {
  const options = [];
  
  for (const [category, commands] of categorizedCommands) {
    options.push(
      new StringSelectMenuOptionBuilder()
        .setLabel(category)
        .setDescription(`View ${commands.length} commands in ${category}`)
        .setValue(category.toLowerCase().replace(/\s+/g, '_'))
    );
  }

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId('help_category_select')
    .setPlaceholder('Select a category to view commands')
    .addOptions(options);

  return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);
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

    // Show all commands grouped by category with dropdown
    const categorized = groupCommandsByCategory(commands);
    const response = await interaction.reply({
      embeds: [createMainHelpEmbed(categorized)],
      components: [createCategorySelectMenu(categorized)],
      ephemeral: true
    });

    // Create collector for dropdown interactions
    const collector = response.createMessageComponentCollector({
      componentType: ComponentType.StringSelect,
      time: 300000 // 5 minutes
    });

    collector.on('collect', async (selectInteraction) => {
      if (selectInteraction.user.id !== interaction.user.id) {
        return selectInteraction.reply({
          content: 'This menu is not for you!',
          ephemeral: true
        });
      }

      const selectedCategory = selectInteraction.values[0];
      // Find the actual category name
      let actualCategory = '';
      for (const [cat] of categorized) {
        if (cat.toLowerCase().replace(/\s+/g, '_') === selectedCategory) {
          actualCategory = cat;
          break;
        }
      }

      if (actualCategory && categorized.has(actualCategory)) {
        const categoryCommands = categorized.get(actualCategory)!;
        await selectInteraction.update({
          embeds: [createCategoryEmbed(actualCategory, categoryCommands)],
          components: [createCategorySelectMenu(categorized)]
        });
      }
    });

    collector.on('end', () => {
      // Disable the select menu after timeout
      interaction.editReply({
        components: []
      }).catch(() => {});
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
