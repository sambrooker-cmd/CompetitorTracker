import * as cheerio from "cheerio";
import { prisma } from "../lib/prisma";
import { fetchHtml } from "./fetchHtml";
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

function extractNights(text: string): number | null {
  const match = text.match(/(\d+)\s*night/i);
  return match ? Number(match[1]) : null;
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

  if (!competitor.listingUrl || !competitor.listingCardSelector || !competitor.listingNameSelector || !competitor.listingUrlSelector) {
    return [];
  }

  const html = await fetchHtml(competitor.listingUrl, competitor.renderMode);
  const $ = cheerio.load(html);

  const candidates: DiscoveredCandidate[] = [];

  $(competitor.listingCardSelector).each((_, el) => {
    const $el = $(el);
    // .clone() + .children().remove() strips nested elements (e.g. a cruise
    // code badge inside the name heading) so they don't pollute the name
    // with e.g. "Charming Spanish Cities L2633" — direct text only.
    const $name = $el.find(competitor.listingNameSelector!).first().clone();
    $name.children().remove();
    const name = $name.text().replace(/\s+/g, " ").trim();
    const href = $el.find(competitor.listingUrlSelector!).first().attr("href");
    if (!name || !href) return;

    let url: string;
    try {
      url = new URL(href, competitor.website).toString();
    } catch {
      return;
    }

    const nightsText = competitor.listingNightsSelector ? $el.find(competitor.listingNightsSelector).first().text() : "";
    const nights = extractNights(nightsText);
    const isFly = competitor.listingFlyIndicatorSelector ? $el.find(competitor.listingFlyIndicatorSelector).length > 0 : false;

    let routeType: RouteType | null;
    if (!isFly) {
      routeType = "ex_uk";
    } else if (isCaribbean(name)) {
      routeType = "fly_caribbean";
    } else {
      routeType = null;
    }

    candidates.push({ name, url, destination: name, nights, routeType });
  });

  return candidates;
}
