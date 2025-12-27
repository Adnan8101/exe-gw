#!/usr/bin/env node
/**
 * This script automatically updates command files to include:
 * 1. Automatic help embed display for incomplete commands
 * 2. Better argument validation
 */

const fs = require('fs');
const path = require('path');

const COMMAND_CATEGORIES = [
  'moderation',
  'channel',
  'purge',
  'roles'
];

function updateCommandFile(filePath) {
  console.log(`Processing: ${filePath}`);
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Check if the file already imports createMissingArgsEmbed and createCommandHelpEmbed
  const hasHelpImport = content.includes('createMissingArgsEmbed') || content.includes('createCommandHelpEmbed');
  
  if (!hasHelpImport) {
    // Add the import if not present
    const importMatch = content.match(/import.*from ['"]discord\.js['"]/);
    if (importMatch) {
      const insertPos = content.indexOf(importMatch[0]) + importMatch[0].length;
      const newImport = "\nimport { createMissingArgsEmbed, createCommandHelpEmbed } from '../../utils/commandHelp';";
      content = content.slice(0, insertPos) + newImport + content.slice(insertPos);
    }
  }
  
  // Look for the _sharedLogic function and check if it validates args
  const sharedLogicMatch = content.match(/async _sharedLogic\(message: Message, args: string\[\]\) \{[\s\S]*?(?=\n  \})/);
  
  if (sharedLogicMatch) {
    const functionBody = sharedLogicMatch[0];
    
    // Check if there's already an args validation
    if (!functionBody.includes('args.length')) {
      // Find where to insert the validation (after the function declaration)
      const insertMatch = functionBody.match(/async _sharedLogic\(message: Message, args: string\[\]\) \{/);
      
      if (insertMatch) {
        const validationCode = `
    // Validate required arguments - show help embed if missing
    if (args.length < 1) {
      const commandData = {
        name: this.data?.name || 'command',
        description: this.data?.description || 'Command description',
        metadata: this.metadata
      };
      return message.reply({ embeds: [createCommandHelpEmbed(commandData)] });
    }
`;
        
        const insertPos = content.indexOf(insertMatch[0]) + insertMatch[0].length;
        content = content.slice(0, insertPos) + validationCode + content.slice(insertPos);
      }
    }
  }
  
  // Save the updated content
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`✓ Updated: ${filePath}`);
}

function processDirectory(dirPath) {
  const files = fs.readdirSync(dirPath);
  
  files.forEach(file => {
    const filePath = path.join(dirPath, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isFile() && file.endsWith('.ts')) {
      try {
        updateCommandFile(filePath);
      } catch (error) {
        console.error(`Error processing ${filePath}:`, error.message);
      }
    }
  });
}

// Main execution
console.log('Starting command update process...\n');

const srcDir = path.join(__dirname, 'src', 'commands');

COMMAND_CATEGORIES.forEach(category => {
  const categoryPath = path.join(srcDir, category);
  
  if (fs.existsSync(categoryPath)) {
    console.log(`\n=== Processing ${category} commands ===`);
    processDirectory(categoryPath);
  } else {
    console.log(`\n⚠️  Category not found: ${category}`);
  }
});

console.log('\n✓ Command update process complete!');
