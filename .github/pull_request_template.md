## What & why
<!-- What changes and the reason. Link the issue. -->

## Type
- [ ] feat  - [ ] fix  - [ ] refactor  - [ ] perf  - [ ] docs  - [ ] chore/ci

## How it was verified
- [ ] `./mvnw -B verify` (backend)
- [ ] `pnpm run lint && pnpm run build` (frontend)
- [ ] Manually exercised the flow (describe)

## Checklist
- [ ] New/changed endpoints have explicit authorization and validation
- [ ] Tests cover the new rule and its rejection paths
- [ ] No secrets, `.env` content or unrelated changes
- [ ] Schema impact considered (`ddl-auto: update` is additive only)
- [ ] `CLAUDE.md` domain rules updated if behaviour changed
