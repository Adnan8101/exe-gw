const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');

// All command files to convert
const commandFiles = [
  // Moderation commands
  'src/commands/moderation/ban.ts',
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
  
  // Channel commands
  'src/commands/channel/lock.ts',
  'src/commands/channel/unlock.ts',
  'src/commands/channel/slowmode.ts',
  
  // Purge commands
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
  
  // Role commands
  'src/commands/roles/role.ts',
  'src/commands/roles/rolelock.ts',
  'src/commands/roles/temprole.ts'
];

function convertToHybrid(filePath) {
  const fullPath = path.join(rootDir, filePath);
  console.log(`\n📝 Converting ${filePath}...`);
  
  try {
    let content = fs.readFileSync(fullPath, 'utf8');
    const originalContent = content;
    
    // Check if already has execute method
    if (content.includes('async execute(')) {
      console.log(`   ⚠️  Already has execute method, skipping ${filePath}`);
      return false;
    }
    
    // Check if has prefixRun method
    if (!content.includes('async prefixRun(')) {
      console.log(`   ⚠️  No prefixRun method found, skipping ${filePath}`);
      return false;
    }
    
    // Extract the prefixRun function body
    const prefixRunMatch = content.match(/async prefixRun\(message: Message, args: string\[\]\) \{([\s\S]*?)\n\s*\}\n\};/);
    
    if (!prefixRunMatch) {
      console.log(`   ⚠️  Could not parse prefixRun method in ${filePath}`);
      return false;
    }
    
    const prefixRunBody = prefixRunMatch[1];
    
    // Create shared logic function
    const sharedFunctionName = '_sharedLogic';
    const sharedFunction = `
 async ${sharedFunctionName}(message: Message, args: string[]) {${prefixRunBody}
 }`;
    
    // Create new execute method for slash commands
    const executeMethod = `,

 async execute(interaction: any) {
 // Convert interaction to message-like object for shared logic
 const message = interaction as any;
 message.guild = interaction.guild;
 message.member = interaction.member;
 message.author = interaction.user;
 message.channel = interaction.channel;
 
 // Parse args from interaction options
 const args: string[] = [];
 
 // Reply function wrapper
 const originalReply = message.reply;
 message.reply = async (options: any) => {
 if (interaction.replied || interaction.deferred) {
 return interaction.followUp(options);
 }
 return interaction.reply(options);
 };
 
 // Parse slash command options into args array
 if (interaction.options) {
 interaction.options.data.forEach((opt: any) => {
 if (opt.value !== undefined) {
 args.push(String(opt.value));
 } else if (opt.user) {
 args.push(opt.user.id);
 } else if (opt.channel) {
 args.push(opt.channel.id);
 } else if (opt.role) {
 args.push(opt.role.id);
 }
 });
 }
 
 return this.${sharedFunctionName}(message as Message, args);
 }`;
    
    // Replace the closing }; with shared function + execute + prefixRun
    content = content.replace(
      /async prefixRun\(message: Message, args: string\[\]\) \{[\s\S]*?\n\s*\}\n\};/,
      `${sharedFunction},

 async prefixRun(message: Message, args: string[]) {
 return this.${sharedFunctionName}(message, args);
 }${executeMethod}
};`
    );
    
    // Add ChatInputCommandInteraction import if not present
    if (!content.includes('ChatInputCommandInteraction')) {
      content = content.replace(
        /from 'discord\.js';/,
        `, ChatInputCommandInteraction } from 'discord.js';`
      );
      content = content.replace(
        /} from 'discord\.js';/,
        `, ChatInputCommandInteraction } from 'discord.js';`
      );
    }
    
    // Add SlashCommandBuilder if needed
    if (!content.includes('SlashCommandBuilder')) {
      content = content.replace(
        /from 'discord\.js';/,
        `, SlashCommandBuilder } from 'discord.js';`
      );
    }
    
    // Convert data object to SlashCommandBuilder (basic conversion)
    const dataMatch = content.match(/data: \{[\s\S]*?name: '([^']+)'[\s\S]*?description: '([^']+)'[\s\S]*?\},/);
    if (dataMatch) {
      const [fullMatch, cmdName, cmdDesc] = dataMatch;
      const slashBuilder = `data: new SlashCommandBuilder()
 .setName('${cmdName}')
 .setDescription('${cmdDesc}'),`;
      
      content = content.replace(fullMatch, slashBuilder);
    }
    
    if (content !== originalContent) {
      fs.writeFileSync(fullPath, content, 'utf8');
      console.log(`   ✅ Converted ${filePath} to hybrid`);
      return true;
    } else {
      console.log(`   ⚠️  No changes made to ${filePath}`);
      return false;
    }
  } catch (error) {
    console.error(`   ❌ Error converting ${filePath}:`, error.message);
    return false;
  }
}

console.log('🚀 Starting hybrid command conversion...\n');
console.log('This will convert all commands to support both slash and prefix execution\n');

let convertedCount = 0;
let skippedCount = 0;
let errorCount = 0;

for (const file of commandFiles) {
  const result = convertToHybrid(file);
  if (result === true) {
    convertedCount++;
  } else if (result === false) {
    skippedCount++;
  } else {
    errorCount++;
  }
}

console.log('\n' + '='.repeat(60));
console.log(`✨ Conversion complete!`);
console.log(`   Converted: ${convertedCount}`);
console.log(`   Skipped: ${skippedCount}`);
console.log(`   Errors: ${errorCount}`);
console.log(`   Total: ${commandFiles.length}`);
console.log('='.repeat(60));
