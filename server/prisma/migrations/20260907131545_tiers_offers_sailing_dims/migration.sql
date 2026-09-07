/*
  Warnings:

  - Added the required column `tier` to the `Competitor` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "Offer" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "competitorId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "detail" TEXT,
    "rawText" TEXT,
    "validFrom" DATETIME,
    "validUntil" DATETIME,
    "whileStocksLast" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "firstSeenAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" DATETIME,
    CONSTRAINT "Offer_competitorId_fkey" FOREIGN KEY ("competitorId") REFERENCES "Competitor" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Competitor" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "website" TEXT NOT NULL,
    "tier" TEXT NOT NULL,
    "parentGroup" TEXT,
    "notes" TEXT,
    "offersUrl" TEXT,
    "offerSelector" TEXT,
    "renderMode" TEXT NOT NULL DEFAULT 'static',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Competitor" ("createdAt", "id", "name", "notes", "website") SELECT "createdAt", "id", "name", "notes", "website" FROM "Competitor";
DROP TABLE "Competitor";
ALTER TABLE "new_Competitor" RENAME TO "Competitor";
CREATE TABLE "new_Product" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "priceSelector" TEXT NOT NULL,
    "promoSelector" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'GBP',
    "routeType" TEXT,
    "destination" TEXT,
    "nights" INTEGER,
    "cabinType" TEXT,
    "renderMode" TEXT NOT NULL DEFAULT 'static',
    "competitorId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Product_competitorId_fkey" FOREIGN KEY ("competitorId") REFERENCES "Competitor" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Product" ("competitorId", "createdAt", "currency", "id", "name", "priceSelector", "promoSelector", "url") SELECT "competitorId", "createdAt", "currency", "id", "name", "priceSelector", "promoSelector", "url" FROM "Product";
DROP TABLE "Product";
ALTER TABLE "new_Product" RENAME TO "Product";
CREATE INDEX "Product_competitorId_idx" ON "Product"("competitorId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "Offer_competitorId_active_idx" ON "Offer"("competitorId", "active");
