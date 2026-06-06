# Test Frontend

Run the full frontend QA pipeline and report results.

## Steps

1. `cd stock_tracker_frontend`
2. `npm run lint`
3. `CI=true npm run build`
4. `CI=true npm test -- --watchAll=false --runInBand`
5. `npm run test:visual` — requires Playwright browsers installed (`npx playwright install chromium`)
6. If visual tests fail:
   - Show which route/viewport diffed
   - Explain whether regression is intentional
   - Fix and re-run `npm run test:visual`
   - Only suggest `npm run test:visual:update` if the new UI is correct
7. Do not fix code unless the user asks

## Quick checks (manual)

- Portfolio empty state at `/` with cleared localStorage
- Admin console buttons at `/admin`
- Navbar stale badge when `/api/admin/status` returns old freshness
