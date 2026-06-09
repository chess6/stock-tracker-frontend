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

## Safe defaults for public deployments

1. Serve the production build behind HTTPS.
2. Point the API proxy at a hardened backend with `ADMIN_API_KEY` set.
3. Do not expose the admin console to untrusted users without authentication at the edge.
