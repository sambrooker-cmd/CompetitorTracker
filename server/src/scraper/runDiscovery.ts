import { prisma } from "../lib/prisma";
import { discoverListing } from "./discoverListing";
import { matchRoute } from "../lib/matchRoute";

export interface DiscoveryResult {
  competitorId: number;
  found: number;
  outOfScope: number;
  matched: number;
  queued: number;
  error: string | null;
}

/**
 * Runs discoverListing for one competitor, matches results against active
 * AmbassadorRoute rows, and queues new matches as pending DiscoveredSailing
 * rows for human review (Phase 2 — see README). A candidate already known
 * for this competitor+url (any status: pending/approved/rejected) is left
 * alone rather than re-queued, so a rejection sticks and an approval
 * doesn't get a duplicate pending row sitting next to the real sailing.
 */
export async function runDiscoveryForCompetitor(competitorId: number): Promise<DiscoveryResult> {
  let candidates;
  try {
    candidates = await discoverListing(competitorId);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown discovery error";
    return { competitorId, found: 0, outOfScope: 0, matched: 0, queued: 0, error: message };
  }

  const inScope = candidates.filter((c) => c.routeType !== null);
  const routes = await prisma.ambassadorRoute.findMany({ where: { active: true } });

  let matched = 0;
  let queued = 0;

  for (const candidate of inScope) {
    const route = matchRoute(
      { destination: candidate.destination, nights: candidate.nights, routeType: candidate.routeType! },
      routes
    );
    if (!route) continue;
    matched++;

    const existing = await prisma.discoveredSailing.findFirst({ where: { competitorId, url: candidate.url } });
    if (existing) continue;

    await prisma.discoveredSailing.create({
      data: {
        competitorId,
        matchedRouteId: route.id,
        name: candidate.name,
        url: candidate.url,
        destination: candidate.destination,
        nights: candidate.nights,
        routeType: candidate.routeType,
      },
    });
    queued++;
  }

  return {
    competitorId,
    found: candidates.length,
    outOfScope: candidates.length - inScope.length,
    matched,
    queued,
    error: null,
  };
}

/** Runs discovery for every competitor that has a listing configured. */
export async function runDiscoveryAll(): Promise<DiscoveryResult[]> {
  const competitors = await prisma.competitor.findMany({
    where: { listingUrl: { not: null } },
    select: { id: true },
  });

  const results: DiscoveryResult[] = [];
  for (const competitor of competitors) {
    results.push(await runDiscoveryForCompetitor(competitor.id));
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }
  return results;
}
