import axios from "axios";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:4000/api",
});

export type CompetitorTier = "direct" | "international" | "trade";
export type RenderMode = "static" | "js";
export type RouteType = "ex_uk" | "fly_caribbean";

export interface Product {
  id: number;
  name: string;
  url: string;
  priceSelector: string;
  promoSelector: string | null;
  currency: string;
  routeType: RouteType | null;
  destination: string | null;
  nights: number | null;
  cabinType: string | null;
  renderMode: RenderMode;
  competitorId: number;
  createdAt: string;
}

export interface Competitor {
  id: number;
  name: string;
  website: string;
  tier: CompetitorTier;
  parentGroup: string | null;
  notes: string | null;
  offersUrl: string | null;
  offerSelector: string | null;
  renderMode: RenderMode;
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

export interface Offer {
  id: number;
  competitorId: number;
  title: string;
  detail: string | null;
  rawText: string | null;
  validFrom: string | null;
  validUntil: string | null;
  whileStocksLast: boolean;
  active: boolean;
  firstSeenAt: string;
  lastSeenAt: string;
  endedAt: string | null;
  competitor?: { name: string; tier: CompetitorTier };
}

export interface Alert {
  type:
    | "price_drop"
    | "price_increase"
    | "new_promo"
    | "promo_ended"
    | "scrape_error"
    | "new_offer"
    | "offer_ended";
  productId: number | null;
  productName: string;
  competitorName: string;
  detail: string;
  scrapedAt: string;
}

export interface DiscoveredSailing {
  id: number;
  competitorId: number;
  matchedRouteId: number | null;
  name: string;
  url: string;
  destination: string | null;
  nights: number | null;
  routeType: RouteType | null;
  status: "pending" | "approved" | "rejected";
  discoveredAt: string;
  reviewedAt: string | null;
  competitor: { name: string; tier: CompetitorTier };
  matchedRoute: { destination: string; routeType: RouteType; nightsMin: number; nightsMax: number } | null;
}

export const TIER_LABELS: Record<CompetitorTier, string> = {
  direct: "Direct competitor",
  international: "International",
  trade: "Trade agent",
};
