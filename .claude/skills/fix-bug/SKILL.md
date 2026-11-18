---
name: fix-bug
description: Structured bug fix - reproduce, find root cause, write a failing test, fix minimally, verify. Use for any reported defect.
disable-model-invocation: true
---

# Fix bug: $ARGUMENTS

1. **Reproduce** — get exact steps/inputs/logs; find where in backend or frontend it originates. Don't guess.
2. **Root cause** — trace to the real cause (not the symptom); state it in one sentence.
3. **Failing test first** — add a test that fails for that cause (backend JUnit; frontend: explain manual repro if no runner).
4. **Minimal fix** — smallest change that addresses the cause; no drive-by refactors.
5. **Verify** — run the `verify` skill; confirm the new test fails before / passes after.
6. Summarise: cause, fix, tests, any follow-ups or risks.
