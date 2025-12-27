#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');

// All files that were converted
const allConvertedFiles = [
  'src/commands/moderation/kick.ts',
  'src/commands/moderation/ban.ts',
  'src/commands/moderation/unban.ts',
  'src/commands/moderation/softban.ts',
  'src/commands/moderation/tempban.ts',
  'src/commands/moderation/timeout.ts',
  'src/commands/moderation/untimeout.ts',
  'src/commands/moderation/warn.ts',
  'src/commands/moderation/warnings.ts',
  'src/commands/moderation/clearwarnings.ts',
  'src/commands/moderation/silentwarn.ts',
  'src/commands/moderation/silentban.ts',
  'src/commands/moderation/silentkick.ts',
  'src/commands/moderation/modlogs.ts',
  'src/commands/channel/lock.ts',
  'src/commands/channel/unlock.ts',
  'src/commands/channel/slowmode.ts',
  'src/commands/purge/cleanup.ts',
  'src/commands/purge/purgeafter.ts',
  'src/commands/purge/purgebefore.ts',
  'src/commands/purge/purgebots.ts',
  'src/commands/purge/purgeembeds.ts',
  'src/commands/purge/purgeemojis.ts',
  'src/commands/purge/purgeimages.ts',
  'src/commands/purge/purgelinks.ts',
  'src/commands/purge/purgementions.ts',
  'src/commands/purge/purgereactions.ts',
  'src/commands/purge/purgeregex.ts',
  'src/commands/purge/purgeuser.ts',
  'src/commands/roles/role.ts',
  'src/commands/roles/rolelock.ts',
  'src/commands/roles/temprole.ts'
];

console.log('🔧 Fixing imports in converted files...\n');

let fixed = 0;

for (const filePath of allConvertedFiles) {
  const fullPath = path.join(rootDir, filePath);
  
  try {
    let content = fs.readFileSync(fullPath, 'utf8');
    const original = content;
    
    // Fix the import statement - make sure SlashCommandBuilder and ChatInputCommandInteraction are included
    const importMatch = content.match(/^import \{([^}]+)\} from 'discord\.js';/m);
    
    if (importMatch) {
      let imports = importMatch[1].split(',').map(i => i.trim());
      
      // Add missing imports
      if (!imports.includes('SlashCommandBuilder')) {
        imports.push('SlashCommandBuilder');
      }
      if (!imports.includes('ChatInputCommandInteraction')) {
        imports.push('ChatInputCommandInteraction');
      }
      
      // Remove duplicates
      imports = [...new Set(imports)];
      
      const newImport = `import { ${imports.join(', ')} } from 'discord.js';`;
      
      content = content.replace(/^import \{[^}]+\} from 'discord\.js';/m, newImport);
    }
    
    // Fix the member.user.id issue in the execute method
    content = content.replace(
      /new Map\(\[\[interaction\.options\.getMember\('user'\)!\.user\.id, interaction\.options\.getMember\('user'\)\]\]\)/g,
      `new Map(interaction.options.getMember('user') ? [[interaction.options.getUser('user')!.id, interaction.options.getMember('user')]] : [])`
    );
    
    if (content !== original) {
      fs.writeFileSync(fullPath, content, 'utf8');
      console.log(`✅ Fixed: ${filePath}`);
      fixed++;
    } else {
      console.log(`⏭️  Skipped: ${filePath}`);
    }
    
  } catch (error) {
    console.log(`❌ Error fixing ${filePath}: ${error.message}`);
  }
}

console.log(`\n✨ Fixed ${fixed}/${allConvertedFiles.length} files`);
