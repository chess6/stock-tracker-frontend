# Security Policy

## Supported versions

| Version | Supported |
| ------- | --------- |
| `master` branch | Yes |

Older tags and forks are best-effort only.

## Reporting a vulnerability

**Please do not open a public GitHub issue for security vulnerabilities.**

Report privately via [GitHub Security Advisories](https://github.com/chess6/stock-tracker-frontend/security/advisories/new)
for this repository.

Include:

* Description of the issue and potential impact
* Steps to reproduce (proof-of-concept if available)
* Affected pages, components, or build configuration

We aim to acknowledge reports within **7 days** and will coordinate disclosure once a fix is available.

## Scope notes

* Portfolio tickers live in **browser localStorage** — not server-side secrets, but users should not paste sensitive holdings into public bug reports.
* The dev server proxies `/api` to `localhost:5000` — production deployments must configure CORS and TLS appropriately.
* Never commit `.env`, `.env.local`, or agent task logs with tokens.
* Never put secrets in `REACT_APP_*` variables. Create React App inlines them into the public JavaScript bundle; keep API keys on the backend.

## Secret scanning

Secrets are checked at three points:

1. **Before each commit:** `.githooks/pre-commit` runs [gitleaks](https://github.com/gitleaks/gitleaks) on staged changes. Enable it once per clone with `brew install gitleaks && git config core.hooksPath .githooks`.
2. **On every push and pull request:** `.github/workflows/secret-scan.yml` scans the full git history and fails the check if anything is found.
3. **GitHub push protection:** rejects pushes that contain secrets from known providers.

Rules, including Nasdaq Data Link and Tiingo key formats, live in `.gitleaks.toml`. Run `gitleaks git --redact .` to scan locally. Vendor API dumps such as `src/mock/SHARADAR_*.txt` are git-ignored because copied request URLs carry `api_key=`. If a secret is ever committed, **rotate it first**; removing it from history does not make it safe again.

## Safe defaults for public deployments

1. Serve the production build behind HTTPS.
2. Point the API proxy at a hardened backend with `ADMIN_API_KEY` set.
3. Do not expose the admin console to untrusted users without authentication at the edge.
