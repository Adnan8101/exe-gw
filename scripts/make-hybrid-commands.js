#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');

// Command definitions with their slash command options
const commandConfigs = {
  // Moderation commands
  'src/commands/moderation/kick.ts': {
    options: `.addUserOption(option => option.setName('user').setDescription('The user to kick').setRequired(true))
    .addStringOption(option => option.setName('reason').setDescription('Reason for the kick').setRequired(false))`,
    permissions: 'PermissionFlagsBits.KickMembers'
  },
  'src/commands/moderation/ban.ts': {
    options: `.addStringOption(option => option.setName('user').setDescription('The user ID or mention to ban').setRequired(true))
    .addStringOption(option => option.setName('reason').setDescription('Reason for the ban').setRequired(false))`,
    permissions: 'PermissionFlagsBits.BanMembers'
  },
  'src/commands/moderation/unban.ts': {
    options: `.addStringOption(option => option.setName('userid').setDescription('The user ID to unban').setRequired(true))`,
    permissions: 'PermissionFlagsBits.BanMembers'
  },
  'src/commands/moderation/softban.ts': {
    options: `.addUserOption(option => option.setName('user').setDescription('The user to softban').setRequired(true))
    .addStringOption(option => option.setName('reason').setDescription('Reason for the softban').setRequired(false))`,
    permissions: 'PermissionFlagsBits.BanMembers'
  },
  'src/commands/moderation/tempban.ts': {
    options: `.addUserOption(option => option.setName('user').setDescription('The user to temporarily ban').setRequired(true))
    .addStringOption(option => option.setName('duration').setDescription('Ban duration (e.g., 1h, 1d, 1w)').setRequired(true))
    .addStringOption(option => option.setName('reason').setDescription('Reason for the ban').setRequired(false))`,
    permissions: 'PermissionFlagsBits.BanMembers'
  },
  'src/commands/moderation/timeout.ts': {
    options: `.addUserOption(option => option.setName('user').setDescription('The user to timeout').setRequired(true))
    .addStringOption(option => option.setName('duration').setDescription('Timeout duration (e.g., 1m, 1h, 1d)').setRequired(true))
    .addStringOption(option => option.setName('reason').setDescription('Reason for the timeout').setRequired(false))`,
    permissions: 'PermissionFlagsBits.ModerateMembers'
  },
  'src/commands/moderation/untimeout.ts': {
    options: `.addUserOption(option => option.setName('user').setDescription('The user to remove timeout from').setRequired(true))`,
    permissions: 'PermissionFlagsBits.ModerateMembers'
  },
  'src/commands/moderation/warn.ts': {
    options: `.addUserOption(option => option.setName('user').setDescription('The user to warn').setRequired(true))
    .addStringOption(option => option.setName('reason').setDescription('Reason for the warning').setRequired(false))`,
    permissions: 'PermissionFlagsBits.ModerateMembers'
  },
  'src/commands/moderation/warnings.ts': {
    options: `.addUserOption(option => option.setName('user').setDescription('The user to view warnings for').setRequired(true))`,
    permissions: 'PermissionFlagsBits.ModerateMembers'
  },
  'src/commands/moderation/clearwarnings.ts': {
    options: `.addUserOption(option => option.setName('user').setDescription('The user to clear warnings for').setRequired(true))`,
    permissions: 'PermissionFlagsBits.ModerateMembers'
  },
  'src/commands/moderation/silentwarn.ts': {
    options: `.addUserOption(option => option.setName('user').setDescription('The user to silently warn').setRequired(true))
    .addStringOption(option => option.setName('reason').setDescription('Reason for the warning').setRequired(false))`,
    permissions: 'PermissionFlagsBits.ModerateMembers'
  },
  'src/commands/moderation/silentban.ts': {
    options: `.addUserOption(option => option.setName('user').setDescription('The user to silently ban').setRequired(true))
    .addStringOption(option => option.setName('reason').setDescription('Reason for the ban').setRequired(false))`,
    permissions: 'PermissionFlagsBits.BanMembers'
  },
  'src/commands/moderation/silentkick.ts': {
    options: `.addUserOption(option => option.setName('user').setDescription('The user to silently kick').setRequired(true))
    .addStringOption(option => option.setName('reason').setDescription('Reason for the kick').setRequired(false))`,
    permissions: 'PermissionFlagsBits.KickMembers'
  },
  'src/commands/moderation/modlogs.ts': {
    options: `.addUserOption(option => option.setName('user').setDescription('The user to view mod logs for').setRequired(true))`,
    permissions: 'PermissionFlagsBits.ModerateMembers'
  },
  
  // Channel commands
  'src/commands/channel/lock.ts': {
    options: `.addChannelOption(option => option.setName('channel').setDescription('The channel to lock (defaults to current)').setRequired(false))`,
    permissions: 'PermissionFlagsBits.ManageChannels'
  },
  'src/commands/channel/unlock.ts': {
    options: `.addChannelOption(option => option.setName('channel').setDescription('The channel to unlock (defaults to current)').setRequired(false))`,
    permissions: 'PermissionFlagsBits.ManageChannels'
  },
  'src/commands/channel/slowmode.ts': {
    options: `.addIntegerOption(option => option.setName('seconds').setDescription('Slowmode duration in seconds (0 to disable)').setRequired(true).setMinValue(0).setMaxValue(21600))
    .addChannelOption(option => option.setName('channel').setDescription('The channel (defaults to current)').setRequired(false))`,
    permissions: 'PermissionFlagsBits.ManageChannels'
  },
  
  // Role commands
  'src/commands/roles/role.ts': {
    options: `.addSubcommand(subcommand =>
      subcommand
        .setName('add')
        .setDescription('Add a role to a user')
        .addRoleOption(option => option.setName('role').setDescription('The role to add').setRequired(true))
        .addUserOption(option => option.setName('user').setDescription('The user').setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('remove')
        .setDescription('Remove a role from a user')
        .addRoleOption(option => option.setName('role').setDescription('The role to remove').setRequired(true))
        .addUserOption(option => option.setName('user').setDescription('The user').setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('list')
        .setDescription('List all roles of a user')
        .addUserOption(option => option.setName('user').setDescription('The user').setRequired(true)))`,
    permissions: 'PermissionFlagsBits.ManageRoles'
  },
  'src/commands/roles/temprole.ts': {
    options: `.addUserOption(option => option.setName('user').setDescription('The user').setRequired(true))
    .addRoleOption(option => option.setName('role').setDescription('The role to assign temporarily').setRequired(true))
    .addStringOption(option => option.setName('duration').setDescription('Duration (e.g., 1h, 1d, 1w)').setRequired(true))`,
    permissions: 'PermissionFlagsBits.ManageRoles'
  },
  'src/commands/roles/rolelock.ts': {
    options: `.addSubcommand(subcommand =>
      subcommand
        .setName('add')
        .setDescription('Lock a role to specific users')
        .addRoleOption(option => option.setName('role').setDescription('The role to lock').setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('remove')
        .setDescription('Remove role lock')
        .addRoleOption(option => option.setName('role').setDescription('The role to unlock').setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('list')
        .setDescription('List all locked roles'))`,
    permissions: 'PermissionFlagsBits.ManageRoles'
  },
  
  // Purge commands
  'src/commands/purge/cleanup.ts': {
    options: `.addStringOption(option => option.setName('target').setDescription('Channel ID or "all" for all threads').setRequired(true))`,
    permissions: 'PermissionFlagsBits.ManageMessages'
  },
  'src/commands/purge/purgeafter.ts': {
    options: `.addStringOption(option => option.setName('messageid').setDescription('Message ID to purge after').setRequired(true))`,
    permissions: 'PermissionFlagsBits.ManageMessages'
  },
  'src/commands/purge/purgebefore.ts': {
    options: `.addStringOption(option => option.setName('messageid').setDescription('Message ID to purge before').setRequired(true))`,
    permissions: 'PermissionFlagsBits.ManageMessages'
  },
  'src/commands/purge/purgebots.ts': {
    options: `.addIntegerOption(option => option.setName('amount').setDescription('Number of bot messages to delete (1-100)').setRequired(true).setMinValue(1).setMaxValue(100))`,
    permissions: 'PermissionFlagsBits.ManageMessages'
  },
  'src/commands/purge/purgeembeds.ts': {
    options: `.addIntegerOption(option => option.setName('amount').setDescription('Number of messages with embeds to delete (1-100)').setRequired(true).setMinValue(1).setMaxValue(100))`,
    permissions: 'PermissionFlagsBits.ManageMessages'
  },
  'src/commands/purge/purgeemojis.ts': {
    options: `.addIntegerOption(option => option.setName('amount').setDescription('Number of messages with emojis to delete (1-100)').setRequired(true).setMinValue(1).setMaxValue(100))`,
    permissions: 'PermissionFlagsBits.ManageMessages'
  },
  'src/commands/purge/purgeimages.ts': {
    options: `.addIntegerOption(option => option.setName('amount').setDescription('Number of messages with images to delete (1-100)').setRequired(true).setMinValue(1).setMaxValue(100))`,
    permissions: 'PermissionFlagsBits.ManageMessages'
  },
  'src/commands/purge/purgelinks.ts': {
    options: `.addIntegerOption(option => option.setName('amount').setDescription('Number of messages with links to delete (1-100)').setRequired(true).setMinValue(1).setMaxValue(100))`,
    permissions: 'PermissionFlagsBits.ManageMessages'
  },
  'src/commands/purge/purgementions.ts': {
    options: `.addIntegerOption(option => option.setName('amount').setDescription('Number of messages with mentions to delete (1-100)').setRequired(true).setMinValue(1).setMaxValue(100))`,
    permissions: 'PermissionFlagsBits.ManageMessages'
  },
  'src/commands/purge/purgereactions.ts': {
    options: `.addIntegerOption(option => option.setName('amount').setDescription('Number of messages to remove reactions from (1-100)').setRequired(true).setMinValue(1).setMaxValue(100))`,
    permissions: 'PermissionFlagsBits.ManageMessages'
  },
  'src/commands/purge/purgeregex.ts': {
    options: `.addStringOption(option => option.setName('pattern').setDescription('Regex pattern to match').setRequired(true))
    .addIntegerOption(option => option.setName('amount').setDescription('Number of messages to check (1-100)').setRequired(true).setMinValue(1).setMaxValue(100))`,
    permissions: 'PermissionFlagsBits.ManageMessages'
  },
  'src/commands/purge/purgeuser.ts': {
    options: `.addUserOption(option => option.setName('user').setDescription('The user whose messages to delete').setRequired(true))
    .addIntegerOption(option => option.setName('amount').setDescription('Number of messages to delete (1-100)').setRequired(true).setMinValue(1).setMaxValue(100))`,
    permissions: 'PermissionFlagsBits.ManageMessages'
  },
};

console.log('🚀 Converting commands to hybrid (slash + prefix)...\n');
console.log(`Total commands to process: ${Object.keys(commandConfigs).length}\n`);

let success = 0;
let failed = 0;
let skipped = 0;

for (const [filePath, config] of Object.entries(commandConfigs)) {
  const fullPath = path.join(rootDir, filePath);
  
  console.log(`📝 Processing: ${filePath}`);
  
  try {
    if (!fs.existsSync(fullPath)) {
      console.log(`   ⚠️  File not found, skipping\n`);
      skipped++;
      continue;
    }
    
    let content = fs.readFileSync(fullPath, 'utf8');
    
    // Check if already has execute method
    if (content.includes('async execute(')) {
      console.log(`   ⏭️  Already has execute method, skipping\n`);
      skipped++;
      continue;
    }
    
    // Add required imports if not present
    if (!content.includes('ChatInputCommandInteraction')) {
      content = content.replace(
        /from 'discord\.js';/,
        match => match.replace('} from', ', ChatInputCommandInteraction } from')
      );
    }
    
    if (!content.includes('SlashCommandBuilder')) {
      content = content.replace(
        /from 'discord\.js';/,
        match => match.replace('} from', ', SlashCommandBuilder } from')
      );
    }
    
    // Extract command name and description from data object
    const nameMatch = content.match(/name: '([^']+)'/);
    const descMatch = content.match(/description: '([^']+)'/);
    
    if (!nameMatch || !descMatch) {
      console.log(`   ❌ Could not extract command name/description\n`);
      failed++;
      continue;
    }
    
    const cmdName = nameMatch[1];
    const cmdDesc = descMatch[1];
    
    // Replace data object with SlashCommandBuilder
    const dataRegex = /data: \{[^}]*name: '[^']+',?[^}]*description: '[^']+',?[^}]*\},/s;
    const slashBuilder = `data: new SlashCommandBuilder()
    .setName('${cmdName}')
    .setDescription('${cmdDesc}')
    ${config.options}
    .setDefaultMemberPermissions(${config.permissions}),`;
    
    content = content.replace(dataRegex, slashBuilder);
    
    // Extract prefixRun body and convert to shared function
    const prefixRunRegex = /async prefixRun\(message: Message, args: string\[\]\) \{([\s\S]*?)\n\s*\}\n\};/;
    const prefixMatch = content.match(prefixRunRegex);
    
    if (!prefixMatch) {
      console.log(`   ❌ Could not extract prefixRun method\n`);
      failed++;
      continue;
    }
    
    const prefixBody = prefixMatch[1];
    
    // Build execute method for slash commands
    const executeMethod = `
  async execute(interaction: ChatInputCommandInteraction) {
    // Convert interaction to message-like format for shared logic
    const args: string[] = [];
    
    // Extract args from slash command options
    if (interaction.options.data) {
      for (const opt of interaction.options.data) {
        if (opt.value !== undefined) {
          args.push(String(opt.value));
        } else if (opt.user) {
          args.push(opt.user.id);
        } else if (opt.channel) {
          args.push(opt.channel.id);
        } else if (opt.role) {
          args.push(opt.role.id);
        }
      }
    }
    
    // Create message-like object
    const message: any = {
      guild: interaction.guild,
      member: interaction.member,
      author: interaction.user,
      channel: interaction.channel,
      mentions: {
        members: interaction.options.getMember('user') ? 
          new Map([[interaction.options.getMember('user')!.user.id, interaction.options.getMember('user')]]) : 
          new Map(),
        channels: interaction.options.getChannel('channel') ? 
          new Map([[interaction.options.getChannel('channel')!.id, interaction.options.getChannel('channel')]]) : 
          new Map(),
        roles: interaction.options.getRole('role') ? 
          new Map([[interaction.options.getRole('role')!.id, interaction.options.getRole('role')]]) : 
          new Map()
      },
      reply: async (options: any) => {
        if (interaction.replied || interaction.deferred) {
          return interaction.followUp(options);
        }
        return interaction.reply(options);
      }
    };
    
    return this._sharedLogic(message as Message, args);
  },
  
  async prefixRun(message: Message, args: string[]) {
    return this._sharedLogic(message, args);
  },
  
  async _sharedLogic(message: Message, args: string[]) {${prefixBody}
  }`;
    
    // Replace the prefixRun method
    content = content.replace(prefixRunRegex, `${executeMethod}\n};`);
    
    // Write the file
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log(`   ✅ Successfully converted to hybrid\n`);
    success++;
    
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}\n`);
    failed++;
  }
}

console.log('='.repeat(60));
console.log(`✨ Conversion Summary:`);
console.log(`   ✅ Success: ${success}`);
console.log(`   ⏭️  Skipped: ${skipped}`);
console.log(`   ❌ Failed: ${failed}`);
console.log(`   📊 Total: ${Object.keys(commandConfigs).length}`);
console.log('='.repeat(60));
