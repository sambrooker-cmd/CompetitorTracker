import { Router } from "express";
import { prisma } from "../lib/prisma";

export const competitorsRouter = Router();

// GET /api/competitors - list all competitors with their products
competitorsRouter.get("/", async (_req, res) => {
  const competitors = await prisma.competitor.findMany({
    include: { products: { select: { id: true, name: true, url: true } } },
    orderBy: { name: "asc" },
  });
  res.json(competitors);
});

// POST /api/competitors - create a competitor
competitorsRouter.post("/", async (req, res) => {
  const { name, website, notes } = req.body ?? {};
  if (!name || !website) {
    return res.status(400).json({ error: "name and website are required" });
  }
  const competitor = await prisma.competitor.create({ data: { name, website, notes } });
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

// DELETE /api/competitors/:id
competitorsRouter.delete("/:id", async (req, res) => {
  const id = Number(req.params.id);
  await prisma.competitor.delete({ where: { id } }).catch(() => null);
  res.status(204).end();
});

// POST /api/competitors/:id/products - add a tracked product to a competitor
competitorsRouter.post("/:id/products", async (req, res) => {
  const competitorId = Number(req.params.id);
  const { name, url, priceSelector, promoSelector, currency } = req.body ?? {};
  if (!name || !url || !priceSelector) {
    return res.status(400).json({ error: "name, url and priceSelector are required" });
  }
  const competitor = await prisma.competitor.findUnique({ where: { id: competitorId } });
  if (!competitor) return res.status(404).json({ error: "Competitor not found" });

  const product = await prisma.product.create({
    data: { name, url, priceSelector, promoSelector, currency: currency || "USD", competitorId },
  });
  res.status(201).json(product);
});
