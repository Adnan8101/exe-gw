#!/bin/bash
npm run build
pm2 start dist/index.js --name "Exe Giveaways"
