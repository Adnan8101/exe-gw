#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const glob = require('glob');

const rootDir = path.join(__dirname, '..');

// Find all TypeScript files in commands
const files = glob.sync('src/commands/**/*.ts', { cwd: rootDir });

console.log(`🔧 Fixing syntax errors in ${files.length} files...\n`);

let fixed = 0;

for (const filePath of files) {
  const fullPath = path.join(rootDir, filePath);
  
  try {
    let content = fs.readFileSync(fullPath, 'utf8');
    const original = content;
    
    // Fix double comma
    content = content.replace(/\.setDefaultMemberPermissions\([^)]+\),,/g, match => 
      match.slice(0, -1) // Remove one comma
    );
    
    // Fix missing comma between metadata and execute
    content = content.replace(/\n  \}\n\n \n  async execute/g, '\n  },\n\n  async execute');
    content = content.replace(/\n  \}\n\n  async execute/g, '\n  },\n\n  async execute');
    content = content.replace(/  \}\n\n \n  async execute/g, '  },\n\n  async execute');
    
    if (content !== original) {
      fs.writeFileSync(fullPath, content, 'utf8');
      console.log(`✅ Fixed: ${filePath}`);
      fixed++;
    }
    
  } catch (error) {
    console.log(`❌ Error fixing ${filePath}: ${error.message}`);
  }
}

console.log(`\n✨ Fixed ${fixed}/${files.length} files`);
