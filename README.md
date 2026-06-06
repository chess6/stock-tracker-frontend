# Stock Tracker Frontend

React UI for the Stock Tracker app. See the **[project README](../README.md)** for full setup, admin console, and architecture.

## Quick start

```bash
npm install
sh start.sh    # http://localhost:3000
sh stop.sh
```

Requires the backend running at `http://localhost:5000` (API proxied in dev).

## Pages

| Route | Page |
|-------|------|
| `/` | Portfolio |
| `/dashboard` | Macro dashboard |
| `/news` | News hub |
| `/screener` | Insider screener |
| `/admin` | Admin console |
| `/:ticker` | Summary |
| `/:ticker/financials` | Financials |

## Tests

```bash
CI=true npm test -- --watchAll=false --runInBand
```
