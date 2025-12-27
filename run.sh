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

# Wait a moment for clean shutdown
sleep 2

# Delete the process from PM2 to ensure fresh start
pm2 delete "Exe Giveaways" 2>/dev/null

# Start the bot fresh
pm2 start dist/index.js --name "Exe Giveaways"

echo ""
echo "✅ Bot restarted successfully!"
echo ""
echo "📊 Checking status..."
pm2 status "Exe Giveaways"

echo ""
echo "=========================================="
echo "  ✨ Deployment Complete!"
echo "=========================================="
echo ""
echo "💡 Tips:"
echo "   - View logs: pm2 logs 'Exe Giveaways'"
echo "   - Check status: pm2 status"
echo "   - Reload Discord (Ctrl+R) to see updated commands"
echo ""
