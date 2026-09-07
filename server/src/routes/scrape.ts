import { Router } from "express";
import { scrapeAll, scrapeAndSave } from "../scraper/scrape";

export const scrapeRouter = Router();

// POST /api/scrape/run - triggers a scrape of every tracked product.
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
    const results = await scrapeAll();
    res.json({ scraped: results.length, results });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Scrape failed";
    res.status(500).json({ error: message });
  }
});
