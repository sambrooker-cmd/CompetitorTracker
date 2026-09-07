import { Router } from "express";
import { prisma } from "../lib/prisma";

export const alertsRouter = Router();

interface Alert {
  type: "price_drop" | "price_increase" | "new_promo" | "promo_ended" | "scrape_error";
  productId: number;
  productName: string;
  competitorName: string;
  detail: string;
  scrapedAt: Date;
}

// GET /api/alerts - derives price-change and promo alerts from the two most
// recent price entries of every product.
alertsRouter.get("/", async (_req, res) => {
  const products = await prisma.product.findMany({
    include: {
      competitor: { select: { name: true } },
      priceEntries: { orderBy: { scrapedAt: "desc" }, take: 2 },
    },
  });

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

  alerts.sort((a, b) => b.scrapedAt.getTime() - a.scrapedAt.getTime());
  res.json(alerts);
});
