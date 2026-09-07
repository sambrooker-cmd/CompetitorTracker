-- AlterTable
ALTER TABLE "Competitor" ADD COLUMN "listingCardSelector" TEXT;
ALTER TABLE "Competitor" ADD COLUMN "listingFlyIndicatorSelector" TEXT;
ALTER TABLE "Competitor" ADD COLUMN "listingNameSelector" TEXT;
ALTER TABLE "Competitor" ADD COLUMN "listingNightsSelector" TEXT;
ALTER TABLE "Competitor" ADD COLUMN "listingUrl" TEXT;
ALTER TABLE "Competitor" ADD COLUMN "listingUrlSelector" TEXT;

-- CreateTable
CREATE TABLE "CabinSelectorTemplate" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "competitorId" INTEGER NOT NULL,
    "cabinType" TEXT NOT NULL,
    "priceSelector" TEXT NOT NULL,
    "promoSelector" TEXT,
    "renderMode" TEXT NOT NULL DEFAULT 'static',
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CabinSelectorTemplate_competitorId_fkey" FOREIGN KEY ("competitorId") REFERENCES "Competitor" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AmbassadorRoute" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "destination" TEXT NOT NULL,
    "routeType" TEXT NOT NULL,
    "nightsMin" INTEGER NOT NULL,
    "nightsMax" INTEGER NOT NULL,
    "departurePort" TEXT,
    "sourceUrl" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "firstSeenAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "DiscoveredSailing" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "competitorId" INTEGER NOT NULL,
    "matchedRouteId" INTEGER,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "destination" TEXT,
    "nights" INTEGER,
    "routeType" TEXT,
    "priceHint" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "discoveredAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" DATETIME,
    CONSTRAINT "DiscoveredSailing_competitorId_fkey" FOREIGN KEY ("competitorId") REFERENCES "Competitor" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DiscoveredSailing_matchedRouteId_fkey" FOREIGN KEY ("matchedRouteId") REFERENCES "AmbassadorRoute" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "CabinSelectorTemplate_competitorId_cabinType_key" ON "CabinSelectorTemplate"("competitorId", "cabinType");

-- CreateIndex
CREATE INDEX "AmbassadorRoute_routeType_destination_idx" ON "AmbassadorRoute"("routeType", "destination");

-- CreateIndex
CREATE INDEX "DiscoveredSailing_competitorId_status_idx" ON "DiscoveredSailing"("competitorId", "status");
