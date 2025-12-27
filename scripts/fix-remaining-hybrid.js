#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');

// Files that still need conversion
const filesToConvert = [
  { 
    path: 'src/commands/moderation/softban.ts',
    options: '.addUserOption(option => option.setName("user").setDescription("The user to softban").setRequired(true)).addStringOption(option => option.setName("reason").setDescription("Reason for the softban").setRequired(false))',
    perm: 'PermissionFlagsBits.BanMembers'
  },
  { 
    path: 'src/commands/moderation/tempban.ts',
    options: '.addUserOption(option => option.setName("user").setDescription("The user to temporarily ban").setRequired(true)).addStringOption(option => option.setName("duration").setDescription("Ban duration (e.g., 1h, 1d, 1w)").setRequired(true)).addStringOption(option => option.setName("reason").setDescription("Reason for the ban").setRequired(false))',
    perm: 'PermissionFlagsBits.BanMembers'
  },
  { 
    path: 'src/commands/moderation/timeout.ts',
    options: '.addUserOption(option => option.setName("user").setDescription("The user to timeout").setRequired(true)).addStringOption(option => option.setName("duration").setDescription("Timeout duration (e.g., 1m, 1h, 1d)").setRequired(true)).addStringOption(option => option.setName("reason").setDescription("Reason for the timeout").setRequired(false))',
    perm: 'PermissionFlagsBits.ModerateMembers'
  },
  { 
    path: 'src/commands/moderation/untimeout.ts',
    options: '.addUserOption(option => option.setName("user").setDescription("The user to remove timeout from").setRequired(true))',
    perm: 'PermissionFlagsBits.ModerateMembers'
  },
  { 
    path: 'src/commands/moderation/warn.ts',
    options: '.addUserOption(option => option.setName("user").setDescription("The user to warn").setRequired(true)).addStringOption(option => option.setName("reason").setDescription("Reason for the warning").setRequired(false))',
    perm: 'PermissionFlagsBits.ModerateMembers'
  },
  { 
    path: 'src/commands/moderation/warnings.ts',
    options: '.addUserOption(option => option.setName("user").setDescription("The user to view warnings for").setRequired(true))',
    perm: 'PermissionFlagsBits.ModerateMembers'
  },
  { 
    path: 'src/commands/moderation/clearwarnings.ts',
    options: '.addUserOption(option => option.setName("user").setDescription("The user to clear warnings for").setRequired(true))',
    perm: 'PermissionFlagsBits.ModerateMembers'
  },
  { 
    path: 'src/commands/moderation/silentwarn.ts',
    options: '.addUserOption(option => option.setName("user").setDescription("The user to silently warn").setRequired(true)).addStringOption(option => option.setName("reason").setDescription("Reason for the warning").setRequired(false))',
    perm: 'PermissionFlagsBits.ModerateMembers'
  },
  { 
    path: 'src/commands/moderation/silentban.ts',
    options: '.addUserOption(option => option.setName("user").setDescription("The user to silently ban").setRequired(true)).addStringOption(option => option.setName("reason").setDescription("Reason for the ban").setRequired(false))',
    perm: 'PermissionFlagsBits.BanMembers'
  },
  { 
    path: 'src/commands/moderation/silentkick.ts',
    options: '.addUserOption(option => option.setName("user").setDescription("The user to silently kick").setRequired(true)).addStringOption(option => option.setName("reason").setDescription("Reason for the kick").setRequired(false))',
    perm: 'PermissionFlagsBits.KickMembers'
  },
  { 
    path: 'src/commands/moderation/modlogs.ts',
    options: '.addUserOption(option => option.setName("user").setDescription("The user to view mod logs for").setRequired(true))',
    perm: 'PermissionFlagsBits.ModerateMembers'
  },
  { 
    path: 'src/commands/channel/lock.ts',
    options: '.addChannelOption(option => option.setName("channel").setDescription("The channel to lock (defaults to current)").setRequired(false))',
    perm: 'PermissionFlagsBits.ManageChannels'
  },
  { 
    path: 'src/commands/channel/unlock.ts',
    options: '.addChannelOption(option => option.setName("channel").setDescription("The channel to unlock (defaults to current)").setRequired(false))',
    perm: 'PermissionFlagsBits.ManageChannels'
  },
  { 
    path: 'src/commands/roles/temprole.ts',
    options: '.addUserOption(option => option.setName("user").setDescription("The user").setRequired(true)).addRoleOption(option => option.setName("role").setDescription("The role to assign temporarily").setRequired(true)).addStringOption(option => option.setName("duration").setDescription("Duration (e.g., 1h, 1d, 1w)").setRequired(true))',
    perm: 'PermissionFlagsBits.ManageRoles'
  },
];

console.log(`🚀 Converting ${filesToConvert.length} remaining commands...\n`);

let success = 0;
let failed = 0;

for (const fileConfig of filesToConvert) {
  const fullPath = path.join(rootDir, fileConfig.path);
  console.log(`📝 Processing: ${fileConfig.path}`);
  
  try {
    if (!fs.existsSync(fullPath)) {
      console.log(`   ❌ File not found\n`);
      failed++;
      continue;
    }
    
    let content = fs.readFileSync(fullPath, 'utf8');
    const original = content;
    
    // Check if already converted
    if (content.includes('async execute(')) {
      console.log(`   ⏭️  Already converted\n`);
      continue;
    }
    
    // Add imports
    if (!content.includes('ChatInputCommandInteraction')) {
      content = content.replace(
        /(import \{[^}]*)\} from 'discord\.js';/,
        '$1, ChatInputCommandInteraction } from \'discord.js\';'
      );
    }
    
    if (!content.includes('SlashCommandBuilder')) {
      content = content.replace(
        /(import \{[^}]*)\} from 'discord\.js';/,
        '$1, SlashCommandBuilder } from \'discord.js\';'
      );
    }
    
    // Extract name and description
    const nameMatch = content.match(/name: '([^']+)'/);
    const descMatch = content.match(/description: '([^']+)'/);
    
    if (!nameMatch || !descMatch) {
      console.log(`   ❌ Could not extract command name/description\n`);
      failed++;
      continue;
    }
    
    const cmdName = nameMatch[1];
    const cmdDesc = descMatch[1];
    
    // Replace data section
    content = content.replace(
      /data: \{[^}]*name: '[^']+',?[^}]*description: '[^']+',?[^}]*\},?/s,
      `data: new SlashCommandBuilder()
    .setName('${cmdName}')
    .setDescription('${cmdDesc}')
    ${fileConfig.options}
    .setDefaultMemberPermissions(${fileConfig.perm}),`
    );
    
    // Extract prefixRun body - handle both closing patterns
    const prefixRunMatch = content.match(/async prefixRun\(message: Message, args: string\[\]\) \{([\s\S]*?)\n\s*\}(\n\n\};|\n\};)/);
    
    if (!prefixRunMatch) {
      console.log(`   ❌ Could not extract prefixRun method\n`);
      failed++;
      continue;
    }
    
    const prefixBody = prefixRunMatch[1];
    const closing = prefixRunMatch[2];
    
    // Create new structure
    const newStructure = `async execute(interaction: ChatInputCommandInteraction) {
    const args: string[] = [];
    
    // Parse slash command options
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
  }${closing}`;
    
    content = content.replace(
      /async prefixRun\(message: Message, args: string\[\]\) \{[\s\S]*?\n\s*\}(\n\n\};|\n\};)/,
      newStructure
    );
    
    if (content !== original) {
      fs.writeFileSync(fullPath, content, 'utf8');
      console.log(`   ✅ Successfully converted\n`);
      success++;
    } else {
      console.log(`   ⚠️  No changes made\n`);
    }
    
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}\n`);
    failed++;
  }
}

console.log('='.repeat(60));
console.log(`✨ Conversion Summary:`);
console.log(`   ✅ Success: ${success}`);
console.log(`   ❌ Failed: ${failed}`);
console.log('='.repeat(60));
