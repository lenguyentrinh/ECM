import { combineReducers, configureStore, createAction, type Reducer } from "@reduxjs/toolkit";
import { useSelector } from "react-redux";
import { AUTH_QUERY_KEY } from "@/features/auth/authKeys.ts";
import { classesReducer } from "@/features/classes/slice.ts";
import { flashcardsReducer } from "@/features/flashcards/slice.ts";
import { wordRushReducer } from "@/features/wordRush/slice.ts";
import { configureSession } from "@/shared/api/client.ts";
import { hashKey, keepOnly, resetResourceRequests, resourcesReducer, setResource } from "@/shared/api/resource/index.ts";

/** Clears all state except the session. Dispatched automatically whenever the signed-in user changes or the session ends (see below). */
export const resetClientState = createAction("app/resetClientState");

const appReducer = combineReducers({
  /** Server data: one entry per request key, filled by thunks (see `shared/api/resource`). */
  resources: resourcesReducer,
  /** Client-only state (flashcards, Word Rush, class edits). `classes.api` mirrors `resources` data for non-hook helpers. */
  classes: classesReducer,
  flashcards: flashcardsReducer,
  wordRush: wordRushReducer,
});

export type RootState = ReturnType<typeof appReducer>;

const rootReducer: Reducer<RootState> = (state, action) =>
  resetClientState.match(action)
    ? { ...appReducer(undefined, action), resources: keepOnly(state?.resources, [AUTH_QUERY_KEY]) }
    : appReducer(state, action);

export const store = configureStore({
  reducer: rootReducer,
  // Responses can be large, so the dev-only "was this mutated?" scan skips them; values must still be serializable
  // (errors are stored as plain copies, see `toStoredError`).
  middleware: (getDefault) => getDefault({ immutableCheck: { ignoredPaths: ["resources"] } }),
});

export const useAppSelector = useSelector.withTypes<RootState>();

const authHash = hashKey(AUTH_QUERY_KEY);
const sessionEntry = () => store.getState().resources.entries[authHash];

// The axios client reports an expired session through these two hooks instead of importing the store.
configureSession({
  isSignedIn: () => !!sessionEntry()?.data,
  expire: () => store.dispatch(setResource(AUTH_QUERY_KEY, null)),
});

/**
 * One owner for "the session changed": the stored `["auth","me"]` user. When it becomes a guest (logout, expiry) or a
 * different user, the previous user's state is dropped, whichever code path caused it.
 */
let currentUserId: string | null = null;
store.subscribe(() => {
  const entry = sessionEntry();
  if (entry?.status !== "success") return;
  const next = (entry.data as { id?: string } | null | undefined)?.id ?? null;
  if (next === currentUserId) return;
  const prev = currentUserId;
  currentUserId = next;
  if (prev !== null) {
    resetResourceRequests(); // requests of the previous user must not land in the new user's store
    store.dispatch(resetClientState());
  }
});
