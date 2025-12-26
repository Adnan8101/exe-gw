#!/bin/bash

# Deploy and run migration on remote server
# Usage: ./deploy-migration.sh [ssh-host]

SSH_HOST=${1:-"your-server-address"}
REMOTE_DIR="/home/snaps_pvt_3/exe-gw"

echo "Deploying migration to $SSH_HOST..."

# Copy migration files to server
scp migration.sql migrate.sh "$SSH_HOST:$REMOTE_DIR/"

echo "Running migration on server..."

# SSH and execute migration
ssh "$SSH_HOST" << 'ENDSSH'
cd /home/snaps_pvt_3/exe-gw
chmod +x migrate.sh
./migrate.sh
ENDSSH

echo "Migration deployment complete!"
