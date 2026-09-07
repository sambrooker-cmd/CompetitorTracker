/**
 * Best-effort extraction of a numeric price from arbitrary scraped text,
 * e.g. "$1,299.00", "£19.99", "USD 49.99 was 59.99". Assumes '.' as the
 * decimal separator and ',' as a thousands separator (common on US/UK
 * competitor sites) — not locale-aware.
 */
export function parsePrice(text: string | null | undefined): number | null {
  if (!text) return null;
  const match = text.replace(/,/g, "").match(/\d+(\.\d+)?/);
  if (!match) return null;
  const value = parseFloat(match[0]);
  return Number.isFinite(value) ? value : null;
}
