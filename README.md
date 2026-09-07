# Competitor Pricing & Promotions Tracker

Built for Ambassador Cruise Line's Acquisition/Retention/Website digital
team. Tracks competitor cruise lines' headline offers and pricing on a
representative sample of sailings, on a schedule, so the team sees a
competitor price/offer move instead of hearing about it from a customer.

Sister tool to the "Digital Team Planner" — a separate app/repo, not an
extension of it. This one needs always-on scheduled infrastructure (not
static hosting), which shapes the deployment section below.

Designed to run on free tiers wherever possible: SQLite (or a free hosted
Postgres), a free Node host for the API, and a free static host for the
dashboard. The one thing that can push this past "fully free" is scraping a
JavaScript-rendered competitor site — see **Static vs JS-rendered
competitors** below.

## Competitor set

Seeded from the "Competitor Identification and Market Context" workbook
(Sept 2026), covering Ambassador's ex-UK, no-fly segment, tiered exactly as
that workbook's own analysis splits them:

- **Direct** (closest product/size peers): Fred. Olsen Cruise Lines, Saga
  Cruises, Marella Cruises, P&O Cruises
- **International** (bigger premium/mainstream lines with UK no-fly
  programmes): Cunard, MSC Cruises (UK), Celebrity Cruises, Princess
  Cruises, Royal Caribbean International
- **Trade** (independent/OTA agents reselling the above): iglu Cruise,
  Planet Cruise, Cruise.co.uk, Bolsover Cruise Club, Cruise Nation,
  Cruise1st UK

The fly-Caribbean sub-segment's competitor set is explicitly out of scope
for that workbook and hasn't been seeded — it needs its own pass.

`npm run seed` (in `server/`) loads this list as `Competitor` rows only —
no sailings or offer pages are pre-configured, because writing a real CSS
selector requires inspecting each site's actual markup, which needs to
happen from an environment with normal internet access (see
**Adding a real competitor** below).

## How it works

- **`server/`** — Express + TypeScript API, backed by Prisma/SQLite.
  - **Tracked sailings** (`Product` in the schema) are a representative
    pricing sample per competitor, not every cabin on every sailing —
    each has a URL, a CSS selector for its price, an optional one for
    incidental promo text, and dimensions to keep the sample meaningful:
    `routeType` (ex-UK vs fly-Caribbean), `destination`, `nights`,
    `cabinType`.
  - **Offers** are tracked separately from sailings, since a headline
    promotion ("Free drinks package", "Kids sail free") is usually
    brand-wide rather than tied to one itinerary. Each competitor can have
    an `offersUrl` + `offerSelector` (a CSS selector matching each
    individual offer element on that page).
  - `POST /api/scrape/run` scrapes every tracked sailing (price) and every
    competitor with offer tracking configured, then:
    - stores a `PriceEntry` per sailing (price, raw text, promo text, or
      an error if the selector didn't match anything — this is targeted
      extraction of specific fields, not whole-page diffing, so incidental
      markup changes don't generate noise);
    - diffs the current offer list against the last-known active offers
      per competitor (`scraper/scrapeOffers.ts`): an offer not seen before
      is created (`firstSeenAt` = now), one still present has `lastSeenAt`
      bumped, and one that's disappeared is marked inactive with
      `endedAt` = now. Validity dates/"while stocks last" are extracted
      best-effort from the offer text (`scraper/offerValidity.ts`) —
      offer copy has no fixed format, so the full raw text is always kept
      alongside in case parsing misses.
  - An in-process `node-cron` job calls this daily by default
    (`SCRAPE_CRON` env var — cruise pricing/offers don't move hourly, so
    daily is the starting cadence; lower it per-deployment if needed).
  - `GET /api/alerts` derives price drops/increases, promos that
    appeared/disappeared, and new/ended offers from the stored history —
    nothing extra to keep in sync, it's all computed on read.
- **`client/`** — React + Vite + Tailwind dashboard: competitors grouped by
  tier, current offers per competitor, price history charts (Recharts) per
  tracked sailing, and the combined alerts feed.
- **`.github/workflows/scrape.yml`** — an optional scheduled GitHub Action
  that calls `POST /api/scrape/run` on your deployed API. Free hosts often
  spin an idle service down, which can cause the in-process cron to be
  skipped while asleep; this workflow both wakes the service and triggers
  the scrape reliably using GitHub's free Actions minutes.

## Static vs JS-rendered competitors

Most of the scraping here is a plain HTTP GET parsed with `cheerio`
(`renderMode: "static"` on a `Competitor`/tracked sailing) — fast, cheap,
and enough for server-rendered pages.

Some competitor sites populate price/offer content client-side with
JavaScript, which a plain GET won't see. For those, set `renderMode: "js"`
— `scraper/fetchHtml.ts` then renders the page in headless Chromium
(via [Playwright](https://playwright.dev)) before extraction, using the
same CSS-selector logic either way.

This is the single biggest risk to staying free:
- `playwright` is **not** a default dependency of `server/` — it's
  lazy-`require`d, so a deployment with no JS-rendered competitors never
  needs it. Enabling `renderMode: "js"` for any competitor requires
  `npm install playwright && npx playwright install chromium` in `server/`.
- Chromium itself is ~300MB and meaningfully increases build time, disk
  use, and per-scrape memory — likely to exceed a free web-service tier's
  limits (e.g. Render's free tier) once more than a couple of JS-rendered
  competitors are scraped on the same schedule.
- If that happens, options in rough order of remaining "free where
  possible": (1) keep JS-rendered competitors to a minimum and stagger
  their scrapes; (2) run just the JS-rendered subset as a scheduled
  GitHub Actions job instead of on the always-on API host (Actions
  minutes are free and come with their own Linux runner, so no host
  memory limit); (3) a free tier of a hosted browser service (e.g.
  Browserless) if both of those aren't enough.

Per the incremental rollout plan below, start with static-HTML
competitors and only reach for `renderMode: "js"` once one specifically
needs it.

## Adding a real competitor's sailings/offers

Building a real scraper is "one small scraper per competitor" — each site
has different markup, so there's no generic selector that works
everywhere. For each pilot competitor:

1. Open the competitor's pricing page and their offers/promotions page in
   a browser.
2. Check `robots.txt` (`https://competitor-domain/robots.txt`) and their
   terms of service before scraping anything — don't skip this. If a page
   disallows crawling or the ToS prohibits automated access, don't track
   it here.
3. Right-click the price element → Inspect → find (or build) a CSS
   selector that uniquely matches it. Same for an offer banner/element on
   the offers page, and optionally a promo/availability element on the
   sailing page.
4. In the dashboard's **Competitors** page, use **+ Track sailing** (URL +
   price selector + route/destination/nights/cabin type) and **Offer
   tracking** (offers page URL + offer selector) to wire it up, then hit
   **Scrape now** and confirm a `PriceEntry`/`Offer` appears.
5. If the price doesn't show up on a static fetch, the page is likely
   JS-rendered — switch that sailing/competitor to `renderMode: "js"`
   (see above) and retry.

Start with 2-3 competitors (one per tier is a good spread of site
structures to prove the approach on) before adding the rest of the seeded
list.

**Once a competitor's selectors are proven on one cruise**, adding another
cruise on the *same* competitor doesn't need fresh HTML: their per-cabin
price selectors are usually a sitewide template (e.g. Fred. Olsen's
`#{cabintype}-standard-tab p` worked identically across two different
ships). Save the proven selectors as `CabinSelectorTemplate` rows for that
competitor (see `seed.ts` for the Fred. Olsen/P&O examples), then:

```bash
POST /api/competitors/:id/sailings/from-url
{ "url": "...", "name": "...", "destination": "...", "nights": 7, "routeType": "ex_uk" }
```

creates one tracked sailing per known cabin type in a single call. A
`CabinSelectorTemplate` is provisional until checked against more than one
cruise, though (a competitor could always have a special-format page) —
treat a competitor's templates as more trustworthy the more cruises
they've been confirmed against.

## Discovering new cruises automatically

Manually registering each cruise doesn't scale to "track everything
Ambassador has a comparable route for." `scraper/discoverListing.ts` +
`scraper/runDiscovery.ts` add a discovery layer on top of the manual
workflow above, in three parts:

1. **Ambassador's own routes** (`AmbassadorRoute` table) — the canonical
   list of what counts as "in scope": destination, night-count range, and
   `routeType` (`ex_uk`/`fly_caribbean`). This has to come from
   Ambassador's own sailing programme (ambassadorcruiseline.com) — nothing
   here invents it. Populate it the same way a competitor gets its first
   selectors: send a listing-page URL + a copied card, or (once someone
   with network access can) write a listing-discovery config for
   Ambassador's own site and run it into this table.
2. **Per-competitor listing discovery** — a competitor with `listingUrl` +
   `listingCardSelector`/`listingNameSelector`/`listingUrlSelector`
   configured (plus optionally `listingNightsSelector` and
   `listingFlyIndicatorSelector`) gets its search/listing page (e.g. Fred.
   Olsen's `/cruise-deals`) scraped for candidate cruises. Each candidate
   is classified `ex_uk` (no fly indicator), `fly_caribbean` (fly indicator
   + a Caribbean destination keyword match — see `CARIBBEAN_KEYWORDS` in
   `lib/constants.ts`), or out of scope (fly indicator, non-Caribbean
   destination — e.g. a fly-cruise to Spain) and silently dropped, since
   Ambassador only runs those first two segments.
3. **Matching + human review** — an in-scope candidate is fuzzy-matched
   (`lib/matchRoute.ts`: exact route type, nights within the route's
   range, word-overlap on destination) against `AmbassadorRoute`. A match
   is queued as a `DiscoveredSailing` (status `pending`) rather than
   auto-registered. Nothing becomes a real tracked sailing until a human
   approves it on the **Discovered** dashboard page (or
   `POST /api/discovered-sailings/:id/approve`), which then applies that
   competitor's `CabinSelectorTemplate`s to create real sailings in one
   step. Rejecting a candidate sticks — it won't be re-queued on the next
   discovery run.

This runs on its own weekly cron (`DISCOVERY_CRON`, separate from the
daily price/offer scrape) since listing pages change far less often than
prices, and because it's more requests across more pages than the
per-sailing scrape — keeping it infrequent and human-reviewed is a
deliberate choice, not a placeholder to remove once "trusted": broader,
unattended crawling of a competitor's full site is a bigger request-volume
and robots.txt decision that should be made explicitly if it's ever
wanted, not defaulted into.

`POST /api/discovered-sailings/run` (optionally `?competitorId=`) triggers
a discovery pass on demand.

## A note on scraping responsibly

Only scrape pages you're allowed to access. Check each competitor's
`robots.txt` and terms of service before tracking them, keep request
volume low (the scraper already waits between requests and only fetches
pages you configure), and expect that some sites will block or rate-limit
automated requests — that's a property of the target site, not a bug here.

## Local development

Requires Node 20+.

```bash
npm install                     # installs both workspaces

# --- server ---
cp server/.env.example server/.env
cd server
npx prisma migrate dev --name init
npm run seed                    # loads the real competitor list (see above)
cd ..
npm run dev:server              # http://localhost:4000

# --- client (in another terminal) ---
cp client/.env.example client/.env
npm run dev:client              # http://localhost:5173
```

Open the dashboard, go to **Competitors**, and follow **Adding a real
competitor's sailings/offers** above for whichever competitor you're
piloting first.

## Deploying for free

**Database — pick one:**
- SQLite file (simplest, works if your host gives the service persistent
  disk) — no changes needed, `DATABASE_URL="file:./prod.db"`.
- A free hosted Postgres (recommended if your host's disk isn't
  persistent), e.g. [Neon](https://neon.tech) or
  [Supabase](https://supabase.com) free tier. Change
  `server/prisma/schema.prisma`'s datasource `provider` to `"postgresql"`,
  set `DATABASE_URL` to the connection string they give you, then run
  `npx prisma migrate deploy`.

**API — a free Node host**, e.g. [Render](https://render.com) free web
service or [Railway](https://railway.app) free tier:
1. Root directory: `server`. Build command: `npm install && npm run build`.
   Start command: `npm run prisma:deploy && npm start`.
2. Set env vars from `server/.env.example` — in particular `DATABASE_URL`,
   `CORS_ORIGIN` (your deployed frontend's URL), and `SCRAPE_TRIGGER_TOKEN`
   (a random secret, so `/api/scrape/run` can't be triggered by strangers).
3. Note the deployed URL for the next step and for the frontend.

**Frontend — a free static host**, e.g. [Vercel](https://vercel.com) or
[Netlify](https://netlify.com):
1. Root directory: `client`. Build command: `npm run build`. Output dir: `dist`.
2. Set `VITE_API_URL` to your deployed API's `/api` URL
   (e.g. `https://your-app.onrender.com/api`).

**Reliable scheduling — GitHub Actions (free):**
Add two repository secrets (`API_URL`, `SCRAPE_TRIGGER_TOKEN` matching the
server's) so `.github/workflows/scrape.yml` can wake and trigger scrapes on
a schedule even if the free host spins the service down between requests.

## Alerts and who sees them

`GET /api/alerts` and the dashboard's alerts feed are the only surface
today — no email/Slack digest is wired up yet, since there's no confirmed
recipient list. Both are straightforward to add once there is one:
a free Slack incoming webhook for a channel digest, or a transactional
email free tier (e.g. Resend) for an email digest — either would just read
from the same `GET /api/alerts` response on the existing daily cron.

## Data model

- `Competitor` — name, website, `tier` (`direct` / `international` /
  `trade`), `parentGroup`, notes, and optional `offersUrl`/`offerSelector`/
  `renderMode` for offer tracking.
- `Product` (a tracked sailing) — belongs to a competitor; `url`,
  `priceSelector`, `promoSelector` (optional), `currency`, `routeType`
  (`ex_uk` / `fly_caribbean`), `destination`, `nights`, `cabinType`,
  `renderMode`.
- `PriceEntry` — one scrape result per tracked sailing: `price`,
  `rawPrice`, `promoText`, `error`, `scrapedAt`.
- `Offer` — one headline promotion per competitor: `title`, `detail`/
  `rawText`, `validFrom`/`validUntil` (best-effort parsed),
  `whileStocksLast`, `active`, `firstSeenAt`, `lastSeenAt`, `endedAt`.
- `CabinSelectorTemplate` — a competitor's proven per-cabin-type price
  selector, reusable across any of their cruise URLs (see **Discovering
  new cruises automatically**).
- `AmbassadorRoute` — Ambassador's own sailing programme (destination,
  night-count range, route type), the reference list discovered
  competitor cruises are matched against.
- `DiscoveredSailing` — a candidate cruise found by listing discovery that
  matched an `AmbassadorRoute`, pending human approval/rejection.

Alerts are derived on read from `PriceEntry`/`Offer` history rather than
stored separately, so there's nothing extra to keep in sync.
