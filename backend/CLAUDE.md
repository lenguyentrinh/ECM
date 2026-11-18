# backend/CLAUDE.md

Scope: Spring Boot API. Root `CLAUDE.md` and `.claude/rules/backend.md` also apply.

## Commands (run from `backend/`)
```bash
./mvnw clean compile        # compile
./mvnw test                 # unit tests
./mvnw -B verify            # what CI runs (needs JWT_SECRET >= 32 chars)
./mvnw spring-boot:run      # dev server :8080, context path /api
```

## Package map
`com.trinh.english_center_be` → `modules/<domain>/{controller,service,service/impl,repository,entity,dto,mapper}` and `shared/{config,exception,response,util,enums,startup}`.
Note: `modules/user/Repository` is capitalised (legacy) — do not "fix" it in unrelated changes.

## Adding an endpoint
Use the `/new-endpoint` skill (checklist lives there).

## Gotchas
- Roles/status are re-read from DB per request; changing a role or locking a user must revoke refresh tokens.
- "Last active admin" invariants must hold for delete/lock/role change.
- Dev mail: without `spring.mail.host` OTP codes are only logged.
