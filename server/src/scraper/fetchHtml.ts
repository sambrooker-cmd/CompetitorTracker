import axios from "axios";
import type { RenderMode } from "../lib/constants";

const REQUEST_TIMEOUT_MS = 15_000;
export const SCRAPER_USER_AGENT =
  "Mozilla/5.0 (compatible; CompetitorPricingTracker/1.0; +https://github.com/) research bot";

/** Fetches raw HTML with a plain HTTP GET. Fine for server-rendered pages. */
async function fetchStaticHtml(url: string): Promise<string> {
  const { data } = await axios.get<string>(url, {
    timeout: REQUEST_TIMEOUT_MS,
    headers: { "User-Agent": SCRAPER_USER_AGENT, Accept: "text/html" },
    validateStatus: (status) => status >= 200 && status < 400,
  });
  return data;
}

/**
 * Renders a page in headless Chromium and returns the resulting DOM as HTML,
 * for sites that populate price/offer content via client-side JavaScript
 * (a plain HTTP GET would only see the pre-render shell).
 *
 * Requires the `playwright` package and its Chromium browser to be
 * installed in the deployment environment — see README for the free-tier
 * cost tradeoffs of this before enabling it for a competitor.
 */
async function fetchRenderedHtml(url: string): Promise<string> {
  // Lazy-required (and untyped, since playwright isn't a package.json
  // dependency) so environments that never enable JS rendering — the
  // common case to start, per the incremental rollout plan — don't need
  // it installed at all.
  let chromium: { launch(): Promise<{ newPage(opts: { userAgent: string }): Promise<any>; close(): Promise<void> }> };
  try {
    ({ chromium } = require("playwright"));
  } catch {
    throw new Error(
      "JS rendering requested but the 'playwright' package isn't installed. Run `npm install playwright && npx playwright install chromium` in server/, or switch this competitor/sailing back to renderMode 'static'."
    );
  }

  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ userAgent: SCRAPER_USER_AGENT });
    await page.goto(url, { waitUntil: "networkidle", timeout: REQUEST_TIMEOUT_MS });
    return await page.content();
  } finally {
    await browser.close();
  }
}

export async function fetchHtml(url: string, renderMode: RenderMode | string): Promise<string> {
  return renderMode === "js" ? fetchRenderedHtml(url) : fetchStaticHtml(url);
}
