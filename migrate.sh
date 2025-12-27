#!/bin/bash

# Load environment variables
source .env

# Run migration SQL files in order
echo "Running base migration..."
PGPASSWORD=$DB_PASSWORD psql -h 136.112.235.116 -U postgres -d exe-giveaway-2 -f migration.sql

echo "Running allowed guild migration..."
PGPASSWORD=$DB_PASSWORD psql -h 136.112.235.116 -U postgres -d exe-giveaway-2 -f migration-allowedguild.sql

echo "Running badge migration..."
PGPASSWORD=$DB_PASSWORD psql -h 136.112.235.116 -U postgres -d exe-giveaway-2 -f migration-badge.sql

echo "All migrations complete! Restarting bot..."
pm2 restart "Exe Giveaways"
