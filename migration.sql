-- Migration SQL to add paused fields and NoPrefixUser table
-- Run this on your production database

-- Add paused and pausedAt columns to Giveaway table
ALTER TABLE "Giveaway" ADD COLUMN IF NOT EXISTS "paused" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Giveaway" ADD COLUMN IF NOT EXISTS "pausedAt" BIGINT;

-- Create NoPrefixUser table
CREATE TABLE IF NOT EXISTS "NoPrefixUser" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NoPrefixUser_pkey" PRIMARY KEY ("id")
);

-- Create unique index on userId
CREATE UNIQUE INDEX IF NOT EXISTS "NoPrefixUser_userId_key" ON "NoPrefixUser"("userId");

-- Create BlacklistChannel table
CREATE TABLE IF NOT EXISTS "BlacklistChannel" (
    "id" SERIAL NOT NULL,
    "guildId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BlacklistChannel_pkey" PRIMARY KEY ("id")
);

-- Create unique index on guildId, channelId, type
CREATE UNIQUE INDEX IF NOT EXISTS "BlacklistChannel_guildId_channelId_type_key" ON "BlacklistChannel"("guildId", "channelId", "type");
