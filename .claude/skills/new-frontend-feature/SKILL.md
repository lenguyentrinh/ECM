---
name: new-frontend-feature
description: Add a frontend page or feature (types, API, resource hooks, Zod form, lazy guarded route) following project conventions.
disable-model-invocation: true
---

# New frontend feature: $ARGUMENTS

1. Look at a comparable feature in `frontend/src/features/` (e.g. `categories`, `courses`) and mirror its structure.
2. Create `types.ts` matching the backend DTOs, `<name>Api.ts` using `src/shared/api/client.ts`, and read/write with `useResource` / `useAction` (`src/shared/api/resource`), calling `cache.invalidate(key)` for related keys after writes.
3. Forms: React Hook Form + Zod; show backend errors via react-toastify.
4. Add the page in `src/pages`, register a lazy route in `src/app/routes` with `RequireAuth roles={[...]}`.
5. Cover loading, empty and error states; keep it accessible and Tailwind-only.
6. Run the `verify` skill (`pnpm run lint && pnpm run build`).
