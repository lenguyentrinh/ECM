---
paths:
  - "frontend/**"
---

# Frontend rules (React 19 / TS strict / Tailwind 4)

- Feature-first: code for a domain lives in `src/features/<feature>/` (`*Api.ts`, `types.ts`, hooks, schemas). Pages in `src/pages/` only compose; shared UI in `src/components/`; cross-feature helpers in `src/shared/`.
- Server state = Redux: a thunk loads it and the generic `resources` slice stores it, through `useResource` / `useAction` / `useResourceCache` from `src/shared/api/resource` (after a write, `cache.invalidate(key)` the related keys). Put HTTP calls in `*Api.ts`, never in components. Do not copy server data into other slices or local state. Session state comes from `useAuth()` (key `["auth","me"]`).
- Client-only state = Redux Toolkit. The store is `src/app/store.ts` (use `useAppSelector`/`useAppDispatch`); each feature owns a slice in `features/<x>/slice.ts`. Reducers must be pure: create ids, `Date.now()`, `Math.random()` and timers outside (in `features/<x>/store.ts`) and pass them in the action payload. Never put non-serializable values in the store. Pages import from `features/<x>/store.ts`, which keeps hooks and action helpers stable.
- Known exception: `classes.api` mirrors `resources` data so non-hook helpers can read a merged class list; do not add more mirrors.
- All HTTP goes through the axios client in `src/shared/api/client.ts` (cookies + shared refresh). Never call `fetch`/new axios instances and never read or store tokens in JS (HttpOnly cookies).
- Forms: React Hook Form + Zod schema; infer types with `z.infer`. Surface backend errors with react-toastify.
- TypeScript strict: no `any`, no `@ts-ignore` (use `@ts-expect-error` with a reason only if unavoidable). Keep API types in the feature's `types.ts` in sync with backend DTOs.
- Routes are lazy-loaded (`src/app/lazyPage.tsx`); new pages follow that pattern and are guarded with `RequireAuth roles={[...]}`.
- Styling: Tailwind utility classes only, no new CSS frameworks or inline style blocks unless dynamic.
- Components: accessible by default (labels, button vs link semantics, keyboard focus). Handle loading, empty and error states.
- Must pass `pnpm run lint` and `pnpm run build` (runs `tsc -b`) before you call work done.
