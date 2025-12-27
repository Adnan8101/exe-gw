-- Add IgnoredChannel table for channel ignore feature
CREATE TABLE IF NOT EXISTS "IgnoredChannel" (
    "id" SERIAL PRIMARY KEY,
    "guildId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "IgnoredChannel_guildId_channelId_key" UNIQUE ("guildId", "channelId")
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS "IgnoredChannel_guildId_channelId_idx" ON "IgnoredChannel"("guildId", "channelId");
