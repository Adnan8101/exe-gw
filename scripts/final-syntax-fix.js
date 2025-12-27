#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');

function getFilesRecursively(dir) {
  const files = [];
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      files.push(...getFilesRecursively(fullPath));
    } else if (item.endsWith('.ts')) {
      files.push(fullPath);
    }
  }
  
  return files;
}

const commandsDir = path.join(rootDir, 'src/commands');
const files = getFilesRecursively(commandsDir);

console.log(`🔧 Final syntax fix for ${files.length} files...\n`);

let fixed = 0;

for (const fullPath of files) {
  try {
    let content = fs.readFileSync(fullPath, 'utf8');
    const original = content;
    
    // Fix: Missing comma after metadata block
    content = content.replace(/  \}\n\n \n  async execute/g, '  },\n\n  async execute');
    content = content.replace(/  \}\n\n  async execute/g, '  },\n\n  async execute');
    
    if (content !== original) {
      fs.writeFileSync(fullPath, content, 'utf8');
      console.log(`✅ Fixed: ${path.relative(rootDir, fullPath)}`);
      fixed++;
    }
    
  } catch (error) {
    console.log(`❌ Error: ${path.relative(rootDir, fullPath)} - ${error.message}`);
  }
}

console.log(`\n✨ Fixed ${fixed}/${files.length} files`);
