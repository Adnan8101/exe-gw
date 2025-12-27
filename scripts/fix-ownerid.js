const fs = require('fs');
const path = require('path');

// Files that need to be fixed based on the grep search
const filesToFix = [
  'src/commands/roles/role.ts',
  'src/commands/roles/temprole.ts'
];

const rootDir = path.join(__dirname, '..');

function fixFile(filePath) {
  const fullPath = path.join(rootDir, filePath);
  console.log(`\n📝 Fixing ${filePath}...`);
  
  try {
    let content = fs.readFileSync(fullPath, 'utf8');
    const originalContent = content;
    
    // Fix pattern 1: message.guild!.ownerId !== message.author.id
    // Replace with: message.guild?.ownerId !== message.author.id
    content = content.replace(
      /message\.guild!\.ownerId\s*!==\s*message\.author\.id/g,
      'message.guild?.ownerId !== message.author.id'
    );
    
    if (content !== originalContent) {
      fs.writeFileSync(fullPath, content, 'utf8');
      console.log(`   ✅ Fixed ${filePath}`);
      return true;
    } else {
      console.log(`   ⚠️  No changes needed for ${filePath}`);
      return false;
    }
  } catch (error) {
    console.error(`   ❌ Error fixing ${filePath}:`, error.message);
    return false;
  }
}

console.log('🚀 Starting to fix ownerId access issues...\n');
console.log('This script will fix the following issue:');
console.log('   - Replace message.guild!.ownerId with message.guild?.ownerId');
console.log('   - This prevents "Cannot read properties of undefined (reading \'ownerId\')" errors\n');

let fixedCount = 0;
let totalCount = 0;

for (const file of filesToFix) {
  totalCount++;
  if (fixFile(file)) {
    fixedCount++;
  }
}

console.log('\n' + '='.repeat(60));
console.log(`✨ Fix complete!`);
console.log(`   Fixed: ${fixedCount}/${totalCount} files`);
console.log('='.repeat(60));
