import { createAction, type UnknownAction } from "@reduxjs/toolkit";

/**
 * Server data in the Redux store: one entry per request key (e.g. `["courses"]`, `["course", id]`).
 * Thunks (see `thunks.ts`) call the API and dispatch these actions; components read the entry through the hooks.
 * The reducer is hand-written (no Immer) so API responses are stored as-is and are never frozen.
 */
export type ResourceKey = readonly unknown[];

export type ResourceEntry = {
  key: ResourceKey;
  status: "loading" | "success" | "error";
  data?: unknown;
  error?: unknown;
  /** When `data` was last loaded (ms). */
  updatedAt?: number;
  /** Set by a mutation: the data is out of date and is reloaded (now if on screen, else on next use). */
  invalid?: boolean;
};

export type ResourcesState = { entries: Record<string, ResourceEntry> };

// JSON.stringify turns `undefined` into `null` inside arrays; keep them apart so `["x", undefined]` and `["x", null]` differ.
const encode = (v: unknown): string => JSON.stringify(v, (_k, x: unknown) => (x === undefined ? "\u0000undefined" : x));

export const hashKey = (key: ResourceKey): string => encode(key);

/** True when `key` starts with every element of `prefix`. */
export const keyStartsWith = (key: ResourceKey, prefix: ResourceKey): boolean =>
  prefix.length <= key.length && prefix.every((p, i) => encode(p) === encode(key[i]));

export const resourceActions = {
  started: createAction<{ key: ResourceKey }>("resources/started"),
  succeeded: createAction<{ key: ResourceKey; data: unknown; at: number }>("resources/succeeded"),
  failed: createAction<{ key: ResourceKey; error: unknown }>("resources/failed"),
  invalidated: createAction<{ prefix: ResourceKey }>("resources/invalidated"),
};

const initialState: ResourcesState = { entries: {} };

export function resourcesReducer(state: ResourcesState = initialState, action: UnknownAction): ResourcesState {
  if (resourceActions.started.match(action)) {
    const { key } = action.payload;
    const h = hashKey(key);
    const prev = state.entries[h];
    // Reloading data that is already on screen changes nothing visible.
    if (prev?.updatedAt !== undefined && prev.status !== "error") return state;
    // A retry after a failure drops the old error: show the data again, or the loader when there is none.
    return { entries: { ...state.entries, [h]: { ...prev, key, status: prev?.updatedAt !== undefined ? "success" : "loading", error: undefined } } };
  }
  if (resourceActions.succeeded.match(action)) {
    const { key, data, at } = action.payload;
    return { entries: { ...state.entries, [hashKey(key)]: { key, status: "success", data, updatedAt: at, invalid: false } } };
  }
  if (resourceActions.failed.match(action)) {
    const { key, error } = action.payload;
    const h = hashKey(key);
    return { entries: { ...state.entries, [h]: { ...state.entries[h], key, status: "error", error } } };
  }
  if (resourceActions.invalidated.match(action)) {
    let changed = false;
    const entries: Record<string, ResourceEntry> = {};
    for (const [h, e] of Object.entries(state.entries)) {
      if (keyStartsWith(e.key, action.payload.prefix) && !e.invalid) {
        entries[h] = { ...e, invalid: true };
        changed = true;
      } else entries[h] = e;
    }
    return changed ? { entries } : state;
  }
  return state;
}

/** Drop every entry except the given keys (used when the signed-in user changes: keep the session entry only). */
export function keepOnly(state: ResourcesState | undefined, keys: ResourceKey[]): ResourcesState {
  const entries: Record<string, ResourceEntry> = {};
  for (const k of keys) {
    const h = hashKey(k);
    if (state?.entries[h]) entries[h] = state.entries[h];
  }
  return { entries };
}
