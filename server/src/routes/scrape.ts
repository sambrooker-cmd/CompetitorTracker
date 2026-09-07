import { Router } from "express";
import { scrapeAll, scrapeAndSave } from "../scraper/scrape";
import { scrapeAllOffers, scrapeAndDiffOffers } from "../scraper/scrapeOffers";

export const scrapeRouter = Router();

// POST /api/scrape/run - triggers a scrape of every tracked sailing (price)
// and every competitor with offer tracking configured.
// Protected by SCRAPE_TRIGGER_TOKEN (if set) via the X-Scrape-Token header,
// so an external scheduler (e.g. GitHub Actions) can wake a sleeping free
// dyno/service and kick off scraping without exposing this publicly.
scrapeRouter.post("/run", async (req, res) => {
  const expectedToken = process.env.SCRAPE_TRIGGER_TOKEN;
  if (expectedToken && req.header("X-Scrape-Token") !== expectedToken) {
    return res.status(401).json({ error: "Invalid or missing scrape token" });
  }

  const productId = req.query.productId ? Number(req.query.productId) : null;
  try {
    if (productId) {
      const entry = await scrapeAndSave(productId);
      return res.json({ scraped: 1, results: [entry] });
    }
    const [priceResults, offerResults] = await Promise.all([scrapeAll(), scrapeAllOffers()]);
    res.json({
      scraped: priceResults.length,
      results: priceResults,
      offersScraped: offerResults.length,
      offerResults,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Scrape failed";
    res.status(500).json({ error: message });
  }
});

// POST /api/scrape/offers/:competitorId - scrape just one competitor's offers page
scrapeRouter.post("/offers/:competitorId", async (req, res) => {
  const expectedToken = process.env.SCRAPE_TRIGGER_TOKEN;
  if (expectedToken && req.header("X-Scrape-Token") !== expectedToken) {
    return res.status(401).json({ error: "Invalid or missing scrape token" });
  }
  const result = await scrapeAndDiffOffers(Number(req.params.competitorId));
  res.json(result);
});
