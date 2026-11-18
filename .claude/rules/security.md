# Security rules (apply everywhere)

- Never read, print, commit or paste the contents of `.env` files; use `.env.example` for variable names. If a secret appears in the conversation or diff, stop and tell the user.
- Auth is cookie-based (HttpOnly `AUTH_TOKEN`/`REFRESH_TOKEN`). Do not add tokens to JSON responses, `localStorage` or URLs.
- Keep generic messages for login / forgot-password to avoid user enumeration; keep OTP hashing, TTL, attempt limits and rate-limit filter intact when editing auth.
- Authorization is enforced on the backend for every endpoint. Treat new endpoints as ADMIN-only until the requirement says otherwise.
- Use parameterized JPA queries only; never build JPQL/SQL by string concatenation. Validate/normalise all user input at the DTO boundary.
- Do not weaken CORS, CSRF/cookie flags (`COOKIE_SECURE`, `COOKIE_SAMESITE`) or Spring Security rules to "make it work".
- Don't add dependencies without stating why; prefer what is already in `pom.xml` / `package.json`.
