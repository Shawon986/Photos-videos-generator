-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_GenerationAsset" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "generationId" TEXT,
    "userId" TEXT,
    "kind" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GenerationAsset_generationId_fkey" FOREIGN KEY ("generationId") REFERENCES "Generation" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_GenerationAsset" ("createdAt", "generationId", "height", "id", "kind", "mimeType", "sizeBytes", "storageKey", "url", "width") SELECT "createdAt", "generationId", "height", "id", "kind", "mimeType", "sizeBytes", "storageKey", "url", "width" FROM "GenerationAsset";
DROP TABLE "GenerationAsset";
ALTER TABLE "new_GenerationAsset" RENAME TO "GenerationAsset";
CREATE INDEX "GenerationAsset_generationId_idx" ON "GenerationAsset"("generationId");
CREATE INDEX "GenerationAsset_userId_kind_idx" ON "GenerationAsset"("userId", "kind");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
