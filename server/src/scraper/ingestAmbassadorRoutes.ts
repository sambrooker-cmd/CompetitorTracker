import { prisma } from "../lib/prisma";
import { scrapeListingCards, type ListingCard } from "./scrapeListingCards";
import type { RouteType } from "../lib/constants";

const AMBASSADOR_SEARCH_URL = "https://www.ambassadorcruiseline.com/search/";
const AMBASSADOR_BASE_URL = "https://www.ambassadorcruiseline.com";

/**
 * Ambassador's search-result cards (verified against a real card,
 * 2026-09-07): the card itself is the <a> (no nested link, hence
 * urlSelector: null), and the duration value has no selector of its own —
 * it's a plain sibling div following the label div that contains the
 * "Moon" icon, so it's targeted via that icon as a landmark rather than a
 * class.
 *
 * flyIndicatorSelector is UNCONFIRMED — the one card seen so far is an
 * ex-UK sailing (departure: a UK port, no fly-related icon/text at all),
 * so there's no real example yet of what a fly-Caribbean card looks like
 * for Ambassador. Guessing a "Plane" icon by analogy with the Calendar/
 * Moon/Anchor/Ship icons already seen — needs confirming against a real
 * fly-cruise card before this is trusted.
 */
const AMBASSADOR_LISTING_CONFIG = {
  cardSelector: "a[data-id]",
  nameSelector: "h4",
  urlSelector: null as string | null,
  nightsSelector: 'div:has(svg[name="Moon"]) + div',
  flyIndicatorSelector: 'svg[name="Plane"]',
};

export interface AmbassadorIngestResult {
  found: number;
  created: number;
  updated: number;
  skippedNoNights: number;
  error: string | null;
}

/**
 * Scrapes Ambassador's own search page and upserts each card as an
 * AmbassadorRoute. Unlike competitor discovery, there's no "out of scope"
 * filtering step here — every card IS one of Ambassador's own ex_uk or
 * fly_caribbean sailings by definition, since that's the whole of their
 * product. Routes are deduped by exact (destination name, routeType) —
 * a repeat sighting widens the night-count range rather than creating a
 * duplicate; a genuinely different itinerary under a similar marketing
 * name (e.g. "Spring Fjordland" vs "Autumn Fjordland") is intentionally
 * kept as its own route rather than guessed into one, since collapsing
 * them requires a judgement call about what counts as "the same route"
 * that's easy to get wrong automatically — do that by hand afterward via
 * the AmbassadorRoute API if it's over-fragmented.
 */
export async function ingestAmbassadorRoutes(): Promise<AmbassadorIngestResult> {
  let cards;
  try {
    cards = await scrapeListingCards({
      url: AMBASSADOR_SEARCH_URL,
      baseUrl: AMBASSADOR_BASE_URL,
      renderMode: "static",
      ...AMBASSADOR_LISTING_CONFIG,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown ingest error";
    return { found: 0, created: 0, updated: 0, skippedNoNights: 0, error: message };
  }
  return ingestCards(cards);
}

/** Upsert logic split out from the fetch step so it's testable with synthetic cards. */
export async function ingestCards(cards: ListingCard[]): Promise<AmbassadorIngestResult> {
  let created = 0;
  let updated = 0;
  let skippedNoNights = 0;

  for (const card of cards) {
    if (card.nights == null) {
      skippedNoNights++;
      continue;
    }

    const routeType: RouteType = card.isFly ? "fly_caribbean" : "ex_uk";
    const existing = await prisma.ambassadorRoute.findFirst({ where: { destination: card.name, routeType } });

    if (existing) {
      await prisma.ambassadorRoute.update({
        where: { id: existing.id },
        data: {
          nightsMin: Math.min(existing.nightsMin, card.nights),
          nightsMax: Math.max(existing.nightsMax, card.nights),
          sourceUrl: card.url,
          lastSeenAt: new Date(),
        },
      });
      updated++;
    } else {
      await prisma.ambassadorRoute.create({
        data: {
          destination: card.name,
          routeType,
          nightsMin: card.nights,
          nightsMax: card.nights,
          sourceUrl: card.url,
        },
      });
      created++;
    }
  }

  return { found: cards.length, created, updated, skippedNoNights, error: null };
}
