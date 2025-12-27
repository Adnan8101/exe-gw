import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, Message, ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ComponentType, ButtonBuilder, ButtonStyle } from 'discord.js';
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

// Create category overview embed with pagination
function createCategoryEmbed(category: string, commands: any[], page: number = 0): { embed: EmbedBuilder, totalPages: number } {
  const commandsPerPage = 8;
  const totalPages = Math.ceil(commands.length / commandsPerPage);
  const startIdx = page * commandsPerPage;
  const endIdx = startIdx + commandsPerPage;
  const pageCommands = commands.slice(startIdx, endIdx);

  const embed = new EmbedBuilder()
    .setColor(Theme.PrimaryColor)
    .setTitle(`${category} Commands`)
    .setDescription(`Showing ${startIdx + 1}-${Math.min(endIdx, commands.length)} of ${commands.length} commands\n\nUse \`!help <command>\` for detailed information.`);

  const cmdList = pageCommands.map(cmd => `**${cmd.name}**\n\`${cmd.description}\``).join('\n\n');
  
  embed.addFields({
    name: '\u200B',
    value: cmdList || 'No commands found',
    inline: false
  });

  embed.setFooter({ text: `Category: ${category} | Page ${page + 1}/${totalPages}` });
  embed.setTimestamp();

  return { embed, totalPages };
}

// Create main help embed with category overview
function createMainHelpEmbed(categorizedCommands: Map<string, any[]>): EmbedBuilder {
  const categoryOrder = ['Moderation', 'Giveaways', 'Purge', 'Role Management', 'Channel Management', 'General'];
  const embed = new EmbedBuilder()
    .setColor(Theme.PrimaryColor)
    .setTitle('Bot Command Help')
    .setDescription('Welcome to the help menu! Select a category from the dropdown below to view commands.');

  let totalCommands = 0;
  const categoryFields: Array<{ category: string, count: number }> = [];
  
  // Collect all categories
  for (const [category, commands] of categorizedCommands) {
    totalCommands += commands.length;
    categoryFields.push({ category, count: commands.length });
  }

  // Sort by custom order
  categoryFields.sort((a, b) => {
    const aIndex = categoryOrder.indexOf(a.category);
    const bIndex = categoryOrder.indexOf(b.category);
    if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
    if (aIndex !== -1) return -1;
    if (bIndex !== -1) return 1;
    return a.category.localeCompare(b.category);
  });

  // Add category list
  let categoryList = '';
  for (const { category, count } of categoryFields) {
    categoryList += `**${category}**\n${count} commands\n\n`;
  }

  embed.addFields({
    name: 'Available Categories',
    value: categoryList,
    inline: false
  });

  embed.addFields({
    name: 'How to use',
    value: `• Select a category from the dropdown menu below\n• Use \`!help <command>\` for specific command info\n• Commands support both \`!\` and \`/\` prefixes\n\n**Total Commands:** ${totalCommands}`,
    inline: false
  });

  embed.setFooter({ text: 'Bot created by Exe Team' });
  embed.setTimestamp();

  return embed;
}

// Create dropdown menu for categories
function createCategorySelectMenu(categorizedCommands: Map<string, any[]>): ActionRowBuilder<StringSelectMenuBuilder> {
  const categoryOrder = ['Moderation', 'Giveaways', 'Purge', 'Role Management', 'Channel Management', 'General'];
  const options: StringSelectMenuOptionBuilder[] = [];
  
  // Add "All Categories" option first
  let totalCommands = 0;
  for (const [, commands] of categorizedCommands) {
    totalCommands += commands.length;
  }
  
  options.push(
    new StringSelectMenuOptionBuilder()
      .setLabel('All Categories')
      .setDescription(`View all ${totalCommands} commands`)
      .setValue('all_categories')
  );
  
  // Sort categories
  const sortedCategories = Array.from(categorizedCommands.entries()).sort((a, b) => {
    const aIndex = categoryOrder.indexOf(a[0]);
    const bIndex = categoryOrder.indexOf(b[0]);
    if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
    if (aIndex !== -1) return -1;
    if (bIndex !== -1) return 1;
    return a[0].localeCompare(b[0]);
  });

  for (const [category, commands] of sortedCategories) {
    options.push(
      new StringSelectMenuOptionBuilder()
        .setLabel(category)
        .setDescription(`View ${commands.length} commands`)
        .setValue(category.toLowerCase().replace(/\s+/g, '_'))
    );
  }

  // Ensure we have at least one option
  if (options.length === 0) {
    options.push(
      new StringSelectMenuOptionBuilder()
        .setLabel('No categories')
        .setDescription('No commands available')
        .setValue('none')
    );
  }

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId('help_category_select')
    .setPlaceholder('Select a category to view commands')
    .addOptions(options);

  return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);
}

// Create pagination buttons
function createPaginationButtons(currentPage: number, totalPages: number): ActionRowBuilder<ButtonBuilder> {
  const row = new ActionRowBuilder<ButtonBuilder>();

  row.addComponents(
    new ButtonBuilder()
      .setCustomId('help_first')
      .setLabel('First')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(currentPage === 0),
    new ButtonBuilder()
      .setCustomId('help_prev')
      .setLabel('Previous')
      .setStyle(ButtonStyle.Primary)
      .setDisabled(currentPage === 0),
    new ButtonBuilder()
      .setCustomId('help_next')
      .setLabel('Next')
      .setStyle(ButtonStyle.Primary)
      .setDisabled(currentPage >= totalPages - 1),
    new ButtonBuilder()
      .setCustomId('help_last')
      .setLabel('Last')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(currentPage >= totalPages - 1),
    new ButtonBuilder()
      .setCustomId('help_back')
      .setLabel('Back to Menu')
      .setStyle(ButtonStyle.Danger)
  );

  return row;
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
    await interaction.reply({
      embeds: [createMainHelpEmbed(categorized)],
      components: [createCategorySelectMenu(categorized)],
      ephemeral: true,
      fetchReply: true
    });

    // Store current state
    const state = {
      currentCategory: '',
      currentPage: 0
    };

    // Create collector for all component interactions
    const collector = interaction.channel!.createMessageComponentCollector({
      filter: (i) => i.user.id === interaction.user.id,
      time: 300000 // 5 minutes
    });

    collector.on('collect', async (componentInteraction) => {
      if (componentInteraction.user.id !== interaction.user.id) {
        return componentInteraction.reply({
          content: 'This menu is not for you!',
          ephemeral: true
        });
      }

      if (componentInteraction.isStringSelectMenu()) {
        const selectedCategory = componentInteraction.values[0];
        
        // Handle "All Categories" option
        if (selectedCategory === 'all_categories') {
          await componentInteraction.update({
            embeds: [createMainHelpEmbed(categorized)],
            components: [createCategorySelectMenu(categorized)]
          });
          return;
        }
        
        // Find the actual category name
        let actualCategory = '';
        for (const [cat] of categorized) {
          if (cat.toLowerCase().replace(/\s+/g, '_') === selectedCategory) {
            actualCategory = cat;
            break;
          }
        }

        if (actualCategory && categorized.has(actualCategory)) {
          state.currentCategory = actualCategory;
          state.currentPage = 0;
          
          const categoryCommands = categorized.get(actualCategory)!;
          const { embed, totalPages } = createCategoryEmbed(actualCategory, categoryCommands, 0);
          
          const components: any[] = [createCategorySelectMenu(categorized)];
          if (totalPages > 1) {
            components.push(createPaginationButtons(0, totalPages));
          }
          
          await componentInteraction.update({
            embeds: [embed],
            components
          });
        }
      } else if (componentInteraction.isButton()) {
        if (componentInteraction.customId === 'help_back') {
          await componentInteraction.update({
            embeds: [createMainHelpEmbed(categorized)],
            components: [createCategorySelectMenu(categorized)]
          });
        } else if (state.currentCategory && categorized.has(state.currentCategory)) {
          const categoryCommands = categorized.get(state.currentCategory)!;
          const totalPages = Math.ceil(categoryCommands.length / 8);
          
          switch (componentInteraction.customId) {
            case 'help_first':
              state.currentPage = 0;
              break;
            case 'help_prev':
              state.currentPage = Math.max(0, state.currentPage - 1);
              break;
            case 'help_next':
              state.currentPage = Math.min(totalPages - 1, state.currentPage + 1);
              break;
            case 'help_last':
              state.currentPage = totalPages - 1;
              break;
          }
          
          const { embed } = createCategoryEmbed(state.currentCategory, categoryCommands, state.currentPage);
          
          await componentInteraction.update({
            embeds: [embed],
            components: [
              createCategorySelectMenu(categorized),
              createPaginationButtons(state.currentPage, totalPages)
            ]
          });
        }
      }
    });

    collector.on('end', () => {
      // Disable the components after timeout
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

    // Show all commands grouped by category with dropdown
    const categorized = groupCommandsByCategory(commands);
    const reply = await message.reply({
      embeds: [createMainHelpEmbed(categorized)],
      components: [createCategorySelectMenu(categorized)]
    });

    // Store current state
    const state = {
      currentCategory: '',
      currentPage: 0
    };

    // Create collector for all component interactions
    const collector = reply.createMessageComponentCollector({
      filter: (i) => i.user.id === message.author.id,
      time: 300000 // 5 minutes
    });

    collector.on('collect', async (componentInteraction) => {
      if (componentInteraction.isStringSelectMenu()) {
        const selectedCategory = componentInteraction.values[0];
        
        // Handle "All Categories" option
        if (selectedCategory === 'all_categories') {
          await componentInteraction.update({
            embeds: [createMainHelpEmbed(categorized)],
            components: [createCategorySelectMenu(categorized)]
          });
          return;
        }
        
        // Find the actual category name
        let actualCategory = '';
        for (const [cat] of categorized) {
          if (cat.toLowerCase().replace(/\s+/g, '_') === selectedCategory) {
            actualCategory = cat;
            break;
          }
        }

        if (actualCategory && categorized.has(actualCategory)) {
          state.currentCategory = actualCategory;
          state.currentPage = 0;
          
          const categoryCommands = categorized.get(actualCategory)!;
          const { embed, totalPages } = createCategoryEmbed(actualCategory, categoryCommands, 0);
          
          const components: any[] = [createCategorySelectMenu(categorized)];
          if (totalPages > 1) {
            components.push(createPaginationButtons(0, totalPages));
          }
          
          await componentInteraction.update({
            embeds: [embed],
            components
          });
        }
      } else if (componentInteraction.isButton()) {
        if (componentInteraction.customId === 'help_back') {
          await componentInteraction.update({
            embeds: [createMainHelpEmbed(categorized)],
            components: [createCategorySelectMenu(categorized)]
          });
        } else if (state.currentCategory && categorized.has(state.currentCategory)) {
          const categoryCommands = categorized.get(state.currentCategory)!;
          const totalPages = Math.ceil(categoryCommands.length / 8);
          
          switch (componentInteraction.customId) {
            case 'help_first':
              state.currentPage = 0;
              break;
            case 'help_prev':
              state.currentPage = Math.max(0, state.currentPage - 1);
              break;
            case 'help_next':
              state.currentPage = Math.min(totalPages - 1, state.currentPage + 1);
              break;
            case 'help_last':
              state.currentPage = totalPages - 1;
              break;
          }
          
          const { embed } = createCategoryEmbed(state.currentCategory, categoryCommands, state.currentPage);
          
          await componentInteraction.update({
            embeds: [embed],
            components: [
              createCategorySelectMenu(categorized),
              createPaginationButtons(state.currentPage, totalPages)
            ]
          });
        }
      }
    });

    collector.on('end', () => {
      // Disable the components after timeout
      reply.edit({
        components: []
      }).catch(() => {});
    });
  }
};
