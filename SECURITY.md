# Security Policy

Report vulnerabilities privately to the repository owner (GitHub Security Advisories → "Report a vulnerability"); do not open public issues.

Baseline guarantees to preserve: HttpOnly cookie auth with refresh rotation, hashed OTPs with TTL/attempt limits, per-IP auth rate limiting, backend-enforced authorization, no secrets in the repo (`.env` is git-ignored; use `.env.example`).
