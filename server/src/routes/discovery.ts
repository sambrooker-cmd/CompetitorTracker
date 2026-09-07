import { Router } from "express";
import { prisma } from "../lib/prisma";
import { runDiscoveryForCompetitor, runDiscoveryAll } from "../scraper/runDiscovery";

export const discoveryRouter = Router();

// GET /api/discovered-sailings?status=pending - review queue (default: pending only)
discoveryRouter.get("/", async (req, res) => {
  const status = typeof req.query.status === "string" ? req.query.status : "pending";
  const sailings = await prisma.discoveredSailing.findMany({
    where: status === "all" ? undefined : { status },
    include: {
      competitor: { select: { name: true, tier: true } },
      matchedRoute: { select: { destination: true, routeType: true, nightsMin: true, nightsMax: true } },
    },
    orderBy: { discoveredAt: "desc" },
  });
  res.json(sailings);
});

// POST /api/discovered-sailings/:id/approve - creates real tracked sailings
// (one per CabinSelectorTemplate) and marks this candidate approved.
discoveryRouter.post("/:id/approve", async (req, res) => {
  const id = Number(req.params.id);
  const candidate = await prisma.discoveredSailing.findUnique({ where: { id } });
  if (!candidate) return res.status(404).json({ error: "Discovered sailing not found" });
  if (candidate.status !== "pending") {
    return res.status(400).json({ error: `Already ${candidate.status}` });
  }

  const templates = await prisma.cabinSelectorTemplate.findMany({ where: { competitorId: candidate.competitorId } });
  if (templates.length === 0) {
    return res.status(404).json({ error: "No CabinSelectorTemplate configured for this competitor" });
  }

  const created = await prisma.$transaction([
    ...templates.map((t) =>
      prisma.product.create({
        data: {
          name: `${candidate.name} — ${t.cabinType}`,
          url: candidate.url,
          priceSelector: t.priceSelector,
          promoSelector: t.promoSelector,
          currency: "GBP",
          routeType: candidate.routeType,
          destination: candidate.destination,
          nights: candidate.nights,
          cabinType: t.cabinType,
          renderMode: t.renderMode,
          competitorId: candidate.competitorId,
        },
      })
    ),
    prisma.discoveredSailing.update({ where: { id }, data: { status: "approved", reviewedAt: new Date() } }),
  ]);

  res.json({ created: created.length - 1, sailings: created.slice(0, -1) });
});

// POST /api/discovered-sailings/:id/reject
discoveryRouter.post("/:id/reject", async (req, res) => {
  const id = Number(req.params.id);
  const candidate = await prisma.discoveredSailing
    .update({ where: { id }, data: { status: "rejected", reviewedAt: new Date() } })
    .catch(() => null);
  if (!candidate) return res.status(404).json({ error: "Discovered sailing not found" });
  res.json(candidate);
});

// POST /api/discovery/run - trigger discovery for one competitor (?competitorId=) or all
discoveryRouter.post("/run", async (req, res) => {
  const competitorId = req.query.competitorId ? Number(req.query.competitorId) : null;
  try {
    if (competitorId) {
      return res.json(await runDiscoveryForCompetitor(competitorId));
    }
    res.json(await runDiscoveryAll());
  } catch (err) {
    const message = err instanceof Error ? err.message : "Discovery failed";
    res.status(500).json({ error: message });
  }
});
