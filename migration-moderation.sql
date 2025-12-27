-- CreateTable
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

-- CreateUniqueIndex
CREATE UNIQUE INDEX IF NOT EXISTS "ModerationCase_caseId_key" ON "ModerationCase"("caseId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ModerationCase_guildId_idx" ON "ModerationCase"("guildId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ModerationCase_targetId_idx" ON "ModerationCase"("targetId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ModerationCase_moderatorId_idx" ON "ModerationCase"("moderatorId");

-- CreateTable for Warning if not exists
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

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Warning_guildId_userId_idx" ON "Warning"("guildId", "userId");

-- CreateTable for LockedRole if not exists
CREATE TABLE IF NOT EXISTS "LockedRole" (
    "id" SERIAL NOT NULL,
    "guildId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "lockedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LockedRole_pkey" PRIMARY KEY ("id")
);

-- CreateUniqueIndex
CREATE UNIQUE INDEX IF NOT EXISTS "LockedRole_guildId_roleId_key" ON "LockedRole"("guildId", "roleId");

-- CreateTable for TemporaryRole if not exists
CREATE TABLE IF NOT EXISTS "TemporaryRole" (
    "id" SERIAL NOT NULL,
    "guildId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TemporaryRole_pkey" PRIMARY KEY ("id")
);

-- CreateUniqueIndex
CREATE UNIQUE INDEX IF NOT EXISTS "TemporaryRole_guildId_userId_roleId_key" ON "TemporaryRole"("guildId", "userId", "roleId");
