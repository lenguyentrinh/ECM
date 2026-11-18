# Contributing

## Workflow
1. Branch from `main`: `feat/<topic>`, `fix/<topic>`, `chore/<topic>`.
2. Keep changes small and focused; one concern per PR.
3. Commit messages: Conventional Commits, e.g. `feat(course): reject overlapping teacher schedule`. Scopes: module/feature names.
4. Before pushing: `cd backend && ./mvnw -B verify` and `cd frontend && pnpm run lint && pnpm run build`.
5. Open a PR using the template; CI (`.github/workflows/ci.yml`) must be green.

## Working with AI agents (Claude Code)
- Project context: `CLAUDE.md` (+ `backend/CLAUDE.md`, `frontend/CLAUDE.md`), path-scoped rules in `.claude/rules/`, shared permissions in `.claude/settings.json`.
- Skills (slash commands): `/verify`, `/review-change`, `/fix-bug <desc>`, `/new-endpoint <desc>`, `/new-frontend-feature <desc>`.
- Agents in `.claude/agents/`: `spring-boot-engineer`, `react-ts-engineer`, `fullstack-engineer`.
- Personal overrides go in `.claude/settings.local.json` or `CLAUDE.local.md` (git-ignored). Never let an agent read `.env`.
- AI output is reviewed like any other code: you own what you merge.

## Decisions
Significant architecture decisions are recorded as ADRs in `docs/adr/`.
