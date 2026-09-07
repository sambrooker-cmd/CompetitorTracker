export const COMPETITOR_TIERS = ["direct", "international", "trade"] as const;
export type CompetitorTier = (typeof COMPETITOR_TIERS)[number];

export const ROUTE_TYPES = ["ex_uk", "fly_caribbean"] as const;
export type RouteType = (typeof ROUTE_TYPES)[number];

export const CABIN_TYPES = ["inside", "oceanview", "balcony", "suite"] as const;

export const RENDER_MODES = ["static", "js"] as const;
export type RenderMode = (typeof RENDER_MODES)[number];
