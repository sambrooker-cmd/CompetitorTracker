import { prisma } from "../lib/prisma";
import { scrapeListingCards } from "./scrapeListingCards";
import { CARIBBEAN_KEYWORDS } from "../lib/constants";
import type { RouteType } from "../lib/constants";

export interface DiscoveredCandidate {
  name: string;
  url: string;
  destination: string;
  nights: number | null;
  /** null means "out of scope" (e.g. a fly-cruise to a non-Caribbean destination) — never queued. */
  routeType: RouteType | null;
}

function isCaribbean(destination: string): boolean {
  const norm = destination.toLowerCase();
  return CARIBBEAN_KEYWORDS.some((kw) => norm.includes(kw));
}

/**
 * Scrapes a competitor's search/listing page (e.g. Fred. Olsen's
 * /cruise-deals) for candidate cruises, classifying each as ex_uk,
 * fly_caribbean, or out-of-scope (routeType: null) — Ambassador only
 * tracks the first two, so anything else (e.g. a fly-cruise to Spain) is
 * classified but never queued for review.
 *
 * Destination is approximated from the cruise name (there's rarely a
 * separate "destination" field on a listing card) — good enough for the
 * Caribbean-keyword check and for fuzzy matching against AmbassadorRoute
 * in matchRoute.ts, not meant to be a clean destination label.
 */
export async function discoverListing(competitorId: number): Promise<DiscoveredCandidate[]> {
  const competitor = await prisma.competitor.findUniqueOrThrow({ where: { id: competitorId } });

  const hasNameSource = competitor.listingNameSelector || competitor.listingNameAttr;
  if (!competitor.listingUrl || !competitor.listingCardSelector || !hasNameSource) {
    return [];
  }

  const cards = await scrapeListingCards({
    url: competitor.listingUrl,
    baseUrl: competitor.website,
    renderMode: competitor.renderMode,
    cardSelector: competitor.listingCardSelector,
    nameSelector: competitor.listingNameSelector,
    nameAttr: competitor.listingNameAttr,
    urlSelector: competitor.listingUrlSelector,
    nightsSelector: competitor.listingNightsSelector,
    nightsAttr: competitor.listingNightsAttr,
    flyIndicatorSelector: competitor.listingFlyIndicatorSelector,
    flyIndicatorAttr: competitor.listingFlyIndicatorAttr,
    flyIndicatorNonFlyValue: competitor.listingFlyIndicatorNonFlyValue,
  });

  return cards.map((card) => {
    let routeType: RouteType | null;
    if (!card.isFly) {
      routeType = "ex_uk";
    } else if (isCaribbean(card.name)) {
      routeType = "fly_caribbean";
    } else {
      routeType = null;
    }
    return { name: card.name, url: card.url, destination: card.name, nights: card.nights, routeType };
  });
}
