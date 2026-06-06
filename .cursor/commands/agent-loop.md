# Agent Loop

Run the autonomous frontend repair orchestrator.

## Steps

1. `cd stock_tracker_frontend`
2. `npm run agent:loop`
3. Monitor structured logs in `orchestrator/logs/`
4. Review branches `agent/fix-*` for committed repairs
5. Inspect `agent_tasks/failed/` for tasks needing manual intervention
6. Read `.cursor/agent_tasks/{id}.md` briefs for Cursor-assisted fixes

## Stop

`Ctrl+C` — graceful shutdown after current tick.

## Do not

- Force-push `agent/fix-*` branches
- Run loop on dirty `master` with uncommitted work you want to keep (stash first)
