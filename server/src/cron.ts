import cron from "node-cron";
import { scrapeAll } from "./scraper/scrape";
import { scrapeAllOffers } from "./scraper/scrapeOffers";

const DEFAULT_SCHEDULE = "0 6 * * *"; // daily at 06:00 UTC — cruise pricing/offers don't move hourly

/**
 * Starts an in-process cron job that periodically scrapes every tracked
 * sailing (price) and every competitor with offer tracking configured.
 * Only useful while the process stays alive — free hosting tiers that spin
 * down on idle won't fire this reliably, which is why the GitHub Actions
 * workflow (.github/workflows/scrape.yml) hits POST /api/scrape/run on a
 * schedule as a backup that also wakes a sleeping service.
 */
export function startScrapeCron() {
  const schedule = process.env.SCRAPE_CRON || DEFAULT_SCHEDULE;
  if (!cron.validate(schedule)) {
    console.warn(`Invalid SCRAPE_CRON "${schedule}", falling back to daily`);
    cron.schedule(DEFAULT_SCHEDULE, runScrape);
    return;
  }
  cron.schedule(schedule, runScrape);
  console.log(`Scrape cron scheduled: "${schedule}"`);
}

async function runScrape() {
  console.log("Running scheduled scrape...");
  try {
    const [priceResults, offerResults] = await Promise.all([scrapeAll(), scrapeAllOffers()]);
    const priceFailures = priceResults.filter((r) => r.error);
    const offerFailures = offerResults.filter((r) => r.error);
    console.log(
      `Scheduled scrape done: ${priceResults.length} sailings (${priceFailures.length} errors), ` +
        `${offerResults.length} offer pages (${offerFailures.length} errors)`
    );
  } catch (err) {
    console.error("Scheduled scrape failed:", err);
  }
}
