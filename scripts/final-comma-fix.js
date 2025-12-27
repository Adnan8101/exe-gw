#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const filesToFix = [
  'src/commands/channel/slowmode.ts',
  'src/commands/moderation/timeout.ts',
  'src/commands/moderation/untimeout.ts',
  'src/commands/purge/cleanup.ts',
  'src/commands/purge/purgeafter.ts',
  'src/commands/purge/purgebefore.ts',
  'src/commands/purge/purgeembeds.ts',
  'src/commands/purge/purgeemojis.ts',
  'src/commands/purge/purgeimages.ts',
  'src/commands/purge/purgelinks.ts',
  'src/commands/purge/purgementions.ts',
  'src/commands/purge/purgereactions.ts',
  'src/commands/purge/purgeregex.ts',
  'src/commands/purge/purgeuser.ts'
];

const rootDir = path.join(__dirname, '..');

console.log('🔧 Final comma fix...\n');

let fixed = 0;

for (const filePath of filesToFix) {
  const fullPath = path.join(rootDir, filePath);
  
  try {
    let content = fs.readFileSync(fullPath, 'utf8');
    const lines = content.split('\n');
    
    for (let i = 0; i < lines.length - 1; i++) {
      // Find lines with "  }" followed by blank line and async execute
      if (lines[i].trim() === '}' && 
          lines[i+1].trim() === '' && 
          lines[i+2] && lines[i+2].includes('async execute')) {
        // Check if the } line needs a comma
        if (!lines[i].endsWith('},')) {
          lines[i] = lines[i].replace(/\}$/, '},');
          fixed++;
          console.log(`✅ Fixed: ${filePath}`);
          break;
        }
      }
    }
    
    content = lines.join('\n');
    fs.writeFileSync(fullPath, content, 'utf8');
    
  } catch (error) {
    console.log(`❌ Error: ${filePath} - ${error.message}`);
  }
}

console.log(`\n✨ Fixed ${fixed}/${filesToFix.length} files`);
