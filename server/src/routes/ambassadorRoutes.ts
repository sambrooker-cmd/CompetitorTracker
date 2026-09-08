import { Router } from "express";
import { prisma } from "../lib/prisma";
import { ROUTE_TYPES } from "../lib/constants";
import { ingestAmbassadorRoutes } from "../scraper/ingestAmbassadorRoutes";
import { isScrapingPaused } from "../lib/scrapeGuard";

export const ambassadorRoutesRouter = Router();

// GET /api/ambassador-routes - list Ambassador's own reference routes
ambassadorRoutesRouter.get("/", async (_req, res) => {
  const routes = await prisma.ambassadorRoute.findMany({ orderBy: [{ routeType: "asc" }, { destination: "asc" }] });
  res.json(routes);
});

// POST /api/ambassador-routes - manually add a route (e.g. to fill a gap or correct a marketing name)
ambassadorRoutesRouter.post("/", async (req, res) => {
  const { destination, routeType, nightsMin, nightsMax, departurePort, sourceUrl } = req.body ?? {};
  if (!destination || !routeType || nightsMin == null || nightsMax == null) {
    return res.status(400).json({ error: "destination, routeType, nightsMin and nightsMax are required" });
  }
  if (!ROUTE_TYPES.includes(routeType)) {
    return res.status(400).json({ error: `routeType must be one of: ${ROUTE_TYPES.join(", ")}` });
  }
  const route = await prisma.ambassadorRoute.create({
    data: { destination, routeType, nightsMin: Number(nightsMin), nightsMax: Number(nightsMax), departurePort, sourceUrl },
  });
  res.status(201).json(route);
});

// PATCH /api/ambassador-routes/:id - edit a route (e.g. simplify a marketing
// name like "Autumn Fjordland" to a cleaner destination label for matching)
ambassadorRoutesRouter.patch("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const { destination, routeType, nightsMin, nightsMax, departurePort, sourceUrl, active } = req.body ?? {};

  if (routeType && !ROUTE_TYPES.includes(routeType)) {
    return res.status(400).json({ error: `routeType must be one of: ${ROUTE_TYPES.join(", ")}` });
  }

  const route = await prisma.ambassadorRoute
    .update({
      where: { id },
      data: {
        destination,
        routeType,
        nightsMin: nightsMin != null ? Number(nightsMin) : undefined,
        nightsMax: nightsMax != null ? Number(nightsMax) : undefined,
        departurePort,
        sourceUrl,
        active,
      },
    })
    .catch(() => null);

  if (!route) return res.status(404).json({ error: "Route not found" });
  res.json(route);
});

// DELETE /api/ambassador-routes/:id
ambassadorRoutesRouter.delete("/:id", async (req, res) => {
  const id = Number(req.params.id);
  await prisma.ambassadorRoute.delete({ where: { id } }).catch(() => null);
  res.status(204).end();
});

// POST /api/ambassador-routes/ingest - scrape ambassadorcruiseline.com/search/ and upsert routes
ambassadorRoutesRouter.post("/ingest", async (_req, res) => {
  if (isScrapingPaused()) {
    return res.status(503).json({ error: "Scraping is currently paused (SCRAPING_ENABLED=false)" });
  }
  const result = await ingestAmbassadorRoutes();
  res.json(result);
});
