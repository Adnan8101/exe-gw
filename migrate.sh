#!/bin/bash

# Load environment variables
source .env

# Run all migration SQL files in order
echo "Running migrations..."
PGPASSWORD=$DB_PASSWORD psql -h 136.112.235.116 -U postgres -d exe-giveaway-2 << EOF
\i migration.sql
\i migration-allowedguild.sql
\i migration-badge.sql
\i migration-ignoredchannel.sql
\i migration-moderation.sql
\i migration-complete.sql
EOF

echo "All migrations complete!"
