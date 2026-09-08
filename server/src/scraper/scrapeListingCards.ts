import * as cheerio from "cheerio";
import { fetchHtml } from "./fetchHtml";

export interface ListingSelectorConfig {
  url: string;
  baseUrl: string;
  renderMode: string;
  cardSelector: string;
  nameSelector?: string | null;
  /** Read the name from an attribute on the card itself (e.g. Fred. Olsen's data-cruise-name) instead of nested text. Takes precedence over nameSelector. */
  nameAttr?: string | null;
  /** Optional — falls back to the card element's own href when the card itself is the link (e.g. Ambassador). */
  urlSelector?: string | null;
  nightsSelector?: string | null;
  /** Read nights from a numeric attribute (e.g. data-duration="12") instead of parsing "X nights" text. Takes precedence over nightsSelector. */
  nightsAttr?: string | null;
  flyIndicatorSelector?: string | null;
  /** Read the fly/no-fly signal from an attribute (e.g. data-cruise-type) instead of a nested element's presence. Takes precedence over flyIndicatorSelector — must be paired with flyIndicatorNonFlyValue. */
  flyIndicatorAttr?: string | null;
  /** The attribute value (from flyIndicatorAttr) that means "not a fly-cruise" — any other value present on that attribute is treated as fly. */
  flyIndicatorNonFlyValue?: string | null;
}

export interface ListingCard {
  name: string;
  url: string;
  nights: number | null;
  isFly: boolean;
}

function extractNights(text: string): number | null {
  const match = text.match(/(\d+)\s*night/i);
  return match ? Number(match[1]) : null;
}

/**
 * Scrapes a search/listing page for cruise cards, extracting name/url/
 * nights/fly-indicator. Shared by competitor discovery
 * (scraper/discoverListing.ts) and Ambassador's own route ingestion
 * (scraper/ingestAmbassadorRoutes.ts) — the two differ only in what they
 * do with the result (match against AmbassadorRoute vs. become one).
 *
 * Handles two card shapes seen in practice: a wrapper div containing a
 * nested <a> (Fred. Olsen — pass urlSelector), and the card itself being
 * the <a> (Ambassador — omit urlSelector, falls back to the card's own href).
 */
export async function scrapeListingCards(config: ListingSelectorConfig): Promise<ListingCard[]> {
  const html = await fetchHtml(config.url, config.renderMode);
  const $ = cheerio.load(html);

  const cards: ListingCard[] = [];

  $(config.cardSelector).each((_, el) => {
    const $el = $(el);

    let name: string;
    if (config.nameAttr) {
      name = ($el.attr(config.nameAttr) || "").trim();
    } else {
      const $name = $el.find(config.nameSelector || "").first().clone();
      $name.children().remove();
      name = $name.text().replace(/\s+/g, " ").trim();
    }

    let href: string | undefined = config.urlSelector ? $el.find(config.urlSelector).first().attr("href") : undefined;
    if (!href) href = $el.attr("href");
    if (!name || !href) return;

    let url: string;
    try {
      url = new URL(href, config.baseUrl).toString();
    } catch {
      return;
    }

    let nights: number | null = null;
    if (config.nightsAttr) {
      const raw = $el.attr(config.nightsAttr);
      const parsed = raw ? Number(raw) : NaN;
      nights = Number.isNaN(parsed) ? null : parsed;
    } else if (config.nightsSelector) {
      nights = extractNights($el.find(config.nightsSelector).first().text());
    }

    let isFly: boolean;
    if (config.flyIndicatorAttr) {
      const raw = $el.attr(config.flyIndicatorAttr);
      isFly = raw !== undefined && raw !== config.flyIndicatorNonFlyValue;
    } else {
      isFly = config.flyIndicatorSelector ? $el.find(config.flyIndicatorSelector).length > 0 : false;
    }

    cards.push({ name, url, nights, isFly });
  });

  return cards;
}
