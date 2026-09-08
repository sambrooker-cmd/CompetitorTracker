import { Router } from "express";
import { seedDatabase } from "../seed";

export const adminRouter = Router();

// POST /api/admin/seed - (re)seeds the real competitor/sailing data.
// Upsert-based, so safe to call repeatedly (e.g. once against a fresh
// production database after the first deploy). Protected by the same
// SCRAPE_TRIGGER_TOKEN Render already generates for the scrape endpoints.
adminRouter.post("/seed", async (req, res) => {
  const expectedToken = process.env.SCRAPE_TRIGGER_TOKEN;
  if (expectedToken && req.header("X-Scrape-Token") !== expectedToken) {
    return res.status(401).json({ error: "Invalid or missing scrape token" });
  }

  try {
    const result = await seedDatabase();
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Seed failed";
    res.status(500).json({ error: message });
  }
});
