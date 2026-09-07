import { Router } from "express";
import { prisma } from "../lib/prisma";

export const offersRouter = Router();

// GET /api/offers - all offers, newest-active-first, for the dashboard feed
offersRouter.get("/", async (req, res) => {
  const activeOnly = req.query.active === "true";
  const offers = await prisma.offer.findMany({
    where: activeOnly ? { active: true } : undefined,
    include: { competitor: { select: { name: true, tier: true } } },
    orderBy: [{ active: "desc" }, { lastSeenAt: "desc" }],
    take: 200,
  });
  res.json(offers);
});

// GET /api/offers/competitor/:competitorId - offers for one competitor (current + history)
offersRouter.get("/competitor/:competitorId", async (req, res) => {
  const competitorId = Number(req.params.competitorId);
  const offers = await prisma.offer.findMany({
    where: { competitorId },
    orderBy: [{ active: "desc" }, { lastSeenAt: "desc" }],
  });
  res.json(offers);
});
