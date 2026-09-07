import axios from "axios";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:4000/api",
});

export interface Product {
  id: number;
  name: string;
  url: string;
  priceSelector: string;
  promoSelector: string | null;
  currency: string;
  competitorId: number;
  createdAt: string;
}

export interface Competitor {
  id: number;
  name: string;
  website: string;
  notes: string | null;
  createdAt: string;
  products: Pick<Product, "id" | "name" | "url">[];
}

export interface PriceEntry {
  id: number;
  productId: number;
  price: number | null;
  promoText: string | null;
  rawPrice: string | null;
  error: string | null;
  scrapedAt: string;
}

export interface Alert {
  type: "price_drop" | "price_increase" | "new_promo" | "promo_ended" | "scrape_error";
  productId: number;
  productName: string;
  competitorName: string;
  detail: string;
  scrapedAt: string;
}
