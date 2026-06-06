# Autonomous Frontend Repair Orchestrator

Continuously scans for frontend issues, creates repair tasks, attempts fixes, runs QA, and commits successful repairs on isolated branches.

## Quick start

```bash
npm run agent:loop
```

Requires: Python 3.10+, `npm install`, Playwright browsers (`npx playwright install chromium`).

Optional: `OPENAI_API_KEY` for LLM-assisted repairs. Without it, rule-based fixes + Cursor briefs in `.cursor/agent_tasks/` are used.

## Task lifecycle

```
scan → agent_tasks/pending → active (git branch) → QA → completed (commit) | failed
```

## Issue sources

| Source | Category |
|--------|----------|
| ESLint | `eslint_error`, `eslint_warning` |
| `build:check` | `build_failure` |
| Playwright visual | `visual_regression`, `playwright_failure` |
| Health scan | `console_error`, `api_failure`, `broken_ui` |
| Follow-up scan | `followup_cleanup` |

## Budgets (env overrides)

| Variable | Default |
|----------|---------|
| `AGENT_MAX_RETRIES` | 5 |
| `AGENT_MAX_FILE_EDITS` | 20 |
| `AGENT_TASK_TIMEOUT` | 1800s |
| `AGENT_SCAN_INTERVAL` | 120s |

## Stop conditions

- Repeated unresolved QA failure (3 consecutive same fingerprint)
- Architectural ambiguity (LLM low confidence / no safe edit)
- Deferred to Cursor (no auto-fix; brief written, no git branch created)
- Repair budget exhausted (retries or file edits)

## Scan behaviour

- Skips scan when `agent_tasks/pending/` is non-empty (drains backlog first)
- Caps new tasks at 15 per scan cycle
- Failed task fingerprints are never re-queued until manually cleared from `agent_tasks/failed/`

## Logs

Structured JSON lines: `orchestrator/logs/orchestrator-YYYYMMDD.jsonl`

## Branches

Each task runs on `agent/fix-{id}-{slug}`. Successful fixes are committed on that branch; loop returns to `master`/`main`.
