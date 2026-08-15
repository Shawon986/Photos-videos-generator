-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Generation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "negativePrompt" TEXT,
    "model" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'QUEUED',
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "numImages" INTEGER NOT NULL DEFAULT 1,
    "duration" INTEGER,
    "seed" INTEGER,
    "steps" INTEGER,
    "guidanceScale" REAL,
    "motionStrength" REAL,
    "quality" TEXT,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "resultUrl" TEXT,
    "thumbnailUrl" TEXT,
    "sourceImageUrl" TEXT,
    "errorMessage" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Generation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Generation" ("createdAt", "duration", "errorMessage", "guidanceScale", "height", "id", "isDemo", "model", "motionStrength", "negativePrompt", "prompt", "provider", "quality", "resultUrl", "seed", "sourceImageUrl", "status", "steps", "thumbnailUrl", "type", "updatedAt", "userId", "width") SELECT "createdAt", "duration", "errorMessage", "guidanceScale", "height", "id", "isDemo", "model", "motionStrength", "negativePrompt", "prompt", "provider", "quality", "resultUrl", "seed", "sourceImageUrl", "status", "steps", "thumbnailUrl", "type", "updatedAt", "userId", "width" FROM "Generation";
DROP TABLE "Generation";
ALTER TABLE "new_Generation" RENAME TO "Generation";
CREATE INDEX "Generation_userId_createdAt_idx" ON "Generation"("userId", "createdAt");
CREATE INDEX "Generation_status_idx" ON "Generation"("status");
CREATE INDEX "Generation_type_idx" ON "Generation"("type");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
