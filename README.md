# Competitor Pricing & Promotions Tracker

Tracks competitor product prices and promotions over time by scraping
product pages on a schedule, storing the history, and surfacing price
drops/increases and new/ended promotions on a dashboard.

Designed to run entirely on free tiers: SQLite (or a free hosted Postgres),
a free Node host for the API, and a free static host for the dashboard.

## How it works

- **`server/`** — Express + TypeScript API, backed by Prisma/SQLite.
  - You register competitors and products; each product has a URL plus a
    CSS selector for its price element (and optionally one for promo text,
    e.g. a "Sale" badge or availability banner).
  - `POST /api/scrape/run` fetches every product's page with `axios`,
    parses it with `cheerio` using the configured selectors, and stores a
    `PriceEntry` (price, raw text, promo text, or an error if the selector
    didn't match).
  - An in-process `node-cron` job calls this on a schedule
    (`SCRAPE_CRON` env var, default every 6 hours).
  - `GET /api/alerts` compares each product's latest two price entries and
    reports price drops/increases and promos that appeared or disappeared.
- **`client/`** — React + Vite + Tailwind dashboard: add competitors and
  products, view price history charts (Recharts), promo history, and the
  alerts feed.
- **`.github/workflows/scrape.yml`** — an optional scheduled GitHub Action
  that calls `POST /api/scrape/run` on your deployed API. Free hosts often
  spin an idle service down, which can cause the in-process cron to be
  skipped while asleep; this workflow both wakes the service and triggers
  the scrape reliably using GitHub's free Actions minutes.

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
npm run seed                    # adds a demo competitor (books.toscrape.com)
cd ..
npm run dev:server              # http://localhost:4000

# --- client (in another terminal) ---
cp client/.env.example client/.env
npm run dev:client              # http://localhost:5173
```

Open the dashboard, go to **Competitors**, add a real competitor and a
product with a CSS selector for its price (use your browser's inspector to
find one), then click **Scrape now**.

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

## Data model

- `Competitor` — name, website, notes.
- `Product` — belongs to a competitor; `url`, `priceSelector`,
  `promoSelector` (optional), `currency`.
- `PriceEntry` — one scrape result per product: `price`, `rawPrice`,
  `promoText`, `error`, `scrapedAt`.

Alerts are derived on read from consecutive `PriceEntry` rows rather than
stored, so there's nothing extra to keep in sync.
