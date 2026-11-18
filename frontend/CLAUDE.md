# frontend/CLAUDE.md

Scope: React SPA. Root `CLAUDE.md` and `.claude/rules/frontend.md` also apply.

## Commands (run from `frontend/`)
```bash
pnpm install --frozen-lockfile
pnpm run dev       # :5173
pnpm run lint      # ESLint flat config
pnpm run build     # tsc -b && vite build  (type check gate)
```

## Layout
`src/app` (router, providers, Redux `store.ts`, lazy pages, stale-chunk reload) · `src/features/<domain>` (api, types, hooks, schemas) · `src/pages` · `src/components` · `src/shared` (api client, hooks, utils, types). Alias `@` → `src/`.

## State
- Server data: thunks + the generic `resources` slice (`src/shared/api/resource`): `useResource({queryKey, queryFn, enabled, staleTime})` to read, `useAction({mutationFn, onSuccess, onError})` to write, `useResourceCache()` for `invalidate` / `setData` / `fetch`. Entries are keyed by `queryKey`; `invalidate(prefix)` reloads what is on screen.
- Client-only data (flashcards, Word Rush, class edits): slices in `features/{flashcards,wordRush,classes}/slice.ts`, exposed through each feature's `store.ts` facade. In-memory, reset on reload (no backend yet).

## Adding a page/feature
Use the `/new-frontend-feature` skill (checklist lives there).
