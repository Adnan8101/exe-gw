#!/bin/bash

# Load environment variables
source .env

# Run migration SQL
PGPASSWORD=$DB_PASSWORD psql -h 136.112.235.116 -U postgres -d exe-giveaway-2 -f migration.sql

echo "Migration complete! Restarting bot..."
pm2 restart "Exe Giveaways"
