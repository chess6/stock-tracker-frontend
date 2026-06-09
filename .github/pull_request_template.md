## Summary

<!-- 1–3 sentences: what changed and why -->

## Type of change

- [ ] Bug fix
- [ ] New feature
- [ ] Refactor / docs / styling
- [ ] Test coverage

## How to verify

<!-- Pages visited, commands run, screenshots -->

```bash
npm run lint
timeout 300 env CI=true npm test -- --watchAll=false --runInBand --maxWorkers=2
```

## Checklist

- [ ] No secrets or `.env` in the diff
- [ ] API calls use `src/apiConfig.js`
- [ ] Tests added or updated when behavior changes
- [ ] Visual changes documented (screenshot or `test:visual:update` if applicable)

## Related issues

<!-- Fixes #123 -->
