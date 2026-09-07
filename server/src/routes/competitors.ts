import { Router } from "express";
import { prisma } from "../lib/prisma";
import { COMPETITOR_TIERS, RENDER_MODES } from "../lib/constants";

export const competitorsRouter = Router();

// GET /api/competitors - list all competitors with their products
competitorsRouter.get("/", async (_req, res) => {
  const competitors = await prisma.competitor.findMany({
    include: { products: { select: { id: true, name: true, url: true } } },
    orderBy: [{ tier: "asc" }, { name: "asc" }],
  });
  res.json(competitors);
});

// POST /api/competitors - create a competitor
competitorsRouter.post("/", async (req, res) => {
  const { name, website, tier, parentGroup, notes, offersUrl, offerSelector, renderMode } = req.body ?? {};
  if (!name || !website || !tier) {
    return res.status(400).json({ error: "name, website and tier are required" });
  }
  if (!COMPETITOR_TIERS.includes(tier)) {
    return res.status(400).json({ error: `tier must be one of: ${COMPETITOR_TIERS.join(", ")}` });
  }
  if (renderMode && !RENDER_MODES.includes(renderMode)) {
    return res.status(400).json({ error: `renderMode must be one of: ${RENDER_MODES.join(", ")}` });
  }
  const competitor = await prisma.competitor.create({
    data: { name, website, tier, parentGroup, notes, offersUrl, offerSelector, renderMode: renderMode || "static" },
  });
  res.status(201).json(competitor);
});

// GET /api/competitors/:id - one competitor with products
competitorsRouter.get("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const competitor = await prisma.competitor.findUnique({
    where: { id },
    include: { products: true },
  });
  if (!competitor) return res.status(404).json({ error: "Competitor not found" });
  res.json(competitor);
});

// PATCH /api/competitors/:id - update competitor config (e.g. wire up offer tracking)
competitorsRouter.patch("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const { name, website, tier, parentGroup, notes, offersUrl, offerSelector, renderMode } = req.body ?? {};

  if (tier && !COMPETITOR_TIERS.includes(tier)) {
    return res.status(400).json({ error: `tier must be one of: ${COMPETITOR_TIERS.join(", ")}` });
  }
  if (renderMode && !RENDER_MODES.includes(renderMode)) {
    return res.status(400).json({ error: `renderMode must be one of: ${RENDER_MODES.join(", ")}` });
  }

  const competitor = await prisma.competitor
    .update({
      where: { id },
      data: { name, website, tier, parentGroup, notes, offersUrl, offerSelector, renderMode },
    })
    .catch(() => null);

  if (!competitor) return res.status(404).json({ error: "Competitor not found" });
  res.json(competitor);
});

// DELETE /api/competitors/:id
competitorsRouter.delete("/:id", async (req, res) => {
  const id = Number(req.params.id);
  await prisma.competitor.delete({ where: { id } }).catch(() => null);
  res.status(204).end();
});

// POST /api/competitors/:id/products - add a tracked representative sailing to a competitor
competitorsRouter.post("/:id/products", async (req, res) => {
  const competitorId = Number(req.params.id);
  const { name, url, priceSelector, promoSelector, currency, routeType, destination, nights, cabinType, renderMode } =
    req.body ?? {};
  if (!name || !url || !priceSelector) {
    return res.status(400).json({ error: "name, url and priceSelector are required" });
  }
  if (renderMode && !RENDER_MODES.includes(renderMode)) {
    return res.status(400).json({ error: `renderMode must be one of: ${RENDER_MODES.join(", ")}` });
  }
  const competitor = await prisma.competitor.findUnique({ where: { id: competitorId } });
  if (!competitor) return res.status(404).json({ error: "Competitor not found" });

  const product = await prisma.product.create({
    data: {
      name,
      url,
      priceSelector,
      promoSelector,
      currency: currency || "GBP",
      routeType,
      destination,
      nights: nights ? Number(nights) : undefined,
      cabinType,
      renderMode: renderMode || "static",
      competitorId,
    },
  });
  res.status(201).json(product);
});
