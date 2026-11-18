---
paths:
  - "backend/src/**"
  - "frontend/src/**"
---

# Testing rules

- Bug fix = failing test first, then the fix. New business rule = test for the happy path **and** each rejection path (409/403/404).
- Backend: JUnit 5 + Mockito unit tests next to the service (`src/test/java/.../service/impl/*Test.java`, see `EnrollmentServiceImplTest` for style). Use `@SpringBootTest` only when wiring/security is the subject.
- Tests must be deterministic: inject/mocks for clocks, randomness and mail; no dependence on a running MySQL for unit tests.
- Frontend has no test runner yet; correctness gate is `pnpm run lint` + `pnpm run build`. If you add logic-heavy utilities, propose adding Vitest rather than silently skipping tests.
- Never delete, skip or weaken a test to get green. If a test is wrong, explain why and fix it explicitly.
