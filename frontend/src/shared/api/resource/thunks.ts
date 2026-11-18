import type { ThunkAction, UnknownAction } from "@reduxjs/toolkit";
import { toStoredError } from "../error.ts";
import { hashKey, keyStartsWith, resourceActions, type ResourceKey, type ResourcesState } from "./slice.ts";

export type ResourceRoot = { resources: ResourcesState };
type Thunk<R> = ThunkAction<R, ResourceRoot, unknown, UnknownAction>;

/** Requests currently running, so several components asking for the same key share one call. */
const inflight = new Map<string, Promise<unknown>>();

/** Bumped by `resetResourceRequests`: answers to requests started before it are dropped instead of stored. */
let generation = 0;

/** Forget running requests (the signed-in user changed): their answers must not reach the store or be shared. */
export function resetResourceRequests() {
  generation++;
  inflight.clear();
}

/** Keys that are on screen right now (with a function that reloads them); `invalidateResources` refreshes these. */
const observers = new Map<string, { key: ResourceKey; load: () => Promise<unknown>; count: number }>();

/** Register a key as "on screen". Returns the function that unregisters it. */
export function observe(key: ResourceKey, load: () => Promise<unknown>): () => void {
  const h = hashKey(key);
  const cur = observers.get(h);
  if (cur) {
    cur.count++;
    cur.load = load;
  } else observers.set(h, { key, load, count: 1 });
  return () => {
    const o = observers.get(h);
    if (o && --o.count <= 0) observers.delete(h);
  };
}

/**
 * Load `key` with `load` unless fresh data is already in the store (`staleTime`, ms). Success and failure go
 * through the slice; the promise resolves with the data and rejects with the error.
 * `force` always reloads (after a request that is already running finishes, so its older answer cannot win).
 */
export const fetchResource =
  <T>(key: ResourceKey, load: () => Promise<T>, opts: { staleTime?: number; force?: boolean } = {}): Thunk<Promise<T>> =>
  async (dispatch, getState) => {
    const h = hashKey(key);
    for (;;) {
      const entry = getState().resources.entries[h];
      const fresh = !opts.force && entry?.status === "success" && !entry.invalid && Date.now() - (entry.updatedAt ?? 0) < (opts.staleTime ?? 0);
      if (fresh && entry) return entry.data as T;
      const running = inflight.get(h);
      if (!running) break;
      if (!opts.force) return running as Promise<T>;
      await running.catch(() => undefined);
    }
    const gen = generation;
    dispatch(resourceActions.started({ key }));
    const request = load().then(
      (data) => {
        if (gen === generation) dispatch(resourceActions.succeeded({ key, data, at: Date.now() }));
        return data;
      },
      (error: unknown) => {
        // The store keeps a plain copy of the error; callers awaiting this promise still get the original.
        if (gen === generation) dispatch(resourceActions.failed({ key, error: toStoredError(error) }));
        throw error;
      },
    );
    const done = () => {
      if (inflight.get(h) === request) inflight.delete(h);
    };
    inflight.set(h, request);
    request.then(done, done);
    return request;
  };

/** Mark every entry under `prefix` out of date and reload the ones that are on screen. Resolves when they are reloaded. */
export const invalidateResources =
  (prefix: ResourceKey): Thunk<Promise<void>> =>
  async (dispatch) => {
    dispatch(resourceActions.invalidated({ prefix }));
    const active = [...observers.values()].filter((o) => keyStartsWith(o.key, prefix));
    await Promise.all(active.map((o) => dispatch(fetchResource(o.key, o.load, { force: true })).catch(() => undefined)));
  };

/** Write a value straight into the store (e.g. the session becomes `null` on logout). */
export const setResource =
  (key: ResourceKey, data: unknown): Thunk<void> =>
  (dispatch) => {
    dispatch(resourceActions.succeeded({ key, data, at: Date.now() }));
  };
