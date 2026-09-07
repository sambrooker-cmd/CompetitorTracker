import { prisma } from "./lib/prisma";

/**
 * Seeds the real Ambassador Cruise Line competitor set (ex-UK, no-fly
 * segment), sourced from the "Competitor Identification and Market
 * Context" workbook (Sept 2026). Tiering follows that workbook's own
 * Overview sheet split: direct lines are grouped into "closest positioning
 * peers" vs "premium/mainstream" international lines, plus trade agents
 * who resell those lines' product rather than operating ships.
 *
 * No Product (tracked sailing) or Offer rows are seeded here — this
 * sandbox has no live web access to inspect real page structure, so
 * CSS selectors for pricing/offers pages need to be added once someone
 * with network access (or the deployed app) can inspect each site.
 * The fly-Caribbean sub-segment competitor set is out of scope for this
 * workbook and will need its own pass.
 */

interface SeedSailing {
  name: string;
  url: string;
  priceSelector: string;
  cabinType: string;
  routeType: "ex_uk" | "fly_caribbean";
  destination: string;
  nights?: number;
}

/**
 * Fred. Olsen's cabin-pricing widget shows one "from" price per cabin type
 * in a slider of <a id="{type}-standard-tab"> cards, each with a
 * <span class="price"> — except when a grade has no price ("Please Call"),
 * where there's no .price span and the selector below falls back to the
 * card's <p> text so that's captured verbatim instead of erroring.
 * Selectors verified against real markup copied from the live page
 * (2026-09-07); ids are per-page (not cruise-specific) so this only works
 * for the one cruise at FRED_OLSEN_CRUISE_URL below.
 */
const FRED_OLSEN_CRUISE_URL = "https://www.fredolsencruises.com/cruise/festive-france-belgium-l2640";
const FRED_OLSEN_CANARIES_URL = "https://www.fredolsencruises.com/cruise/canary-islands-christmas-new-year-t2630";
const fredOlsenSailings: SeedSailing[] = [
  { name: "Festive France & Belgium — Interior", url: FRED_OLSEN_CRUISE_URL, priceSelector: "#interior-standard-tab .price", cabinType: "inside", routeType: "ex_uk", destination: "France & Belgium" },
  { name: "Festive France & Belgium — Ocean", url: FRED_OLSEN_CRUISE_URL, priceSelector: "#ocean-standard-tab .price", cabinType: "oceanview", routeType: "ex_uk", destination: "France & Belgium" },
  { name: "Festive France & Belgium — Balcony", url: FRED_OLSEN_CRUISE_URL, priceSelector: "#balcony-standard-tab p", cabinType: "balcony", routeType: "ex_uk", destination: "France & Belgium" },
  { name: "Festive France & Belgium — Suite", url: FRED_OLSEN_CRUISE_URL, priceSelector: "#suite-standard-tab .price", cabinType: "suite", routeType: "ex_uk", destination: "France & Belgium" },
  // Canary Islands Christmas & New Year (T2630, ship Bolette) — same widget
  // structure, but this ship's mid-tier cabin is branded "Terrace" rather
  // than "Balcony"; kept as its own free-text cabinType rather than
  // force-mapped, per the schema's "or a competitor's own label" note.
  { name: "Canary Islands Christmas & New Year — Interior", url: FRED_OLSEN_CANARIES_URL, priceSelector: "#interior-standard-tab .price", cabinType: "inside", routeType: "ex_uk", destination: "Canary Islands" },
  { name: "Canary Islands Christmas & New Year — Ocean", url: FRED_OLSEN_CANARIES_URL, priceSelector: "#ocean-standard-tab .price", cabinType: "oceanview", routeType: "ex_uk", destination: "Canary Islands" },
  { name: "Canary Islands Christmas & New Year — Terrace", url: FRED_OLSEN_CANARIES_URL, priceSelector: "#terrace-standard-tab p", cabinType: "terrace", routeType: "ex_uk", destination: "Canary Islands" },
  { name: "Canary Islands Christmas & New Year — Suite", url: FRED_OLSEN_CANARIES_URL, priceSelector: "#suite-standard-tab .price", cabinType: "suite", routeType: "ex_uk", destination: "Canary Islands" },
];

interface SeedCompetitor {
  name: string;
  website: string;
  tier: "direct" | "international" | "trade";
  parentGroup: string | null;
  notes: string;
  offersUrl?: string;
  offerSelector?: string;
}

/**
 * P&O's cruise detail page (a React/Next-style app, hydrated markup) shows
 * the "from" price for one cabin type in a hero price block, and — on the
 * same page — a separate "Offers on this cruise" section. Both selectors
 * verified against real markup copied from the live page (2026-09-07).
 * Since the offer text here doesn't mention this specific itinerary
 * ("Just a 10% deposit"), it reads as a sitewide promotion surfaced on
 * every cruise page rather than one unique to this sailing — so this same
 * URL doubles as the competitor's offersUrl below.
 */
const PO_CRUISE_URL = "https://www.pocruises.com/find-a-cruise/K703/K703";
const poSailings: SeedSailing[] = [
  {
    name: "Eastern Caribbean Islands Fly-Cruise (Arvia, K703) — Inside",
    url: PO_CRUISE_URL,
    priceSelector: '#c-cruise-detail-overview-hero [data-testid="c-curreny-content"]',
    cabinType: "inside",
    routeType: "fly_caribbean",
    destination: "Eastern Caribbean Islands",
    nights: 14,
  },
];

const competitors: SeedCompetitor[] = [
  // Direct — closest product/size peers
  {
    name: "Fred. Olsen Cruise Lines",
    website: "https://www.fredolsencruises.com",
    tier: "direct",
    parentGroup: "Independent (family-owned)",
    notes:
      "Closest direct positioning peer — small-ship, heritage, regional UK-port focus (Liverpool, Newcastle/Tyne, Rosyth, Dover, Southampton). Heavier trade/agent incentive activity and national TV presence than Ambassador.",
    // /cruise-deals is a search-results listing (mixed ex-UK and fly-cruise
    // itineraries), not a curated offers page — each result card carries
    // its own "Available Offers" badges (e.g. "Free Flight", "Kids Sail
    // Free"). Selector matches every badge across every card; the same
    // badge text repeating across many cards is deduped in scrapeOffers.ts
    // rather than treated as separate offers.
    offersUrl: "https://www.fredolsencruises.com/cruise-deals",
    offerSelector: ".cruise-offers .offer-pill",
  },
  {
    name: "Saga Cruises",
    website: "https://www.saga.co.uk/cruises",
    tier: "direct",
    parentGroup: "Saga plc",
    notes:
      "Strictly 50+ (70+ core), all-inclusive boutique positioning. Deepest CRM/data advantage via Saga's wider insurance/financial-services customer base (~3.5m+ database).",
  },
  {
    name: "Marella Cruises",
    website: "https://www.tui.co.uk/cruise/marella-cruises/",
    tier: "direct",
    parentGroup: "TUI Group",
    notes:
      "3rd-largest UK cruise line. All-inclusive, mainstream value positioning; broader (over-40s, family-adjacent) audience than Ambassador. Backed by TUI Group's much larger media budget and retail/high-street distribution.",
  },
  {
    name: "P&O Cruises",
    website: "https://www.pocruises.com",
    tier: "direct",
    parentGroup: "Carnival Corporation & plc",
    notes:
      "UK's largest, most mainstream cruise brand — biggest UK cruise marketing budget by scale. Mainstream family/couples positioning vs Ambassador's adult-only niche, but the most direct competitor for broad brand awareness share of voice.",
    offersUrl: PO_CRUISE_URL,
    offerSelector: "#special-offers .bg-base.rounded-md",
  },
  // International — bigger premium/mainstream lines with UK no-fly programmes
  {
    name: "Cunard",
    website: "https://www.cunard.com",
    tier: "international",
    parentGroup: "Carnival Corporation & plc",
    notes:
      "Premium/luxury tier well above Ambassador's price point. Competes for share of \"no-fly heritage cruising\" perception rather than price-led bookers.",
  },
  {
    name: "MSC Cruises (UK)",
    website: "https://www.msccruises.co.uk",
    tier: "international",
    parentGroup: "MSC Group",
    notes:
      "Newest-ships / biggest-scale positioning. Largest social reach of the UK cruise set (per Q2 2026 digital benchmark) vs Ambassador's smaller, older, more intimate fleet.",
  },
  {
    name: "Celebrity Cruises",
    website: "https://www.celebritycruises.com/gb",
    tier: "international",
    parentGroup: "Royal Caribbean Group",
    notes: "Premium, design-led positioning. Trade/agent-led activation over mass consumer advertising in the UK.",
  },
  {
    name: "Princess Cruises",
    website: "https://www.princess.com/en-gb",
    tier: "international",
    parentGroup: "Carnival Corporation & plc",
    notes:
      "Mainstream premium, big-ship. Strongest Instagram presence of the UK cruise set. Larger ships and broader family skew vs Ambassador.",
  },
  {
    name: "Royal Caribbean International",
    website: "https://www.royalcaribbean.com/gbr",
    tier: "international",
    parentGroup: "Royal Caribbean Group",
    notes:
      "\"Come Seek\" adventure/activity-led positioning built on onboard hardware (FlowRider, RipCord by iFLY). Opposite pole to Ambassador's small-ship, no-fly, adult-only intimacy.",
  },
  // Trade — independent/OTA cruise retailers reselling the above lines
  {
    name: "iglu Cruise",
    website: "https://www.iglucruise.com",
    tier: "trade",
    parentGroup: "Flight Centre Travel Group",
    notes:
      "UK's largest independent cruise specialist. Long-standing SEO strength; broadest supplier relationships/product range of any UK agent.",
  },
  {
    name: "Planet Cruise",
    website: "https://www.planetcruise.com",
    tier: "trade",
    parentGroup: "Flight Centre Travel Group (via Iglu)",
    notes: "TV-led sister brand to Iglu, historically differentiated on broadcast strength vs Iglu's online strength.",
  },
  {
    name: "Cruise.co.uk",
    website: "https://www.cruise.co.uk",
    tier: "trade",
    parentGroup: "Independent (est. 1984)",
    notes:
      "Value/price-led positioning. Award-led PR/reputation positioning (multiple \"World's Leading Cruise Travel Agent\" wins).",
  },
  {
    name: "Bolsover Cruise Club",
    website: "https://www.bolsovercruiseclub.com",
    tier: "trade",
    parentGroup: "Independent (family-owned, est. 1960s)",
    notes:
      "Traditional cruise-specialist advice model now explicitly pivoting to social-first acquisition targeting younger, digitally-native customers — one to watch for audience overlap with Ambassador's regional/British base.",
  },
  {
    name: "Cruise Nation",
    website: "https://www.cruisenation.com",
    tier: "trade",
    parentGroup: "Independent",
    notes:
      "Comparison-led, no-fly specialist. Explicitly lists Ambassador alongside the majors in its comparison messaging — direct visibility for Ambassador product within a competitor's shop window.",
  },
  {
    name: "Cruise1st UK",
    website: "https://www.cruise1st.co.uk",
    tier: "trade",
    parentGroup: "Independent",
    notes: "Broad-range OTA, brochure-led line/ship browsing. Very wide catalogue breadth incl. niche lines.",
  },
];

async function upsertSailings(competitorName: string, sailings: SeedSailing[]) {
  const competitor = await prisma.competitor.findFirstOrThrow({ where: { name: competitorName } });
  for (const sailing of sailings) {
    const existing = await prisma.product.findFirst({ where: { competitorId: competitor.id, name: sailing.name } });
    const data = { ...sailing, currency: "GBP", competitorId: competitor.id };
    if (existing) {
      await prisma.product.update({ where: { id: existing.id }, data });
    } else {
      await prisma.product.create({ data });
    }
  }
}

async function main() {
  for (const c of competitors) {
    const existing = await prisma.competitor.findFirst({ where: { name: c.name } });
    if (existing) {
      await prisma.competitor.update({ where: { id: existing.id }, data: c });
    } else {
      await prisma.competitor.create({ data: c });
    }
  }

  await upsertSailings("Fred. Olsen Cruise Lines", fredOlsenSailings);
  await upsertSailings("P&O Cruises", poSailings);

  const totalSailings = fredOlsenSailings.length + poSailings.length;
  console.log(
    `Seed complete: ${competitors.length} competitors (4 direct, 5 international, 6 trade), ` +
      `${totalSailings} real tracked sailings (Fred. Olsen: ${fredOlsenSailings.length}, P&O: ${poSailings.length}).`
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
