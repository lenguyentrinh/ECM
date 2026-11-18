---
name: review-change
description: Senior-engineer self review of the current diff before a commit or PR. Checks correctness, security, authorization, N+1, error handling, tests and project conventions.
---

# Review change

1. `git diff` (and `git diff --staged`). Read every changed file fully, not just hunks.
2. Check, in order: correctness & edge cases → authorization on every new/changed endpoint → input validation → data access (N+1, soft-delete filters, transactions) → security rules in `.claude/rules/security.md` → error handling and HTTP status → tests cover new rules and rejection paths → frontend loading/empty/error states and type safety → conventions in CLAUDE.md.
3. Flag scope creep: unrelated edits, dead code, new dependencies, schema changes.
4. Output findings ranked by severity with `file:line`, a concrete failing scenario, and a suggested fix. If clean, say so and list what you verified. Then run the `verify` skill.
