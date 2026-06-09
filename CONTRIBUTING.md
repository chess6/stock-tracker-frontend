# Contributing to Stock Tracker Frontend

Thank you for your interest in contributing. This UI pairs with the [backend API](https://github.com/chess6/stock-tracker-backend).

## Before you start

1. Read [README.md](README.md) for setup and page map.
2. Start the backend on port 5000 (see backend README).
3. Keep changes **small and scoped** — match patterns in `src/pages/`, `src/components/`, and `src/utils/`.

## Development setup

```bash
npm install
sh start.sh    # http://localhost:3000 — proxies /api to :5000
```

## Pull requests

1. Fork and create a branch from `master`.
2. Make your change with tests when behavior changes.
3. Run checks (one suite at a time on memory-constrained machines):

   ```bash
   npm run lint
   timeout 300 env CI=true npm test -- --watchAll=false --runInBand --maxWorkers=2
   ```

4. Open a PR using the template. Describe **why** the change is needed and how you verified it.

## Code guidelines

* **API routes** — define endpoints only in `src/apiConfig.js`.
* **Styling** — prefer `st-*` tokens and `src/styles/components.css`; avoid drive-by Bootstrap refactors.
* **Density** — preserve high-information grid layouts; tooltips via `StTooltip` / `ColumnHeader`.
* **Tests** — mock HTTP; cover route contracts and non-trivial UI logic.
* **No secrets** — never commit `.env` or local portfolio data.

## Reporting bugs

Use the [bug report issue template](.github/ISSUE_TEMPLATE/bug_report.yml). Include browser, steps, and screenshots when UI-related.

## Security

Do **not** open public issues for vulnerabilities. See [SECURITY.md](SECURITY.md).

## License

By contributing, you agree that your contributions will be licensed under the
[Apache License 2.0](LICENSE).
