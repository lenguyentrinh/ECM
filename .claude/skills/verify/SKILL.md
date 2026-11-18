---
name: verify
description: Run the full quality gate (backend tests, frontend lint and type-check build) and report results honestly. Use before saying any task is done or before committing.
---

# Verify

Run only the parts affected by the change (check `git diff --stat`), but run both if unsure.

1. Backend changed → `cd backend && ./mvnw -B verify` (set `JWT_SECRET` to any 32+ char string if unset).
2. Frontend changed → `cd frontend && pnpm run lint && pnpm run build`.
3. Report: command, pass/fail, and for failures the first real error with file:line. Never claim success without having run the command. Do not skip or weaken tests to pass; fix the cause or report it.
