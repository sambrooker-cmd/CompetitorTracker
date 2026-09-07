import cron from "node-cron";
import { scrapeAll } from "./scraper/scrape";
import { scrapeAllOffers } from "./scraper/scrapeOffers";
import { runDiscoveryAll } from "./scraper/runDiscovery";

const DEFAULT_SCHEDULE = "0 6 * * *"; // daily at 06:00 UTC — cruise pricing/offers don't move hourly
const DEFAULT_DISCOVERY_SCHEDULE = "0 5 * * 1"; // weekly, Monday 05:00 UTC — listing pages change far less often than prices

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
  } else {
    cron.schedule(schedule, runScrape);
    console.log(`Scrape cron scheduled: "${schedule}"`);
  }

  const discoverySchedule = process.env.DISCOVERY_CRON || DEFAULT_DISCOVERY_SCHEDULE;
  if (!cron.validate(discoverySchedule)) {
    console.warn(`Invalid DISCOVERY_CRON "${discoverySchedule}", falling back to weekly`);
    cron.schedule(DEFAULT_DISCOVERY_SCHEDULE, runDiscovery);
  } else {
    cron.schedule(discoverySchedule, runDiscovery);
    console.log(`Discovery cron scheduled: "${discoverySchedule}"`);
  }
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

// Kept deliberately separate and much lower-frequency than the price/offer
// scrape: it queries competitor search/listing pages (more requests, more
// pages) rather than a handful of registered cruise URLs, and matches are
// only ever queued for human review — never auto-approved — so there's no
// benefit to running it more often than listings realistically change.
async function runDiscovery() {
  console.log("Running scheduled discovery...");
  try {
    const results = await runDiscoveryAll();
    const totalQueued = results.reduce((sum, r) => sum + r.queued, 0);
    console.log(`Scheduled discovery done: ${results.length} competitors, ${totalQueued} new candidates queued for review`);
  } catch (err) {
    console.error("Scheduled discovery failed:", err);
  }
}
