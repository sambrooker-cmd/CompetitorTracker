import * as cheerio from "cheerio";
import { prisma } from "../lib/prisma";
import { fetchHtml } from "./fetchHtml";
import { parseOfferValidity } from "./offerValidity";

const MAX_TITLE_LENGTH = 120;

export interface OfferDiffResult {
  competitorId: number;
  found: number;
  created: number;
  ended: number;
  error: string | null;
}

/**
 * Scrapes a competitor's offers page, extracts one candidate offer per
 * element matched by offerSelector, and diffs the result against
 * currently-active Offer rows:
 *   - text seen before (matched by title) -> lastSeenAt bumped
 *   - text not seen before -> a new Offer, firstSeenAt = now
 *   - a previously-active offer no longer present -> marked inactive, endedAt = now
 * This is what makes "new offer" / "offer ended" alerts possible without
 * diffing whole page markup.
 */
export async function scrapeAndDiffOffers(competitorId: number): Promise<OfferDiffResult> {
  const competitor = await prisma.competitor.findUniqueOrThrow({ where: { id: competitorId } });

  if (!competitor.offersUrl || !competitor.offerSelector) {
    return { competitorId, found: 0, created: 0, ended: 0, error: "No offersUrl/offerSelector configured" };
  }

  let candidates: string[];
  try {
    const html = await fetchHtml(competitor.offersUrl, competitor.renderMode);
    const $ = cheerio.load(html);
    candidates = $(competitor.offerSelector)
      .map((_, el) => $(el).text().replace(/\s+/g, " ").trim())
      .get()
      .filter((text) => text.length > 0);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown scrape error";
    return { competitorId, found: 0, created: 0, ended: 0, error: message };
  }

  const activeOffers = await prisma.offer.findMany({ where: { competitorId, active: true } });
  const now = new Date();
  const matchedActiveIds = new Set<number>();
  let created = 0;

  for (const rawText of candidates) {
    const title = rawText.length > MAX_TITLE_LENGTH ? `${rawText.slice(0, MAX_TITLE_LENGTH)}…` : rawText;
    const existing = activeOffers.find((o) => o.title.toLowerCase() === title.toLowerCase());

    if (existing) {
      matchedActiveIds.add(existing.id);
      await prisma.offer.update({
        where: { id: existing.id },
        data: { lastSeenAt: now, rawText },
      });
    } else {
      const validity = parseOfferValidity(rawText);
      await prisma.offer.create({
        data: {
          competitorId,
          title,
          rawText,
          detail: rawText,
          validFrom: validity.validFrom,
          validUntil: validity.validUntil,
          whileStocksLast: validity.whileStocksLast,
          firstSeenAt: now,
          lastSeenAt: now,
        },
      });
      created++;
    }
  }

  const endedOffers = activeOffers.filter((o) => !matchedActiveIds.has(o.id));
  if (endedOffers.length > 0) {
    await prisma.offer.updateMany({
      where: { id: { in: endedOffers.map((o) => o.id) } },
      data: { active: false, endedAt: now },
    });
  }

  return { competitorId, found: candidates.length, created, ended: endedOffers.length, error: null };
}

const DELAY_BETWEEN_REQUESTS_MS = 1500;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Runs scrapeAndDiffOffers for every competitor that has offer tracking configured. */
export async function scrapeAllOffers(): Promise<OfferDiffResult[]> {
  const competitors = await prisma.competitor.findMany({
    where: { offersUrl: { not: null }, offerSelector: { not: null } },
    select: { id: true },
  });

  const results: OfferDiffResult[] = [];
  for (const competitor of competitors) {
    results.push(await scrapeAndDiffOffers(competitor.id));
    await sleep(DELAY_BETWEEN_REQUESTS_MS);
  }
  return results;
}
