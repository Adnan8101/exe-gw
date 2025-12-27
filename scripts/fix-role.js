const fs = require('fs');

const filePath = './src/commands/roles/role.ts';
const content = fs.readFileSync(filePath, 'utf8');

// Extract the header (imports)
const headerMatch = content.match(/^([\s\S]*?)(?=\/\/ Helper functions|async function handle)/);
const header = headerMatch ? headerMatch[1].trim() : '';

// Extract all helper functions
const helperFunctions = [];
const funcMatches = content.matchAll(/(?:\/\/ Helper function[^\n]*\n)?async function (handle\w+)\([^)]*\)[^{]*\{[\s\S]*?\n\}/g);
for (const match of funcMatches) {
  helperFunctions.push(match[0]);
}

// Extract export default block
const exportMatch = content.match(/(export default \{[\s\S]*?\n\};)/);
const exportBlock = exportMatch ? exportMatch[1] : '';

// Reconstruct the file
const newContent = `${header}

${helperFunctions.join('\n\n')}

${exportBlock}
`;

fs.writeFileSync(filePath, newContent);
console.log('Fixed role.ts structure');
