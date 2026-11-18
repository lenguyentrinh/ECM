import { useCallback, useEffect, useMemo, useState } from "react";
import type { ThunkDispatch, UnknownAction } from "@reduxjs/toolkit";
import { shallowEqual, useDispatch, useSelector } from "react-redux";
import { useLatest } from "@/shared/hooks/useLatest.ts";
import { hashKey, type ResourceKey } from "./slice.ts";
import { fetchResource, invalidateResources, observe, setResource, type ResourceRoot } from "./thunks.ts";

type Dispatch = ThunkDispatch<ResourceRoot, unknown, UnknownAction>;

export type ResourceOptions<T> = {
  queryKey: ResourceKey;
  queryFn: () => Promise<T>;
  /** Default true. When false nothing is requested (cached data, if any, is still returned). */
  enabled?: boolean;
  /** How long loaded data counts as fresh, in ms (default 0: reload every time the component mounts). */
  staleTime?: number;
};

/**
 * Read server data from the Redux store for a list of requests (same order as `queries`). On mount a thunk loads
 * each one (unless fresh data is already there), the slice stores the result, and this hook selects it.
 * The returned array only changes when a stored entry changes.
 */
export function useResources<T>(queries: ResourceOptions<T>[]) {
  const dispatch = useDispatch<Dispatch>();
  const hashes = queries.map((q) => hashKey(q.queryKey));
  const entries = useSelector((s: ResourceRoot) => hashes.map((h) => s.resources.entries[h]), shallowEqual);
  // Also changes when a store reset removes an entry, so that entry is loaded again.
  const depKey = queries.map((q, i) => `${hashes[i]}${q.enabled === false ? "!" : ""}${entries[i] ? "" : "?"}`).join("|");

  const latest = useLatest(queries);

  useEffect(() => {
    const stops: Array<() => void> = [];
    latest.current.forEach((q, i) => {
      if (q.enabled === false) return;
      const load = () => latest.current[i].queryFn();
      stops.push(observe(q.queryKey, load));
      void dispatch(fetchResource(q.queryKey, load, { staleTime: q.staleTime ?? 0 })).catch(() => undefined); // the error is kept in the store
    });
    return () => stops.forEach((stop) => stop());
  }, [depKey, dispatch, latest]);

  return useMemo(
    () => entries.map((e) => ({ data: e?.data as T | undefined, error: e?.error, status: e?.status, updatedAt: e?.updatedAt })),
    [entries],
  );
}

/** Read one request. Components using the same `queryKey` share one stored entry. */
export function useResource<T>(opts: ResourceOptions<T>) {
  const [r] = useResources([opts]);
  return {
    data: r.data,
    error: r.error,
    /** True until the first answer (data or error) for this key. */
    isLoading: (opts.enabled ?? true) && (r.status === undefined || r.status === "loading"),
  };
}

/** Imperative access to the store's server data: reload after a mutation, write a value, or fetch right now. */
export function useResourceCache() {
  const dispatch = useDispatch<Dispatch>();
  return useMemo(
    () => ({
      /** Mark everything under `queryKey` out of date and reload what is on screen. */
      invalidate: (queryKey: ResourceKey) => dispatch(invalidateResources(queryKey)),
      setData: (queryKey: ResourceKey, data: unknown) => dispatch(setResource(queryKey, data)),
      /** Always load from the server now and return the result. */
      fetch: <T>(queryKey: ResourceKey, queryFn: () => Promise<T>) => dispatch(fetchResource(queryKey, queryFn, { force: true })),
    }),
    [dispatch],
  );
}

type ActionCallbacks<TData, TVars> = {
  onSuccess?: (data: TData, vars: TVars) => unknown;
  onError?: (error: unknown, vars: TVars) => unknown;
  onSettled?: (data: TData | undefined, error: unknown, vars: TVars) => unknown;
};

/** A write request (create / update / delete): runs `mutationFn`, then the callbacks, and tracks `isPending`. */
export function useAction<TVars = void, TData = unknown>(opts: { mutationFn: (vars: TVars) => Promise<TData> } & ActionCallbacks<TData, TVars>) {
  const [pending, setPending] = useState(0);
  const latest = useLatest(opts);

  const mutateAsync = useCallback(
    async (vars: TVars): Promise<TData> => {
      const o = latest.current;
      setPending((n) => n + 1);
      try {
        let data: TData;
        try {
          data = await o.mutationFn(vars);
        } catch (error) {
          await o.onError?.(error, vars);
          await o.onSettled?.(undefined, error, vars);
          throw error;
        }
        await o.onSuccess?.(data, vars);
        await o.onSettled?.(data, null, vars);
        return data;
      } finally {
        setPending((n) => n - 1); // always runs, even when a callback throws
      }
    },
    [latest],
  );

  /** Fire and forget: errors go to `onError`, never thrown. Per-call callbacks run after the ones given to the hook. */
  const mutate = useCallback(
    (vars: TVars, options?: ActionCallbacks<TData, TVars>) => {
      mutateAsync(vars).then(
        (data) => {
          void options?.onSuccess?.(data, vars);
          void options?.onSettled?.(data, null, vars);
        },
        (error: unknown) => {
          void options?.onError?.(error, vars);
          void options?.onSettled?.(undefined, error, vars);
        },
      );
    },
    [mutateAsync],
  );

  return { mutate, mutateAsync, isPending: pending > 0 };
}
