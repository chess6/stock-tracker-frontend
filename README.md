# Stock Tracker Frontend

React UI for the Stock Tracker app — high-density portfolio grid, macro dashboard, news hub, and admin console. Requires the [backend API](https://github.com/chess6/stock-tracker-backend) at `http://localhost:5000`.

## Tech stack

React, Redux Toolkit, @tanstack/react-table, Reactstrap, Bootstrap

## Prerequisites

- Node.js 18+ and npm
- Backend running on port 5000

## Setup & run

```bash
npm install
sh start.sh    # → http://localhost:3000
sh stop.sh
```

Logs: `frontend.out`

The dev server proxies `/api` to `localhost:5000` via `package.json` `"proxy"`.

## Pages

| Route | Page | Description |
|-------|------|-------------|
| `/` | Portfolio | Valuation ratios, insider $, heat maps, external research links |
| `/dashboard` | Dashboard | Macro tiles — indices, commodities, rates, sector ETFs |
| `/news` | News | Deduped RSS articles with filters and portfolio-only toggle |
| `/screener` | Screener | Insider buying totals with dollar heat shading |
| `/admin` | Admin console | Cache bootstrap and refresh controls |
| `/columns` | Column reference | Legacy fundamentals field glossary (`/nasdaq-columns` redirects here) |
| `/:ticker` | Summary | Quote, chart, news for one ticker |
| `/:ticker/financials` | Financials | SEC financials with YoY % column and shading |
| `/:ticker/insiders` | Insider transactions | SEC Form 4 grid (`/ticker/:ticker` redirects here) |

Portfolio tickers are stored in **browser localStorage** (`portfolio` key). Add tickers via the navbar search box (+ button).

## Admin console

Open **http://localhost:3000/admin** after the backend is running.

The admin console drives the backend SQLite cache. The rest of the app reads cached data — not live SEC/RSS on every page load.

### Ticker input

Comma-separated symbols for refresh actions. Default: `AAPL,MSFT,NVDA,AMD,GOOGL,AMZN,META,TSLA`. Set this to your portfolio before refreshing.

### Buttons

| Button | What it does |
|--------|--------------|
| **Bootstrap All** | Full pipeline: sync companies → fundamentals → RSS ingest → prices → insiders. Use on empty DB or after long downtime. May take minutes. |
| **Refresh Status** | Reload table counts and freshness timestamps. |
| **Sync Companies** | Download SEC company master (~10k tickers). Powers navbar search. |
| **Refresh Fundamentals** | SEC XBRL → portfolio ratios (S/P, Eb/EV, B/P, etc.) and financials page. |
| **Ingest Default Feeds** | Poll 53 RSS sources, dedup articles, link tickers. |
| **Refresh Prices** | Daily OHLCV → price, daily % change, charts. |
| **Refresh Insiders** | SEC Form 4 → 1M/3M/6M insider columns. |
| **Dedup Articles** | Re-normalize dates, semantic dedup, sentiment backfill. |
| **Queue RSS Poll** | Enqueue background RSS job (requires backend `worker.sh`). |

### Status panels

- **Counts** — rows per table (companies, feeds, articles, fundamentals, prices, insiders, queued jobs)
- **Freshness** — last update time for each data type and latest article dates
- **Default RSS Feeds** — read-only list of configured sources

### Typical workflows

**New install**

1. Start backend (`sh start.sh` in backend repo) and frontend (`sh start.sh` here)
2. Admin → set tickers (e.g. `JPM,MCD`) → **Bootstrap All**
3. Add more tickers via navbar search on the Portfolio page

**Daily use**

- Admin → **Refresh Prices** + **Ingest Default Feeds**
- Or use backend `refresh_data.sh` / `worker.sh`

**Portfolio shows `-` for price/ratios**

- Admin → **Refresh Fundamentals** and **Refresh Prices** for those tickers
- Confirm backend is running and has `SEC_USER_AGENT` in `.env`

**Empty portfolio**

- Portfolio page shows a CTA linking to Admin and Screener when no tickers are saved

**Stale data badge**

- Navbar shows a yellow **Stale** pill when prices, news, or fundamentals exceed age thresholds — click to open Admin

## Project layout

```
src/
├── pages/           PortfolioPage, DashboardPage, NewsPage, AdminConsolePage, …
├── components/      DataGrid, ColumnHeader, AppNavbar
├── config/          portfolioColumns.js — column metadata (labels, tooltips, groups)
├── utils/           heatMap.js, formatters.js, dataFreshness.js, tickerLinks.js
└── apiConfig.js     API endpoint constants
```

## Tests & QA

```bash
npm run lint
CI=true npm test -- --watchAll=false --runInBand
npm run test:visual              # Playwright screenshot regression (desktop/tablet/mobile)
npm run test:visual:update       # accept new baselines after intentional UI changes
npm run qa:frontend              # lint + unit + visual
```

First-time Playwright setup: `npm install && npx playwright install chromium`

Agent instructions: `AGENTS.md` and `.cursor/rules/frontend-qa.mdc`

### Autonomous repair loop

```bash
npm run agent:loop    # scan, repair, QA, commit on agent/fix-* branches
npm run test:health # console errors, API failures, overflow checks
```

See `orchestrator/README.md`.

## Known UI gaps

- Sparklines and multi-horizon % change (W%/4W%/16W%/6M%) not yet implemented
- 52-week high/low distance columns deferred until price history is exposed
- Financials TTM synthetic column not yet implemented

## License

MIT
