import { Router } from "express";
import { prisma } from "../lib/prisma";

export const alertsRouter = Router();

interface Alert {
  type: "price_drop" | "price_increase" | "new_promo" | "promo_ended" | "scrape_error" | "new_offer" | "offer_ended";
  productId: number | null;
  productName: string;
  competitorName: string;
  detail: string;
  scrapedAt: Date;
}

// GET /api/alerts - derives price-change/promo alerts from the two most
// recent price entries of every tracked sailing, plus new/ended headline
// offers from the Offer table's own first-seen/ended-at diffing.
alertsRouter.get("/", async (_req, res) => {
  const [products, offers] = await Promise.all([
    prisma.product.findMany({
      include: {
        competitor: { select: { name: true } },
        priceEntries: { orderBy: { scrapedAt: "desc" }, take: 2 },
      },
    }),
    prisma.offer.findMany({
      include: { competitor: { select: { name: true } } },
      orderBy: { lastSeenAt: "desc" },
      take: 100,
    }),
  ]);

  const alerts: Alert[] = [];

  for (const product of products) {
    const [latest, previous] = product.priceEntries;
    if (!latest) continue;

    if (latest.error) {
      alerts.push({
        type: "scrape_error",
        productId: product.id,
        productName: product.name,
        competitorName: product.competitor.name,
        detail: latest.error,
        scrapedAt: latest.scrapedAt,
      });
      continue;
    }

    if (previous && latest.price != null && previous.price != null && latest.price !== previous.price) {
      const dropped = latest.price < previous.price;
      alerts.push({
        type: dropped ? "price_drop" : "price_increase",
        productId: product.id,
        productName: product.name,
        competitorName: product.competitor.name,
        detail: `${previous.price} -> ${latest.price} (${product.currency})`,
        scrapedAt: latest.scrapedAt,
      });
    }

    const hadPromoBefore = Boolean(previous?.promoText);
    const hasPromoNow = Boolean(latest.promoText);
    if (hasPromoNow && !hadPromoBefore) {
      alerts.push({
        type: "new_promo",
        productId: product.id,
        productName: product.name,
        competitorName: product.competitor.name,
        detail: latest.promoText!,
        scrapedAt: latest.scrapedAt,
      });
    } else if (!hasPromoNow && hadPromoBefore) {
      alerts.push({
        type: "promo_ended",
        productId: product.id,
        productName: product.name,
        competitorName: product.competitor.name,
        detail: previous!.promoText!,
        scrapedAt: latest.scrapedAt,
      });
    }
  }

  // Offers are diffed at scrape time (see scrapeOffers.ts), so a "new" one
  // is simply one whose firstSeenAt equals its lastSeenAt (only ever seen
  // once) and an "ended" one is any inactive offer with an endedAt.
  for (const offer of offers) {
    if (!offer.active && offer.endedAt) {
      alerts.push({
        type: "offer_ended",
        productId: null,
        productName: offer.title,
        competitorName: offer.competitor.name,
        detail: offer.rawText ?? offer.title,
        scrapedAt: offer.endedAt,
      });
    } else if (offer.active && offer.firstSeenAt.getTime() === offer.lastSeenAt.getTime()) {
      alerts.push({
        type: "new_offer",
        productId: null,
        productName: offer.title,
        competitorName: offer.competitor.name,
        detail: offer.rawText ?? offer.title,
        scrapedAt: offer.firstSeenAt,
      });
    }
  }

  alerts.sort((a, b) => b.scrapedAt.getTime() - a.scrapedAt.getTime());
  res.json(alerts.slice(0, 200));
});
