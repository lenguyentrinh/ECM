# 0002. Server data in Redux (thunks + `resources` slice), no TanStack Query

- Status: Accepted
- Date: 2026-11-16

## Context
The frontend used TanStack Query for server data and, after adding Redux Toolkit for client-only state, two tools covered two kinds of state. The team found two libraries confusing and wanted one flow: a thunk calls the API, a slice stores the result, components read it from the store.

## Decision
Remove `@tanstack/react-query`. Server data lives in the Redux store, in one generic `resources` slice keyed by request key (`["courses"]`, `["course", id]`, ...).
- `shared/api/resource/thunks.ts`: `fetchResource` (dedupes in-flight calls, honours `staleTime`, `force` waits for a running request), `invalidateResources` (marks entries stale and reloads those on screen), `setResource`.
- `shared/api/resource/slice.ts`: hand-written reducer (no Immer, so responses are never frozen).
- `shared/api/resource/hooks.ts`: `useResource` (read), `useResources` (dynamic list), `useAction` (write, tracks `isPending`), `useResourceCache` (`invalidate`, `setData`, `fetch`).
- HTTP calls stay in `features/<x>/*Api.ts` and the axios client.
- `app/store.ts` clears everything except the session when the signed-in user changes.

## Consequences
One store and one mental model. We now own caching behaviour (stale time, dedupe, invalidation) that the library gave for free: no garbage collection of unused entries, no automatic retries, no refetch on window focus, no request cancellation, no devtools. Revisit RTK Query if this layer needs to grow.
