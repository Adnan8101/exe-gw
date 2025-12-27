#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');

// Commands with their required arguments
const commandValidations = {
  'src/commands/moderation/kick.ts': { minArgs: 1, argName: 'user' },
  'src/commands/moderation/ban.ts': { minArgs: 1, argName: 'user' },
  'src/commands/moderation/unban.ts': { minArgs: 1, argName: 'user ID' },
  'src/commands/moderation/softban.ts': { minArgs: 1, argName: 'user' },
  'src/commands/moderation/tempban.ts': { minArgs: 2, argName: 'user and duration' },
  'src/commands/moderation/timeout.ts': { minArgs: 2, argName: 'user and duration' },
  'src/commands/moderation/untimeout.ts': { minArgs: 1, argName: 'user' },
  'src/commands/moderation/warn.ts': { minArgs: 1, argName: 'user' },
  'src/commands/moderation/warnings.ts': { minArgs: 1, argName: 'user' },
  'src/commands/moderation/clearwarnings.ts': { minArgs: 1, argName: 'user' },
  'src/commands/moderation/silentwarn.ts': { minArgs: 1, argName: 'user' },
  'src/commands/moderation/silentban.ts': { minArgs: 1, argName: 'user' },
  'src/commands/moderation/silentkick.ts': { minArgs: 1, argName: 'user' },
  'src/commands/moderation/modlogs.ts': { minArgs: 1, argName: 'user' },
  'src/commands/channel/slowmode.ts': { minArgs: 1, argName: 'seconds' },
  'src/commands/roles/role.ts': { minArgs: 2, argName: 'action and role' },
  'src/commands/roles/temprole.ts': { minArgs: 3, argName: 'user, role, and duration' },
  'src/commands/roles/rolelock.ts': { minArgs: 1, argName: 'action' },
  'src/commands/purge/purge.ts': { minArgs: 1, argName: 'amount' },
  'src/commands/purge/cleanup.ts': { minArgs: 1, argName: 'thread ID or "all"' },
  'src/commands/purge/purgeafter.ts': { minArgs: 1, argName: 'message ID' },
  'src/commands/purge/purgebefore.ts': { minArgs: 1, argName: 'message ID' },
  'src/commands/purge/purgebots.ts': { minArgs: 1, argName: 'amount' },
  'src/commands/purge/purgeembeds.ts': { minArgs: 1, argName: 'amount' },
  'src/commands/purge/purgeemojis.ts': { minArgs: 1, argName: 'amount' },
  'src/commands/purge/purgeimages.ts': { minArgs: 1, argName: 'amount' },
  'src/commands/purge/purgelinks.ts': { minArgs: 1, argName: 'amount' },
  'src/commands/purge/purgementions.ts': { minArgs: 1, argName: 'amount' },
  'src/commands/purge/purgereactions.ts': { minArgs: 1, argName: 'amount' },
  'src/commands/purge/purgeregex.ts': { minArgs: 2, argName: 'pattern and amount' },
  'src/commands/purge/purgeuser.ts': { minArgs: 2, argName: 'user and amount' },
};

console.log('🚀 Adding argument validation to commands...\n');

let success = 0;
let failed = 0;

for (const [filePath, validation] of Object.entries(commandValidations)) {
  const fullPath = path.join(rootDir, filePath);
  console.log(`📝 Processing: ${filePath}`);
  
  try {
    if (!fs.existsSync(fullPath)) {
      console.log(`   ❌ File not found\n`);
      failed++;
      continue;
    }
    
    let content = fs.readFileSync(fullPath, 'utf8');
    const original = content;
    
    // Add import for commandHelp if not present
    if (!content.includes('commandHelp')) {
      content = content.replace(
        /(import.*from '\.\.\/\.\.\/utils\/emojis';)/,
        `$1\nimport { createMissingArgsEmbed } from '../../utils/commandHelp';`
      );
    }
    
    // Add validation at the start of _sharedLogic function
    const validationCode = `
  async _sharedLogic(message: Message, args: string[]) {
    // Validate required arguments
    if (args.length < ${validation.minArgs}) {
      return message.reply({ embeds: [createMissingArgsEmbed(this.data as any, '${validation.argName}')] });
    }
`;
    
    // Replace the _sharedLogic function start
    content = content.replace(
      /async _sharedLogic\(message: Message, args: string\[\]\) \{/,
      validationCode
    );
    
    if (content !== original) {
      fs.writeFileSync(fullPath, content, 'utf8');
      console.log(`   ✅ Added validation\n`);
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
console.log(`✨ Validation Addition Summary:`);
console.log(`   ✅ Success: ${success}`);
console.log(`   ❌ Failed: ${failed}`);
console.log('='.repeat(60));
