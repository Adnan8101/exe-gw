#!/bin/bash
git pull
npx prisma generate
npm run build
pm2 restart "Exe Giveaways" || pm2 start dist/index.js --name "Exe Giveaways"
