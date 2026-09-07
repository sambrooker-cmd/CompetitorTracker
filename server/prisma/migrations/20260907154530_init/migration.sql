-- CreateTable
CREATE TABLE "Competitor" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "website" TEXT NOT NULL,
    "tier" TEXT NOT NULL,
    "parentGroup" TEXT,
    "notes" TEXT,
    "offersUrl" TEXT,
    "offerSelector" TEXT,
    "renderMode" TEXT NOT NULL DEFAULT 'static',
    "listingUrl" TEXT,
    "listingCardSelector" TEXT,
    "listingNameSelector" TEXT,
    "listingUrlSelector" TEXT,
    "listingNightsSelector" TEXT,
    "listingFlyIndicatorSelector" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Competitor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CabinSelectorTemplate" (
    "id" SERIAL NOT NULL,
    "competitorId" INTEGER NOT NULL,
    "cabinType" TEXT NOT NULL,
    "priceSelector" TEXT NOT NULL,
    "promoSelector" TEXT,
    "renderMode" TEXT NOT NULL DEFAULT 'static',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CabinSelectorTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AmbassadorRoute" (
    "id" SERIAL NOT NULL,
    "destination" TEXT NOT NULL,
    "routeType" TEXT NOT NULL,
    "nightsMin" INTEGER NOT NULL,
    "nightsMax" INTEGER NOT NULL,
    "departurePort" TEXT,
    "sourceUrl" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AmbassadorRoute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiscoveredSailing" (
    "id" SERIAL NOT NULL,
    "competitorId" INTEGER NOT NULL,
    "matchedRouteId" INTEGER,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "destination" TEXT,
    "nights" INTEGER,
    "routeType" TEXT,
    "priceHint" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "discoveredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "DiscoveredSailing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" SERIAL NOT NULL,
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
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PriceEntry" (
    "id" SERIAL NOT NULL,
    "productId" INTEGER NOT NULL,
    "price" DOUBLE PRECISION,
    "promoText" TEXT,
    "rawPrice" TEXT,
    "error" TEXT,
    "scrapedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PriceEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Offer" (
    "id" SERIAL NOT NULL,
    "competitorId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "detail" TEXT,
    "rawText" TEXT,
    "validFrom" TIMESTAMP(3),
    "validUntil" TIMESTAMP(3),
    "whileStocksLast" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),

    CONSTRAINT "Offer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CabinSelectorTemplate_competitorId_cabinType_key" ON "CabinSelectorTemplate"("competitorId", "cabinType");

-- CreateIndex
CREATE INDEX "AmbassadorRoute_routeType_destination_idx" ON "AmbassadorRoute"("routeType", "destination");

-- CreateIndex
CREATE INDEX "DiscoveredSailing_competitorId_status_idx" ON "DiscoveredSailing"("competitorId", "status");

-- CreateIndex
CREATE INDEX "Product_competitorId_idx" ON "Product"("competitorId");

-- CreateIndex
CREATE INDEX "PriceEntry_productId_scrapedAt_idx" ON "PriceEntry"("productId", "scrapedAt");

-- CreateIndex
CREATE INDEX "Offer_competitorId_active_idx" ON "Offer"("competitorId", "active");

-- AddForeignKey
ALTER TABLE "CabinSelectorTemplate" ADD CONSTRAINT "CabinSelectorTemplate_competitorId_fkey" FOREIGN KEY ("competitorId") REFERENCES "Competitor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiscoveredSailing" ADD CONSTRAINT "DiscoveredSailing_competitorId_fkey" FOREIGN KEY ("competitorId") REFERENCES "Competitor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiscoveredSailing" ADD CONSTRAINT "DiscoveredSailing_matchedRouteId_fkey" FOREIGN KEY ("matchedRouteId") REFERENCES "AmbassadorRoute"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_competitorId_fkey" FOREIGN KEY ("competitorId") REFERENCES "Competitor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceEntry" ADD CONSTRAINT "PriceEntry_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_competitorId_fkey" FOREIGN KEY ("competitorId") REFERENCES "Competitor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
