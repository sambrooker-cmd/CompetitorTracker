import axios from "axios";
import * as cheerio from "cheerio";
import { prisma } from "../lib/prisma";
import { parsePrice } from "./parsePrice";
import type { Product } from "@prisma/client";

const REQUEST_TIMEOUT_MS = 15_000;
const USER_AGENT =
  "Mozilla/5.0 (compatible; CompetitorPricingTracker/1.0; +https://github.com/) research bot";

export interface ScrapeResult {
  price: number | null;
  rawPrice: string | null;
  promoText: string | null;
  error: string | null;
}

/** Fetches a product page and extracts price/promo text via CSS selectors. Does not write to the DB. */
export async function scrapeProduct(product: Pick<Product, "url" | "priceSelector" | "promoSelector">): Promise<ScrapeResult> {
  try {
    const { data: html } = await axios.get<string>(product.url, {
      timeout: REQUEST_TIMEOUT_MS,
      headers: { "User-Agent": USER_AGENT, Accept: "text/html" },
      validateStatus: (status) => status >= 200 && status < 400,
    });

    const $ = cheerio.load(html);

    const rawPrice = $(product.priceSelector).first().text().trim() || null;
    const price = parsePrice(rawPrice);

    let promoText: string | null = null;
    if (product.promoSelector) {
      const text = $(product.promoSelector).first().text().trim();
      promoText = text.length > 0 ? text : null;
    }

    if (rawPrice === null) {
      return { price: null, rawPrice: null, promoText, error: "Price selector matched no element" };
    }

    return { price, rawPrice, promoText, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown scrape error";
    return { price: null, rawPrice: null, promoText: null, error: message };
  }
}

/** Scrapes one product by id and persists the resulting PriceEntry. */
export async function scrapeAndSave(productId: number) {
  const product = await prisma.product.findUniqueOrThrow({ where: { id: productId } });
  const result = await scrapeProduct(product);

  return prisma.priceEntry.create({
    data: {
      productId: product.id,
      price: result.price,
      rawPrice: result.rawPrice,
      promoText: result.promoText,
      error: result.error,
    },
  });
}

const DELAY_BETWEEN_REQUESTS_MS = 1500;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Scrapes all products sequentially with a short delay between requests to
 * be polite to competitor sites. Returns per-product outcomes.
 */
export async function scrapeAll() {
  const products = await prisma.product.findMany({ select: { id: true, name: true } });
  const results: { productId: number; name: string; error: string | null }[] = [];

  for (const product of products) {
    const entry = await scrapeAndSave(product.id);
    results.push({ productId: product.id, name: product.name, error: entry.error });
    await sleep(DELAY_BETWEEN_REQUESTS_MS);
  }

  return results;
}
