# CSS Refactor Plan — Bloomberg Terminal Aesthetic

**Status:** Phases 0–5 complete (Tailwind + `st-*` + layout shim; Bootstrap/reactstrap removed)  
**Last updated:** 2026-06-08

---

## Goal

Move away from generic Bootstrap styling toward a **Bloomberg-style dark research terminal**: high information density, amber labels, cool blue links/focus, layered panels, dark charcoal grid headers, medium heatmaps.

End state: **Tailwind only** (no Bootstrap/reactstrap). Third-party grids wrapped + token overrides.

See also: [`UI_PHILOSOPHY.md`](./UI_PHILOSOPHY.md)

---

## Agreed design spec

| Decision | Choice |
|----------|--------|
| Reference | Bloomberg Terminal |
| Default theme | Dark |
| Density | High |
| Accents | Amber labels + cool blue links/focus |
| Typography | Sans UI; monospace for tickers & raw values |
| Chrome | Layered panels (thin border + light shadow) |
| Grid headers | Dark charcoal bar, white/amber text |
| Heatmaps | Medium intensity |
| Navbar | Compact dark bar (Phase 2) |
| Migration | Research first → expand → Tailwind-only |
| Third-party grids | Wrap + CSS variable overrides |

---

## Current state

| Layer | Today |
|-------|--------|
| Framework | Bootstrap 5.3 + scattered reactstrap |
| Tokens | `themes.css` (`--st-*` + Bootstrap overrides) |
| Custom CSS | ~10 files (Research, grids, nav, pipeline) |
| Build | Create React App (`react-scripts`) + CRACO for Tailwind |
| Tests | Playwright visual regression — update snapshots per phase |

Generic Bootstrap look comes from default `btn` / `card` / `shadow-sm` / `container` patterns, not missing dark mode.

---

## Target architecture

```
tailwind.config.js          ← design tokens (colors, spacing, fonts, shadows)
postcss.config.js
craco.config.js
src/styles/
  tokens.css                ← CSS vars for heatmaps, grids, 3rd-party overrides
  base.css                  ← @tailwind base; body typography
  components.css            ← @layer components (st-btn, st-panel, st-input, …)
  index.css                 ← imports all layers
```

Existing `--st-*` tokens map to Tailwind theme extensions so heatmaps and grid libs keep working during migration.

---

## Phased rollout

| Phase | Scope | Outcome | Status |
|-------|--------|---------|--------|
| **0 — Foundation** | Tailwind + CRACO; design tokens; Bootstrap still loaded | Build works; tokens ready | Done |
| **1 — Research styling** | `st-*` chrome, toolbar, grid colors, buttons | Research no longer generic Bootstrap cards | Done (partial) |
| **1b — Research density** | Analytics layout, chart aspect/Y-axis, panel consolidation | Deep-dive readable above Historical Financials | **Done** |
| **1c — Icons** | Font Awesome free icons for density cues | Faster scan without extra text | **Done** |
| **2 — Shell** | AppNavbar, theme toggle, toasts, page layout | Compact dark nav | **Done** |
| **3 — Data pages** | Portfolio, Dashboard, Financials, Screener | Same density + grid language | **Done** |
| **4 — Admin + misc** | Admin console, pipeline, News, Movers | Consistent chrome | **Done** |
| **5 — Bootstrap removal** | Drop `bootstrap.min.css`, reactstrap; `layout-shim.css` + Tailwind pipeline | No Bootstrap/reactstrap deps | **Done** |

**Rule:** replace `className="btn btn-sm card shadow-sm"` with `st-*` component classes — no half-migrated Research components.

---

## Phase 1 — Research pilot specifics (done / in progress)

- **Toolbar:** single compact strip, `st-*` buttons, Bootstrap grid for alignment
- **Grid:** dark header bar, amber group labels, monospace tickers, tabular-nums metrics
- **Panels:** `st-panel` chrome — no Bootstrap cards on Research
- **Score badges / insider chips:** amber outline or muted fill
- **Narrative:** compact deep-dive panel (inline stats + overlay + events table in one column)

### Research files (Phase 1)

- `src/pages/ResearchPage.js`
- `src/pages/research.css`
- `src/components/research/*`
- `src/styles/components.css` (shared `st-*` primitives)

---

## Phase 1b — Research deep-dive density & chart readability (done)

**Goal:** Panels above Historical Financials should read like a terminal analytics strip — comparable signal per pixel to the financial grid — not three full-width stacked cards with flat charts.

**Reference URL for QA:** `/research/AAPL?dim=MRY&years=10&groups=balance,income,cashflow`

### Browser audit findings (2026-06-08, ~1400px viewport)

| Issue | Measured | Impact |
|-------|----------|--------|
| Chart row not in 3-column layout | `.research-deep-dive-charts` computed `display: block` (Tailwind `xl:grid-cols-3` not applied) | Margin / Capital / Narrative panels stack at **full width (~1373px)** |
| Margin Trends chart aspect | Chart ~**1363×165px** (~8:1 width:height) | 10-year margin slopes look flat; YoY change is hard to see |
| Capital Structure chart | Stats row + chart ~**1363×150px** | Four stat tiles consume height; leverage chart is a thin strip |
| Narrative Correlation chart | Overlay ~**1378×145px** | Price/sentiment overlay similarly compressed |
| Vertical scroll before grid | Chart stack alone ~**760px** + Narrative Events + Insider (open) | User scrolls far before Historical Financials |
| Apex Y-axis defaults | Margin chart auto-scales **0–50%** | Apple gross ~44–46% uses only top band of plot |
| Duplicate narrative UI | `chartsOnly` panel + separate **Narrative Events** panel | Same story told twice; wastes vertical space |
| Insider Activity default | `<details open>` | Large block pushes grid down on every load |
| Score Breakdown | Collapsed `<details>` | OK, but expanded uses 3 Bootstrap columns + padding |
| Tailwind layout utilities in JSX | `grid`, `flex`, `space-y-*`, `xl:grid-cols-*` in `ResearchDeepDive.js`, `ScoringPanel.js`, `CompareMetricsPanel.js` | **Unreliable** — only `st-*` explicit CSS is guaranteed today; layout classes silently fall back to block flow |

**Root cause (layout):** Phase 1 moved markup to Tailwind utility classes, but the build only reliably emits explicit `st-*` rules in `components.css`. Utility classes are not consistently present in the served CSS, so responsive grids never activate.

**Root cause (charts):** `compact` mode hard-codes short Apex `height` (145–165px) while panels span full viewport width, and Y-axis ranges are not tightened to data.

---

### Phase 1b — Layout targets

#### 1. Analytics strip (above Historical Financials)

Replace stacked full-width panels with a **fixed 3-column analytics row** at `≥1280px`:

```
┌─────────────────────────────────────────────────────────────────┐
│  Header strip (ticker, scores, price) — single row, ≤56px      │
├──────────────────┬──────────────────┬──────────────────────────┤
│ Margin Trends    │ Capital Structure │ Narrative (compact)      │
│ ~33% width       │ ~33% width        │ ~33% width               │
│ chart min-h 220  │ stats inline row  │ stats inline + overlay   │
├──────────────────┴──────────────────┴──────────────────────────┤
│  Collapsed by default: Score Breakdown | Insider Activity      │
├─────────────────────────────────────────────────────────────────┤
│  Narrative Events (single table, max-h 180px scroll)           │
├─────────────────────────────────────────────────────────────────┤
│  Historical Financials (primary — sticky header, full width)   │
└─────────────────────────────────────────────────────────────────┘
```

**Implementation rule:** define layout in `research.css` (`.research-analytics-row`, `.research-analytics-col`), not Tailwind utilities, until Phase 5 utility pipeline is verified.

| Breakpoint | Columns | Notes |
|------------|---------|-------|
| `≥1280px` | 3 equal columns, `gap: 4–6px` | Margin / Capital / Narrative side-by-side |
| `992–1279px` | 2 columns (Margin+Capital top, Narrative full width below) | |
| `<992px` | 1 column | Acceptable; charts still need min-height |

**Above-the-fold budget:** header + toolbar + analytics strip ≤ **45% viewport height** on 1080p so Historical Financials header is visible without scroll.

---

### Phase 1b — Panel-by-panel density spec

#### A. Deep-dive header (`research-deep-dive-header`)

| Current | Target |
|---------|--------|
| Multi-row flex-wrap (ticker, badges, actions, price) | **Single dense row** on desktop: ticker + name + sector \| score chips \| sparkline + price \| actions |
| Score badges wrap to second line | Horizontal chip strip, `overflow-x: auto` if needed |
| `text-base` ticker | `0.9rem` mono ticker; trim vertical padding to `py-0.5` |

#### B. Margin Trends (`MarginTrendChart.js`)

| Current | Target |
|---------|--------|
| `height={165}` in compact | **`min-height: 220px`** plot area; width follows column (~400–450px at 3-col) |
| Y-axis 0–50% auto | **Tight range:** `min = floor(min(series) - 3%)`, `max = ceil(max(series) + 2%)` per visible series |
| Legend top, 11px | **Legend bottom** or right inline; 9–10px; reduce chart top padding |
| 4 smooth lines | Keep 4 series; stroke width 2.5 in narrow columns |
| X labels rotated -45° | **Horizontal year labels** (`2016`…`2025`) when ≥8 points; rotate only on narrow breakpoints |
| Bootstrap green/blue colors | Token colors: `#6ecf97`, `#5b9cf5`, `#f5a623`, `#e87882` |

**Acceptance:** gross margin 2016→2025 slope visibly steeper on AAPL at default zoom.

#### C. Capital Structure (`CapitalStructurePanel.js`)

| Current | Target |
|---------|--------|
| 4 stat cards in Bootstrap `row` + separate chart | **Inline stat strip** (4 metrics in one row, no card borders) above chart |
| `compact` hides ratio summary line | Show **one-line ratios** (`D/E · CR · Lev`) in 10px muted text |
| Chart `height={150}` | **`min-height: 200px`** in analytics column |
| Area chart with dual Y-axis titles | Drop axis titles in compact; tick labels only |
| Full-width empty space below stats | Remove `research-capital-stat` min-height / extra padding |

**Optional upgrade:** replace area chart with **sparkline + latest value** when column width `<360px`.

#### D. Narrative Correlation (`NarrativePanel.js` `chartsOnly`)

| Current | Target |
|---------|--------|
| 3 stat boxes + divergence note + overlay chart | **Single row:** `30d | 90d | 180d | divergence flag` then chart |
| Overlay `height={145}` | **`min-height: 200px`** |
| Dual Y-axis titles ("Price", "Sentiment") | Remove titles; color-coded legend only |
| Separate Narrative Events panel below | **Merge:** one Narrative section — chart on top, events table below inside same panel OR collapse events into tab |

#### E. Narrative Events (table panel)

| Current | Target |
|---------|--------|
| Full-width panel, `max-height: 150px` on table wrap | **`max-height: 140px`** with sticky header; 6–8 rows visible |
| Two tables when not compact | In deep-dive compact: **topEvents only**; recent articles link to News |
| Bootstrap `table table-sm table-striped` | `st-grid-table` styling for consistency |

#### F. Score Breakdown (`ScoringPanel.js` in `<details>`)

| Current | Target |
|---------|--------|
| `md:grid-cols-3` (Tailwind — broken) | CSS grid `grid-template-columns: repeat(3, 1fr)` in `research.css` |
| Collapsed by default | Keep collapsed |
| Card padding per score block | Reduce to `padding: 0.25rem`; component table `font-size: 0.68rem` |

#### G. Insider Activity (`InsiderPanel.js` deep-dive)

| Current | Target |
|---------|--------|
| `<details open>` | **Collapsed by default** |
| Buy/sell ratio table + recent txns stacked | Ratio summary **inline**; recent txns `max-height: 120px` scroll |
| Bootstrap tables | Migrate to compact `st-grid-table` |

#### H. Historical Financials (reference standard)

The grid is the density benchmark. Panels above it should not exceed **~40% combined height** of the grid viewport.

| Property | Keep / extend |
|----------|----------------|
| Compact row height ~22px | Keep |
| Sticky metric column | Keep |
| Horizontal scroll for years | Keep; ensure scrollbar visible (not clipped by panel) |
| Group toggle buttons in header | Keep; consider icon-only labels on narrow widths |

---

### Phase 1b — Chart system defaults (`chartTheme.js` + per-chart options)

Add shared **compact chart preset** for deep-dive analytics columns:

```js
// Target defaults for analytics-column charts
{
  chart: { toolbar: { show: false }, zoom: { enabled: false } },
  legend: { position: 'bottom', fontSize: '9px', offsetY: 0 },
  grid: { padding: { top: 0, right: 8, bottom: 0, left: 4 } },
  xaxis: { labels: { style: { fontSize: '9px' } } },
  yaxis: { labels: { style: { fontSize: '9px' } }, title: { text: undefined } },
}
```

**Aspect ratio guard:** wrap each `Chart` in `.research-chart-plot` with `min-height: 220px; max-height: 280px; width: 100%`.

**Responsive height:** pass `height` from container `ResizeObserver` or use `aspect-ratio: 4 / 3` on wrapper instead of fixed 165px.

---

### Phase 1b — CSS tasks (explicit, not Tailwind)

Add to `research.css`:

| Class | Purpose |
|-------|---------|
| `.research-analytics-row` | `display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.35rem` @ `min-width: 1280px` |
| `.research-analytics-col` | `min-width: 0; display: flex; flex-direction: column` |
| `.research-chart-plot` | `flex: 1; min-height: 220px` |
| `.research-stat-strip` | Horizontal inline stats, no card chrome |
| `.research-deep-dive-header` | Single-row desktop layout (grid areas) |
| `.research-narrative-compact` | Combined narrative chart + table density |

Remove or replace broken Tailwind classes in:

- `ResearchDeepDive.js` — `space-y-1.5`, `grid grid-cols-*`, `flex`, `ml-auto`
- `ScoringPanel.js` — `grid grid-cols-*`
- `CompareMetricsPanel.js` — `grid grid-cols-*` (screener compare row)

---

### Phase 1b — Acceptance checklist

- [x] At 1400px width, Margin / Capital / Narrative appear **side-by-side** (not stacked).
- [x] Margin Trends chart plot area ≥ **220px tall**; AAPL gross margin slope clearly visible 2016→2025.
- [x] Y-axis on margin chart does **not** start at 0% when all values >15%.
- [x] Historical Financials header visible within **one screen** on 1080p without scrolling (toolbar + header + 3-col strip).
- [x] Insider Activity collapsed by default.
- [x] No duplicate narrative table panels (one events block).
- [x] All layout works with **only** `research.css` + `components.css` (no dependency on Tailwind utilities).
- [x] Playwright visual snapshot for AAPL deep-dive (`visual-regression.spec.js`).

**Estimated effort:** 1–1.5 days (layout CSS + chart option tuning + panel markup trim).

---

## Third-party grids

Keep `@svar-ui/react-grid` / tabulator for now:

1. Wrap in Tailwind-styled containers
2. Override header/row/border colors via `tokens.css`
3. Revisit replacement only if overrides fight virtualization

---

## Risks / guardrails

- **CRA + Tailwind:** CRACO (proven with react-scripts 5); do not eject
- **Bundle size:** remove Bootstrap in Phase 5; net size should shrink
- **Visual regression:** update Playwright snapshots at end of each phase
- **Scope creep:** styling only — no grid behavior changes

---

## Estimated effort

| Phase | Rough effort |
|-------|----------------|
| 0 Foundation | 0.5–1 day |
| 1 Research styling | 2–3 days |
| **1b Research density** | **1–1.5 days** |
| 2 Shell | 1 day |
| 3–4 Remaining pages | 3–4 days |
| 5 Bootstrap removal | 1 day |

## Phase 0–1 implementation notes (done)

- **CRACO + Tailwind v3** wired into `package.json` scripts (`craco start/build/test`)
- **Design tokens:** `src/styles/tokens.css` (Bloomberg amber/blue dark palette)
- **Component primitives:** `src/styles/components.css` (`st-panel`, `st-btn-*`, `st-input`, `st-grid-table`, …)
- **Research styling migrated:** toolbar, screener, deep-dive chrome, grids, scoring, insiders, compare
- **MRY multi-year fallback:** deep-dive fetches ARY periods when MRY returns &lt;2 rows
- Bootstrap still loaded globally for non-Research pages (Phase 2+)

## Post–Phase 5 notes

- **Tailwind** enabled via `styles/index.css` (`@tailwind` in `base.css`); prefer explicit `st-*` / `research.css` for critical layout.
- **`layout-shim.css`** provides legacy `.row`, `.btn`, `.card`, `.table`, `.alert` shims for pages not yet fully migrated to `st-*`.
- **Playwright:** `research-aapl-deep-dive.png` baseline added to `visual-regression.spec.js` (run `npm run test:visual:update` after intentional UI changes).
- **Bundle:** removing Bootstrap/reactstrap saves ~24 kB JS + ~27 kB CSS (gzip) per production build.

---

## Phase 1c — Icon density (done)

**Library:** [Font Awesome Free](https://fontawesome.com/icons) — already in `package.json` (`@fortawesome/react-fontawesome`, solid + regular free sets). No new dependency.

**Style rules**

- Icons **12–14px** inline with labels; amber for section headers, muted for table column hints
- Pair icon + text on first use; icon-only on repeated toolbar/chip controls with `title` / `aria-label`
- Do not replace heatmap colors or score badges with icons alone — icons supplement, not replace, numeric signal

**Suggested placements (Research deep-dive)**

| Area | Icon (FA solid) | Purpose |
|------|-----------------|--------|
| Margins & Capital header | `faChartLine` | Profitability section |
| Capital stat strip | `faLandmark` / `faCoins` | Debt vs cash at a glance |
| Narrative header | `faNewspaper` | News/sentiment block |
| Divergence flag | `faArrowTrendUp` / `faArrowTrendDown` | Bullish/bearish divergence |
| Score Breakdown summary | `faCalculator` | Expand scoring detail |
| Insider Activity summary | `faUserSecret` | Form 4 / insider block |
| Historical Financials group toggles | `faTableColumns` + per-group (`faFileInvoiceDollar`, `faScaleBalanced`, `faMoneyBillTransfer`, `faPercent`, `faStar`) | Compact group switcher |
| Copy / CSV / Share toolbar | `faCopy`, `faFileCsv`, `faShareNodes` | Already common pattern; migrate Research toolbar |
| YoY / CAGR cells | `faCaretUp` / `faCaretDown` (optional) | Replace unicode ▲▼ where space is tight |

**Implementation note:** import icons in each component (tree-shaken per icon), or add `src/icons/researchIcons.js` re-export map in Phase 1c.

---

## Optional follow-ups (not blocking)

1. Reference screenshots / exact hex codes from Bloomberg UI
2. Font picks — e.g. IBM Plex Mono for tickers, Inter/Geist for UI (currently system fonts)
