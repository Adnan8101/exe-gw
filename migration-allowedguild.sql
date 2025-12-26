-- Add AllowedGuild table for guild whitelist
CREATE TABLE IF NOT EXISTS "AllowedGuild" (
    "id" SERIAL PRIMARY KEY,
    "guildId" TEXT NOT NULL UNIQUE,
    "guildName" TEXT NOT NULL,
    "addedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS "AllowedGuild_guildId_idx" ON "AllowedGuild"("guildId");
