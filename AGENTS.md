# Frontend agent instructions

Repo-wide guidance for AI agents and contributors working in `stock_tracker_frontend/`.

## Before finalizing any frontend change

### 1. Visual & UX review

Check for:

- overflow issues (tables, nav, cards on narrow viewports)
- inconsistent spacing (use Bootstrap `m-*` / `p-*` / `gap-*`, not ad-hoc pixels)
- broken responsiveness (desktop, tablet, mobile)
- accessibility violations (labels, focus, contrast, keyboard nav, `aria-*` on async regions)
- missing loading states
- missing empty states
- dark mode issues (navbar is dark; new surfaces must remain readable)
- hydration issues (CRA is client-only today — avoid SSR assumptions)
- unnecessary re-renders (memoize expensive column defs, avoid inline objects in hot paths)

### 2. Run checks

```bash
npm run lint          # ESLint (src)
npm run build:check   # production build gate (CI=true)
npm test -- --watchAll=false --runInBand
npm run test:visual   # Playwright screenshot regression
```

TypeScript: this repo is JavaScript (Create React App). Use `build:check` + ESLint until a TS migration lands. ESLint allows up to 15 warnings (legacy debt); do not add new warnings when touching a file.

### 3. Screenshot regression

Playwright captures **desktop**, **tablet**, and **mobile** for key routes. Baselines live in `e2e/snapshots/`.

```bash
npm run test:visual              # compare against baselines
npm run test:visual:update       # accept new baselines after intentional UI change
npm run qa:frontend              # lint + unit + visual
```

### 4. Compare against baselines

`playwright.config.js` sets `maxDiffPixelRatio: 0.02` (2%). Failures attach diff images under `test-results/`.

### 5. If visual diffs exceed threshold

1. Explain what changed and whether it is intentional
2. Fix unintended layout/spacing/overflow regressions
3. Re-run `npm run test:visual` automatically until green
4. Only run `test:visual:update` when the new look is correct

### 6. Prefer existing UI primitives

| Need | Use |
|------|-----|
| Data tables | `DataGrid` + `ColumnHeader` |
| Layout | Reactstrap `Container`, `Row`, `Col`, `Card` |
| Forms / buttons | Reactstrap `Button`, `Input`, `Form` |
| Loading | Reactstrap `Spinner` or table overlay pattern in `PortfolioPage` |
| Charts | ApexCharts via `react-apexcharts` |
| Conditional shading | `src/utils/heatMap.js` |
| Formatting | `src/utils/formatters.js` |
| API URLs | `src/apiConfig.js` only |

Do not introduce parallel table/grid libraries or one-off layout wrappers unless explicitly requested.

### 7. Spacing & color

- Spacing: Bootstrap spacing scale (`0–5`), `gap-2`, `py-3`, `mb-3`, etc.
- Colors: Bootstrap theme (`primary`, `secondary`, `danger`, …) and `heatMap.js` ramps
- Never add arbitrary hex/rgb spacing unless extending shared tokens in `DataGrid.css` / `index.css` with a comment

### 8. Tables & charts on small screens

- All tables: `overflow-x: auto` wrapper or `DataGrid` horizontal scroll
- Sticky columns only where already established (`select`, `ticker`, `price`)
- Charts: `max-width: 100%`, test at 375px width

### 9. Async UI states

Every data-fetching page **must** have:

- **loading** — spinner, skeleton, or overlay
- **error** — user-visible message, not silent failure
- **empty** — actionable copy (e.g. link to `/admin` for cache bootstrap)

### 10. Layout shift

- Reserve space for spinners/toolbars while loading
- Avoid mounting heavy tables before column widths are known
- Prefer opacity overlays (`PortfolioPage` pattern) over DOM swap that jumps page height

## Key routes

| Route | Page |
|-------|------|
| `/` | PortfolioPage |
| `/dashboard` | DashboardPage |
| `/news` | NewsPage |
| `/screener` | StockScreenerPage |
| `/admin` | AdminConsolePage |
| `/:ticker` | SummaryPage |
| `/:ticker/financials` | FinancialsPage |

## Autonomous repair orchestrator

Continuous loop: scan → task → repair → `npm run qa:frontend` → commit on `agent/fix-*` branch.

```bash
npm run agent:loop
```

- Tasks: `agent_tasks/{pending,active,completed,failed}/`
- Cursor briefs: `.cursor/agent_tasks/{id}.md`
- Logs: `orchestrator/logs/*.jsonl`
- Budgets: 5 retries, 20 file edits, 30 min timeout per task

The loop stops on repeated QA failure, architectural ambiguity, or exhausted repair budget.

## Related docs

- `README.md` — setup and admin console
- `orchestrator/README.md` — repair orchestrator details
- `.cursor/rules/frontend-react.mdc` — API and routing conventions
- `.cursor/rules/frontend-qa.mdc` — QA gate summary (always apply)
