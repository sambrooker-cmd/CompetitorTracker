/**
 * Best-effort extraction of validity info from free-text offer copy, e.g.
 * "Free drinks package, book by 31 December 2026" or "Kids sail free —
 * while stocks last". This is heuristic (offer copy has no fixed format
 * across competitor sites) — `rawText` is always stored alongside so
 * nothing is lost when parsing misses.
 */

const MONTHS =
  "jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t|tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?";

const DATE_PATTERNS = [
  // "31 December 2026" / "31 Dec 2026"
  new RegExp(`\\b(\\d{1,2})\\s+(${MONTHS})\\s+(\\d{4})\\b`, "gi"),
  // "31/12/2026" or "31-12-2026" (day/month/year, UK convention)
  /\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})\b/g,
];

const MONTH_INDEX: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

function extractDates(text: string): Date[] {
  const dates: Date[] = [];

  for (const match of text.matchAll(DATE_PATTERNS[0])) {
    const [, day, monthText, year] = match;
    const monthKey = monthText.slice(0, 3).toLowerCase();
    const month = MONTH_INDEX[monthKey];
    if (month !== undefined) {
      dates.push(new Date(Date.UTC(Number(year), month, Number(day))));
    }
  }

  for (const match of text.matchAll(DATE_PATTERNS[1])) {
    const [, day, month, year] = match;
    const monthNum = Number(month) - 1;
    if (monthNum >= 0 && monthNum <= 11) {
      dates.push(new Date(Date.UTC(Number(year), monthNum, Number(day))));
    }
  }

  return dates.sort((a, b) => a.getTime() - b.getTime());
}

export interface ParsedValidity {
  validFrom: Date | null;
  validUntil: Date | null;
  whileStocksLast: boolean;
}

export function parseOfferValidity(text: string): ParsedValidity {
  const whileStocksLast = /while\s+stocks?\s+last|subject\s+to\s+availability/i.test(text);
  const dates = extractDates(text);

  if (dates.length === 0) {
    return { validFrom: null, validUntil: null, whileStocksLast };
  }
  if (dates.length === 1) {
    return { validFrom: null, validUntil: dates[0], whileStocksLast };
  }
  return { validFrom: dates[0], validUntil: dates[dates.length - 1], whileStocksLast };
}
