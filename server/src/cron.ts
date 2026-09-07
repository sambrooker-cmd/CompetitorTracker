import cron from "node-cron";
import { scrapeAll } from "./scraper/scrape";

/**
 * Starts an in-process cron job that periodically scrapes every tracked
 * product. Only useful while the process stays alive — free hosting tiers
 * that spin down on idle won't fire this reliably, which is why the GitHub
 * Actions workflow (.github/workflows/scrape.yml) hits POST /api/scrape/run
 * on a schedule as a backup that also wakes a sleeping service.
 */
export function startScrapeCron() {
  const schedule = process.env.SCRAPE_CRON || "0 */6 * * *";
  if (!cron.validate(schedule)) {
    console.warn(`Invalid SCRAPE_CRON "${schedule}", falling back to every 6 hours`);
    cron.schedule("0 */6 * * *", runScrape);
    return;
  }
  cron.schedule(schedule, runScrape);
  console.log(`Scrape cron scheduled: "${schedule}"`);
}

async function runScrape() {
  console.log("Running scheduled scrape...");
  try {
    const results = await scrapeAll();
    const failures = results.filter((r) => r.error);
    console.log(`Scheduled scrape done: ${results.length} products, ${failures.length} errors`);
  } catch (err) {
    console.error("Scheduled scrape failed:", err);
  }
}
