#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');

const files = [
  'src/commands/moderation/kick.ts',
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
  'src/commands/roles/role.ts',
  'src/commands/roles/temprole.ts',
  'src/commands/roles/rolelock.ts',
  'src/commands/purge/purge.ts',
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
];

console.log('🔧 Fixing syntax errors...\n');

let fixed = 0;

for (const filePath of files) {
  const fullPath = path.join(rootDir, filePath);
  
  try {
    let content = fs.readFileSync(fullPath, 'utf8');
    const original = content;
    
    // Fix double comma after setDefaultMemberPermissions
    content = content.replace(/\.setDefaultMemberPermissions\([^)]+\),,/g, match => 
      match.replace(',,', ',')
    );
    
    // Fix missing comma after metadata block if needed
    content = content.replace(/\n  \}\n\n \n  async execute/g, '\n  },\n\n  async execute');
    content = content.replace(/\n  \}\n\n  async execute/g, '\n  },\n\n  async execute');
    
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

console.log(`\n✨ Fixed ${fixed}/${files.length} files`);
