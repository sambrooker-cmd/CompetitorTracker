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

  interface Candidate {
    title: string;
    rawText: string;
  }

  let candidates: Candidate[];
  try {
    const html = await fetchHtml(competitor.offersUrl, competitor.renderMode);
    const $ = cheerio.load(html);
    candidates = $(competitor.offerSelector)
      .map((_, el) => {
        const $el = $(el);
        const rawText = $el.text().replace(/\s+/g, " ").trim();
        // Prefer a heading inside the offer element as the stable "title" to
        // key on — falling back to a truncated slice of the full text keeps
        // a copy tweak in the body from reading as a brand-new offer when
        // the same heading is still there (e.g. P&O's "Just a 10% deposit").
        const heading = $el.find("h1,h2,h3,h4,h5,h6").first().text().replace(/\s+/g, " ").trim();
        const title = heading || (rawText.length > MAX_TITLE_LENGTH ? `${rawText.slice(0, MAX_TITLE_LENGTH)}…` : rawText);
        return { title, rawText };
      })
      .get()
      .filter((c) => c.rawText.length > 0);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown scrape error";
    return { competitorId, found: 0, created: 0, ended: 0, error: message };
  }

  // A listing/search-results page (e.g. a "deals" page with one offer
  // badge per cruise card) can match the same offer text many times in
  // one scrape — dedupe by title so repeats update one Offer row instead
  // of creating a new one per occurrence.
  const seenTitles = new Set<string>();
  candidates = candidates.filter((c) => {
    const key = c.title.toLowerCase();
    if (seenTitles.has(key)) return false;
    seenTitles.add(key);
    return true;
  });

  const activeOffers = await prisma.offer.findMany({ where: { competitorId, active: true } });
  const now = new Date();
  const matchedActiveIds = new Set<number>();
  let created = 0;

  for (const { title, rawText } of candidates) {
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
