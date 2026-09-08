// Kill-switch checked by every route/cron that makes outbound requests to
// competitor (or Ambassador's own) sites — lets scraping be paused without
// taking the API/dashboard offline, e.g. while reviewing robots.txt/ToS
// coverage across the competitor set. Unset or anything other than
// "false" means enabled.
export function isScrapingPaused(): boolean {
  return process.env.SCRAPING_ENABLED === "false";
}
