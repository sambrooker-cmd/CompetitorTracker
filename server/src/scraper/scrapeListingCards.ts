import * as cheerio from "cheerio";
import { fetchHtml } from "./fetchHtml";

export interface ListingSelectorConfig {
  url: string;
  baseUrl: string;
  renderMode: string;
  cardSelector: string;
  nameSelector: string;
  /** Optional — falls back to the card element's own href when the card itself is the link (e.g. Ambassador). */
  urlSelector?: string | null;
  nightsSelector?: string | null;
  flyIndicatorSelector?: string | null;
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

    const $name = $el.find(config.nameSelector).first().clone();
    $name.children().remove();
    const name = $name.text().replace(/\s+/g, " ").trim();

    let href: string | undefined = config.urlSelector ? $el.find(config.urlSelector).first().attr("href") : undefined;
    if (!href) href = $el.attr("href");
    if (!name || !href) return;

    let url: string;
    try {
      url = new URL(href, config.baseUrl).toString();
    } catch {
      return;
    }

    const nightsText = config.nightsSelector ? $el.find(config.nightsSelector).first().text() : "";
    const nights = extractNights(nightsText);
    const isFly = config.flyIndicatorSelector ? $el.find(config.flyIndicatorSelector).length > 0 : false;

    cards.push({ name, url, nights, isFly });
  });

  return cards;
}
