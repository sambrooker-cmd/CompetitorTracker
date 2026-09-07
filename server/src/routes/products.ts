import { Router } from "express";
import { prisma } from "../lib/prisma";
import { scrapeAndSave } from "../scraper/scrape";

export const productsRouter = Router();

// GET /api/products/:id - product with its competitor
productsRouter.get("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const product = await prisma.product.findUnique({ where: { id }, include: { competitor: true } });
  if (!product) return res.status(404).json({ error: "Product not found" });
  res.json(product);
});

// GET /api/products/:id/history - price history, newest last (good for charting)
productsRouter.get("/:id/history", async (req, res) => {
  const id = Number(req.params.id);
  const limit = Math.min(Number(req.query.limit) || 200, 1000);
  const entries = await prisma.priceEntry.findMany({
    where: { productId: id },
    orderBy: { scrapedAt: "asc" },
    take: -limit,
  });
  res.json(entries);
});

// POST /api/products/:id/scrape - scrape this single product immediately
productsRouter.post("/:id/scrape", async (req, res) => {
  const id = Number(req.params.id);
  try {
    const entry = await scrapeAndSave(id);
    res.status(201).json(entry);
  } catch (err) {
    res.status(404).json({ error: "Product not found or scrape failed" });
  }
});

// DELETE /api/products/:id
productsRouter.delete("/:id", async (req, res) => {
  const id = Number(req.params.id);
  await prisma.product.delete({ where: { id } }).catch(() => null);
  res.status(204).end();
});
