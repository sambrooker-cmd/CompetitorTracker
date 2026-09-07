export const COMPETITOR_TIERS = ["direct", "international", "trade"] as const;
export type CompetitorTier = (typeof COMPETITOR_TIERS)[number];

export const ROUTE_TYPES = ["ex_uk", "fly_caribbean"] as const;
export type RouteType = (typeof ROUTE_TYPES)[number];

export const CABIN_TYPES = ["inside", "oceanview", "balcony", "suite"] as const;

export const RENDER_MODES = ["static", "js"] as const;
export type RenderMode = (typeof RENDER_MODES)[number];

/**
 * Best-effort keyword list for classifying a fly-cruise destination as
 * "Caribbean" (Ambassador's fly_caribbean segment) vs. some other
 * fly-cruise region (e.g. a Fred. Olsen fly-cruise to Spain), which is
 * out of scope per Ambassador's own two tracked segments. Not
 * exhaustive — extend as new destinations are discovered.
 */
export const CARIBBEAN_KEYWORDS = [
  "caribbean",
  "bahamas",
  "antigua",
  "barbados",
  "jamaica",
  "st lucia",
  "saint lucia",
  "grenada",
  "bermuda",
  "aruba",
  "curacao",
  "dominican republic",
  "puerto rico",
  "cayman",
  "turks",
  "west indies",
  "martinique",
  "guadeloupe",
  "trinidad",
  "tobago",
  "belize",
  "cozumel",
  "nassau",
  "st kitts",
  "saint kitts",
  "st maarten",
  "saint maarten",
  "dominica",
  "st vincent",
  "saint vincent",
];
