---
paths:
  - "backend/**"
---

# Backend rules (Spring Boot 3.5 / Java 24)

- Layering: controller → service (interface + `impl/`) → repository. Controllers hold no business logic and never return entities; always map to DTOs via the module's `mapper/`.
- Every write endpoint declares authorization explicitly (`@PreAuthorize`); ownership checks use `#id == authentication.principal.id`. Never rely on the frontend hiding a menu.
- Validate input with `@Valid` + Bean Validation on request DTOs; business-rule violations throw the project's custom exceptions handled by the global `@ControllerAdvice` (409 for conflicts, 404 missing, 403 forbidden). No `catch (Exception)` that swallows.
- Entities extend `BaseEntity`, String UUID ids, **lazy** relations. Avoid N+1: use fetch joins / `@EntityGraph` / projections in repositories for list endpoints. Never expose a lazy proxy through serialization.
- Soft delete (`active=false`) is the norm; queries must filter live rows. Keep history (e.g. enrollment `CANCELLED`).
- Schema is managed by Flyway (`src/main/resources/db/migration`); Hibernate only validates. Every entity/column change needs a new `V<n>__*.sql` (never edit an applied one); triggers live in `R__routines.sql`. Renaming/removing columns or changing types needs an explicit migration plan agreed with the user first.
- Secrets/config come from env vars via `application.yml`; never hard-code or log secrets, tokens, OTPs or passwords.
- Time: server timezone is `Asia/Ho_Chi_Minh`; use `java.time` types only.
- Lombok is fine for DTOs/entities; prefer constructor injection (`@RequiredArgsConstructor`).
