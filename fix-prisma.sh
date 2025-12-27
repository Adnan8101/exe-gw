#!/bin/bash

FILES=(
"src/utils/permissions.ts"
"src/utils/requirements.ts"
"src/commands/general/messages.ts"
"src/commands/general/badge.ts"
"src/commands/general/bsetting.ts"
"src/commands/general/leaderboard.ts"
"src/commands/general/invites.ts"
"src/commands/general/vc.ts"
"src/commands/admin/bga.ts"
"src/commands/admin/blacklist.ts"
"src/commands/admin/bgr.ts"
"src/commands/admin/np.ts"
"src/commands/admin/guildmanage.ts"
"src/commands/admin/set_giveaway_admin.ts"
"src/commands/admin/setprefix.ts"
"src/commands/giveaways/history.ts"
"src/commands/giveaways/refresh.ts"
"src/commands/giveaways/start.ts"
"src/commands/giveaways/cancel.ts"
"src/commands/giveaways/create.ts"
"src/index.ts"
"src/events/reactionHandler.ts"
"src/services/InviteService.ts"
"src/services/Tracker.ts"
"src/services/GiveawayService.ts"
"src/services/SchedulerService.ts"
)

for file in "${FILES[@]}"; do
    echo "Processing: $file"
    
    sed -i.bak "/^import.*PrismaClient.*from '@prisma\/client';$/d" "$file"
    
    sed -i.bak "/^const prisma = new PrismaClient();$/d" "$file"
    
    if ! grep -q "import { prisma } from" "$file"; then
        DEPTH=$(echo "$file" | sed 's/[^/]//g' | wc -c | tr -d ' ')
        DEPTH=$((DEPTH - 2))
        
        UTILS_PATH="../"
        for ((i=1; i<DEPTH; i++)); do
            UTILS_PATH="../$UTILS_PATH"
        done
        UTILS_PATH="${UTILS_PATH}utils/database"
        
        sed -i.bak "1i\\
import { prisma } from '$UTILS_PATH';\\
" "$file"
    fi
    
    rm -f "$file.bak"
done

echo "Done! All files have been updated to use shared prisma instance."
