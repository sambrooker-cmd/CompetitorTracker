import type { AmbassadorRoute } from "@prisma/client";
import type { RouteType } from "./constants";

export interface MatchCandidate {
  destination: string;
  nights: number | null;
  routeType: RouteType;
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const STOPWORDS = new Set(["and", "the", "with", "from", "cruise", "cruises", "islands", "island", "tour"]);

/** Word-overlap heuristic — destination naming rarely matches exactly
 * ("Norwegian Fjords" vs "Fjords & Norway"), so this is deliberately
 * loose. False positives are caught by the human-approval step
 * (DiscoveredSailing stays "pending" until reviewed); false negatives
 * just mean nothing gets queued, which is the safe direction to err in. */
function destinationsOverlap(a: string, b: string): boolean {
  const wordsA = new Set(normalize(a).split(" ").filter((w) => w.length > 3 && !STOPWORDS.has(w)));
  const wordsB = normalize(b)
    .split(" ")
    .filter((w) => w.length > 3 && !STOPWORDS.has(w));
  return wordsB.some((w) => wordsA.has(w));
}

/** Finds the first active AmbassadorRoute a discovered candidate matches on
 * routeType (exact), nights (within the route's min/max range, if both are
 * known), and destination (fuzzy word-overlap). Returns null if nothing matches. */
export function matchRoute(candidate: MatchCandidate, routes: AmbassadorRoute[]): AmbassadorRoute | null {
  return (
    routes.find((route) => {
      if (!route.active) return false;
      if (route.routeType !== candidate.routeType) return false;
      if (candidate.nights != null && (candidate.nights < route.nightsMin || candidate.nights > route.nightsMax)) {
        return false;
      }
      return destinationsOverlap(candidate.destination, route.destination);
    }) ?? null
  );
}
