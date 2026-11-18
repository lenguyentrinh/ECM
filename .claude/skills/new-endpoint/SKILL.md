---
name: new-endpoint
description: Add a REST endpoint to a backend module following the project's layered conventions (DTO, service, repository, mapper, controller, security, tests).
disable-model-invocation: true
---

# New endpoint: $ARGUMENTS

1. Read the target module under `backend/src/main/java/com/trinh/english_center_be/modules/` and mirror an existing endpoint in it (naming, response wrapper, error types).
2. Confirm the requirement is unambiguous: roles allowed, validation rules, error cases (409/403/404). Ask the user only if truly blocked; default to ADMIN-only.
3. Implement in order: request/response DTOs → service interface + impl → repository query → mapper → controller with `@PreAuthorize` + OpenAPI annotations.
4. Write unit tests (happy path + each rejection) modelled on `EnrollmentServiceImplTest`.
5. Update the matching domain-rules paragraph in root `CLAUDE.md` if behaviour is user-visible.
6. Run the `verify` skill.
