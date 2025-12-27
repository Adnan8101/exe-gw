-- Complete Migration SQL for all schema updates
-- Run this on your production database

-- ============================================
-- GIVEAWAY TABLES
-- ============================================

-- Create Giveaway table if not exists
CREATE TABLE IF NOT EXISTS "Giveaway" (
    "id" SERIAL NOT NULL,
    "messageId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "hostId" TEXT NOT NULL,
    "prize" TEXT NOT NULL,
    "winnersCount" INTEGER NOT NULL,
    "endTime" BIGINT NOT NULL,
    "ended" BOOLEAN NOT NULL DEFAULT false,
    "paused" BOOLEAN NOT NULL DEFAULT false,
    "pausedAt" BIGINT,
    "createdAt" BIGINT NOT NULL,
    "customMessage" TEXT,
    "roleRequirement" TEXT,
    "inviteRequirement" INTEGER NOT NULL DEFAULT 0,
    "accountAgeRequirement" INTEGER NOT NULL DEFAULT 0,
    "serverAgeRequirement" INTEGER NOT NULL DEFAULT 0,
    "captchaRequirement" BOOLEAN NOT NULL DEFAULT false,
    "messageRequired" INTEGER NOT NULL DEFAULT 0,
    "voiceRequirement" INTEGER NOT NULL DEFAULT 0,
    "assignRole" TEXT,
    "winnerRole" TEXT,
    "thumbnail" TEXT,
    "emoji" TEXT NOT NULL DEFAULT '🎉',

    CONSTRAINT "Giveaway_pkey" PRIMARY KEY ("id")
);

-- Add new columns to existing Giveaway table
ALTER TABLE "Giveaway" ADD COLUMN IF NOT EXISTS "paused" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Giveaway" ADD COLUMN IF NOT EXISTS "pausedAt" BIGINT;
ALTER TABLE "Giveaway" ADD COLUMN IF NOT EXISTS "customMessage" TEXT;
ALTER TABLE "Giveaway" ADD COLUMN IF NOT EXISTS "roleRequirement" TEXT;
ALTER TABLE "Giveaway" ADD COLUMN IF NOT EXISTS "inviteRequirement" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Giveaway" ADD COLUMN IF NOT EXISTS "accountAgeRequirement" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Giveaway" ADD COLUMN IF NOT EXISTS "serverAgeRequirement" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Giveaway" ADD COLUMN IF NOT EXISTS "captchaRequirement" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Giveaway" ADD COLUMN IF NOT EXISTS "messageRequired" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Giveaway" ADD COLUMN IF NOT EXISTS "voiceRequirement" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Giveaway" ADD COLUMN IF NOT EXISTS "assignRole" TEXT;
ALTER TABLE "Giveaway" ADD COLUMN IF NOT EXISTS "winnerRole" TEXT;
ALTER TABLE "Giveaway" ADD COLUMN IF NOT EXISTS "thumbnail" TEXT;
ALTER TABLE "Giveaway" ADD COLUMN IF NOT EXISTS "emoji" TEXT NOT NULL DEFAULT '🎉';

-- Create unique index on messageId
CREATE UNIQUE INDEX IF NOT EXISTS "Giveaway_messageId_key" ON "Giveaway"("messageId");

-- Create Participant table
CREATE TABLE IF NOT EXISTS "Participant" (
    "id" SERIAL NOT NULL,
    "giveawayId" INTEGER NOT NULL,
    "userId" TEXT NOT NULL,
    "joinedAt" BIGINT NOT NULL,

    CONSTRAINT "Participant_pkey" PRIMARY KEY ("id")
);

-- Create Winner table
CREATE TABLE IF NOT EXISTS "Winner" (
    "id" SERIAL NOT NULL,
    "giveawayId" INTEGER NOT NULL,
    "userId" TEXT NOT NULL,
    "wonAt" BIGINT NOT NULL,

    CONSTRAINT "Winner_pkey" PRIMARY KEY ("id")
);

-- Create ScheduledGiveaway table
CREATE TABLE IF NOT EXISTS "ScheduledGiveaway" (
    "id" SERIAL NOT NULL,
    "channelId" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "hostId" TEXT NOT NULL,
    "prize" TEXT NOT NULL,
    "winnersCount" INTEGER NOT NULL,
    "payload" TEXT NOT NULL,
    "startTime" BIGINT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScheduledGiveaway_pkey" PRIMARY KEY ("id")
);

-- ============================================
-- USER STATS & TRACKING TABLES
-- ============================================

-- Create UserStats table
CREATE TABLE IF NOT EXISTS "UserStats" (
    "id" SERIAL NOT NULL,
    "guildId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "messageCount" INTEGER NOT NULL DEFAULT 0,
    "voiceMinutes" INTEGER NOT NULL DEFAULT 0,
    "inviteCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "UserStats_pkey" PRIMARY KEY ("id")
);

-- Create unique index on guildId and userId
CREATE UNIQUE INDEX IF NOT EXISTS "UserStats_guildId_userId_key" ON "UserStats"("guildId", "userId");

-- Create InviteTracker table
CREATE TABLE IF NOT EXISTS "InviteTracker" (
    "id" SERIAL NOT NULL,
    "guildId" TEXT NOT NULL,
    "inviterId" TEXT NOT NULL,
    "inviteeId" TEXT NOT NULL,
    "code" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InviteTracker_pkey" PRIMARY KEY ("id")
);

-- Create unique index on guildId and inviteeId
CREATE UNIQUE INDEX IF NOT EXISTS "InviteTracker_guildId_inviteeId_key" ON "InviteTracker"("guildId", "inviteeId");

-- ============================================
-- CONFIGURATION TABLES
-- ============================================

-- Create BirthdayConfig table
CREATE TABLE IF NOT EXISTS "BirthdayConfig" (
    "id" SERIAL NOT NULL,
    "guildId" TEXT NOT NULL,
    "birthdayRole" TEXT,
    "pingRole" TEXT,
    "message" TEXT,

    CONSTRAINT "BirthdayConfig_pkey" PRIMARY KEY ("id")
);

-- Create unique index on guildId
CREATE UNIQUE INDEX IF NOT EXISTS "BirthdayConfig_guildId_key" ON "BirthdayConfig"("guildId");

-- Create GiveawayConfig table
CREATE TABLE IF NOT EXISTS "GiveawayConfig" (
    "guildId" TEXT NOT NULL,
    "managerRole" TEXT,
    "prefix" TEXT NOT NULL DEFAULT '!',

    CONSTRAINT "GiveawayConfig_pkey" PRIMARY KEY ("guildId")
);

-- ============================================
-- ADMIN & PERMISSION TABLES
-- ============================================

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

-- Create AllowedGuild table
CREATE TABLE IF NOT EXISTS "AllowedGuild" (
    "id" SERIAL NOT NULL,
    "guildId" TEXT NOT NULL,
    "guildName" TEXT NOT NULL,
    "addedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AllowedGuild_pkey" PRIMARY KEY ("id")
);

-- Create unique index on guildId
CREATE UNIQUE INDEX IF NOT EXISTS "AllowedGuild_guildId_key" ON "AllowedGuild"("guildId");

-- Create UserBadge table
CREATE TABLE IF NOT EXISTS "UserBadge" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "badge" TEXT NOT NULL,
    "addedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserBadge_pkey" PRIMARY KEY ("id")
);

-- Create unique index on userId and badge
CREATE UNIQUE INDEX IF NOT EXISTS "UserBadge_userId_badge_key" ON "UserBadge"("userId", "badge");

-- Create IgnoredChannel table
CREATE TABLE IF NOT EXISTS "IgnoredChannel" (
    "id" SERIAL NOT NULL,
    "guildId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IgnoredChannel_pkey" PRIMARY KEY ("id")
);

-- Create unique index on guildId and channelId
CREATE UNIQUE INDEX IF NOT EXISTS "IgnoredChannel_guildId_channelId_key" ON "IgnoredChannel"("guildId", "channelId");

-- ============================================
-- MODERATION TABLES
-- ============================================

-- Create ModerationCase table
CREATE TABLE IF NOT EXISTS "ModerationCase" (
    "id" SERIAL NOT NULL,
    "caseId" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "targetTag" TEXT NOT NULL,
    "moderatorId" TEXT NOT NULL,
    "moderatorTag" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "reason" TEXT,
    "duration" BIGINT,
    "silent" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "ModerationCase_pkey" PRIMARY KEY ("id")
);

-- Create unique index on caseId
CREATE UNIQUE INDEX IF NOT EXISTS "ModerationCase_caseId_key" ON "ModerationCase"("caseId");

-- Create indexes
CREATE INDEX IF NOT EXISTS "ModerationCase_guildId_idx" ON "ModerationCase"("guildId");
CREATE INDEX IF NOT EXISTS "ModerationCase_targetId_idx" ON "ModerationCase"("targetId");
CREATE INDEX IF NOT EXISTS "ModerationCase_moderatorId_idx" ON "ModerationCase"("moderatorId");

-- Create Warning table
CREATE TABLE IF NOT EXISTS "Warning" (
    "id" SERIAL NOT NULL,
    "guildId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "moderatorId" TEXT NOT NULL,
    "reason" TEXT,
    "caseId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Warning_pkey" PRIMARY KEY ("id")
);

-- Create index
CREATE INDEX IF NOT EXISTS "Warning_guildId_userId_idx" ON "Warning"("guildId", "userId");

-- Create LockedRole table
CREATE TABLE IF NOT EXISTS "LockedRole" (
    "id" SERIAL NOT NULL,
    "guildId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "lockedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LockedRole_pkey" PRIMARY KEY ("id")
);

-- Create unique index on guildId and roleId
CREATE UNIQUE INDEX IF NOT EXISTS "LockedRole_guildId_roleId_key" ON "LockedRole"("guildId", "roleId");

-- Create TemporaryRole table
CREATE TABLE IF NOT EXISTS "TemporaryRole" (
    "id" SERIAL NOT NULL,
    "guildId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TemporaryRole_pkey" PRIMARY KEY ("id")
);

-- Create index on expiresAt for efficient cleanup queries
CREATE INDEX IF NOT EXISTS "TemporaryRole_expiresAt_idx" ON "TemporaryRole"("expiresAt");

-- ============================================
-- FOREIGN KEY CONSTRAINTS (Optional)
-- ============================================

-- Add foreign key constraints for Participant
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'Participant_giveawayId_fkey'
    ) THEN
        ALTER TABLE "Participant" ADD CONSTRAINT "Participant_giveawayId_fkey" 
        FOREIGN KEY ("giveawayId") REFERENCES "Giveaway"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- Add foreign key constraints for Winner
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'Winner_giveawayId_fkey'
    ) THEN
        ALTER TABLE "Winner" ADD CONSTRAINT "Winner_giveawayId_fkey" 
        FOREIGN KEY ("giveawayId") REFERENCES "Giveaway"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
