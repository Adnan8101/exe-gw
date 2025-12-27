#!/bin/bash

echo "=========================================="
echo "  Extreme Giveaways Bot - Deployment"
echo "=========================================="
echo ""

echo "📥 Pulling latest changes from Git..."
git pull

echo ""
echo "🔄 Generating Prisma Client..."
npx prisma generate

echo ""
echo "🔨 Building TypeScript..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed! Aborting deployment."
    exit 1
fi

echo ""
echo "🔄 Restarting bot with PM2..."

# Stop the bot completely first to clear any cached commands
pm2 stop "Exe Giveaways" 2>/dev/null

# Wait for clean shutdown
sleep 3

# Delete the process from PM2 to ensure fresh start and clear command cache
pm2 delete "Exe Giveaways" 2>/dev/null

# Wait before starting to ensure complete cleanup
sleep 2

echo ""
echo "🚀 Starting bot fresh (this will re-register all commands)..."

# Start the bot fresh with NODE_ENV set
NODE_ENV=production pm2 start dist/index.js --name "Exe Giveaways" --time

# Wait for bot to initialize and register commands
echo "⏳ Waiting for bot to initialize and register commands..."
sleep 5

echo ""
echo "✅ Bot restarted successfully!"
echo ""
echo "📊 Checking bot status and logs..."
pm2 status "Exe Giveaways"

echo ""
echo "📝 Recent logs:"
pm2 logs "Exe Giveaways" --lines 15 --nostream

echo ""
echo "=========================================="
echo "  ✨ Deployment Complete!"
echo "=========================================="
echo ""
echo "💡 Important:"
echo "   🔄 Discord commands are now being registered!"
echo "   ⏰ Wait 1-2 minutes for commands to update in Discord"
echo "   🔃 Refresh Discord (Ctrl+R / Cmd+R) after 2 minutes"
echo "   📋 Use /gschedule to verify all 13 options appear"
echo ""
echo "🔧 Useful Commands:"
echo "   - View live logs: pm2 logs 'Exe Giveaways'"
echo "   - Check status: pm2 status"
echo "   - Restart bot: pm2 restart 'Exe Giveaways'"
echo "   - Stop bot: pm2 stop 'Exe Giveaways'"
echo ""
