import { createSelector, createSlice, current, type PayloadAction } from "@reduxjs/toolkit";
import type { ClassDoc, ClassItem, ClassSession } from "./types";

/*
 * Class data comes from three places:
 *  - api:     the signed-in teacher's courses / the signed-in student's enrolled courses (real backend), mirrored here
 *             from the `resources` slice by `useApiClasses` so the non-hook helpers can read one merged list.
 *  - local:   classes the teacher created in this browser (the API only lets admins create courses). Memory only.
 *  - overlay: edits made to an API class: per-session field changes, extra sessions, removed sessions and documents
 *             (topic, attendance, homework, ...). Only the differences are stored, so sessions the teacher never touched
 *             keep following the course schedule from the server. There is no backend for these yet; memory only.
 * Everything starts empty. Reducers are pure: ids are created by the callers in `store.ts`.
 */
type Overlay = {
  /** Changed fields of derived sessions, by session id. */
  edits: Record<string, Partial<ClassSession>>;
  /** Sessions added here (extra or copied). */
  added: ClassSession[];
  /** Ids of derived sessions the teacher deleted. */
  removed: string[];
  docs: ClassDoc[];
};
export type ClassesState = { api: ClassItem[]; local: ClassItem[]; overlays: Record<string, Overlay> };

const initialState: ClassesState = { api: [], local: [], overlays: {} };

function applyOverlay(c: ClassItem, o: Overlay | undefined): ClassItem {
  if (!o) return c;
  const removed = new Set(o.removed);
  const sessions = c.sessions.filter((s) => !removed.has(s.id)).map((s) => (o.edits[s.id] ? { ...s, ...o.edits[s.id] } : s));
  return { ...c, sessions: [...sessions, ...o.added], docs: o.docs };
}

/** Fields of `next` that differ from `base` (compared by value). */
function diffSession(base: ClassSession, next: ClassSession): Partial<ClassSession> {
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(next) as (keyof ClassSession)[]) {
    if (JSON.stringify(next[k]) !== JSON.stringify(base[k])) out[k] = next[k];
  }
  return out as Partial<ClassSession>;
}

/** The overlay that turns the API class `api` into `next`. */
function toOverlay(api: ClassItem, next: ClassItem): Overlay {
  const baseById = new Map(api.sessions.map((s) => [s.id, s]));
  const nextIds = new Set(next.sessions.map((s) => s.id));
  const edits: Overlay["edits"] = {};
  const added: ClassSession[] = [];
  for (const s of next.sessions) {
    const base = baseById.get(s.id);
    if (!base) added.push(s);
    else if (base !== s) {
      // Same reference = untouched by the edit; only changed sessions need a field diff.
      const d = diffSession(base, s);
      if (Object.keys(d).length) edits[s.id] = d;
    }
  }
  return { edits, added, removed: api.sessions.filter((s) => !nextIds.has(s.id)).map((s) => s.id), docs: next.docs };
}

/** API classes with their overlay applied, followed by the browser-only ones. */
type WithClasses = { classes: ClassesState };
export const selectClasses = createSelector(
  [(s: WithClasses) => s.classes.api, (s: WithClasses) => s.classes.overlays, (s: WithClasses) => s.classes.local],
  (api, overlays, local): ClassItem[] => [...api.map((c) => applyOverlay(c, overlays[c.id])), ...local],
);

/** Apply `fn` to a class, wherever it lives. Students always come from the API and are never edited here. */
function patch(state: ClassesState, id: string, fn: (c: ClassItem) => ClassItem) {
  const plain = current(state);
  const local = plain.local.find((c) => c.id === id);
  if (local) {
    const next = fn(local);
    state.local = plain.local.map((c) => (c.id === id ? next : c));
    return;
  }
  // Only this one class is merged (not the whole list): `applyOverlay` returns the API class itself when it has no overlay.
  const api = plain.api.find((c) => c.id === id);
  if (api) state.overlays[id] = toOverlay(api, fn(applyOverlay(api, plain.overlays[id])));
}

/** Apply `fn` to one session of a class. */
function patchSession(state: ClassesState, classId: string, sessionId: string, fn: (s: ClassSession) => ClassSession) {
  patch(state, classId, (c) => ({ ...c, sessions: c.sessions.map((s) => (s.id === sessionId ? fn(s) : s)) }));
}

const nextNo = (c: ClassItem) => Math.max(0, ...c.sessions.map((x) => x.no)) + 1;
type HW = { kind: "deck" | "set"; id: string };

const classesSlice = createSlice({
  name: "classes",
  initialState,
  reducers: {
    apiClassesSet(state, a: PayloadAction<ClassItem[]>) {
      if (JSON.stringify(a.payload) === JSON.stringify(current(state.api))) return;
      state.api = a.payload;
    },
    classCreated(state, a: PayloadAction<ClassItem>) {
      state.local.push(a.payload);
    },

    /* ---------- sessions ---------- */
    /** `session.no` is assigned here; an empty topic becomes "Buổi <no>". */
    sessionAdded(state, a: PayloadAction<{ classId: string; session: Omit<ClassSession, "no"> }>) {
      patch(state, a.payload.classId, (c) => {
        const no = nextNo(c);
        return { ...c, sessions: [...c.sessions, { ...a.payload.session, no, topic: a.payload.session.topic || `Buổi ${no}` }] };
      });
    },
    /** Copy one session of a class onto another date (used by "Sao chép từ tuần trước"). */
    sessionCopied(state, a: PayloadAction<{ classId: string; sessionId: string; date: string; id: string }>) {
      patch(state, a.payload.classId, (c) => {
        const src = c.sessions.find((s) => s.id === a.payload.sessionId);
        if (!src) return c;
        const no = nextNo(c);
        return { ...c, sessions: [...c.sessions, { ...src, id: a.payload.id, date: a.payload.date, no, topic: `Buổi ${no}`, attendance: undefined, homework: undefined }] };
      });
    },
    sessionRemoved(state, a: PayloadAction<{ classId: string; sessionId: string }>) {
      patch(state, a.payload.classId, (c) => ({ ...c, sessions: c.sessions.filter((s) => s.id !== a.payload.sessionId) }));
    },
    topicUpdated(state, a: PayloadAction<{ classId: string; sessionId: string; topic: string }>) {
      patchSession(state, a.payload.classId, a.payload.sessionId, (s) => ({ ...s, topic: a.payload.topic }));
    },
    attendanceSet(state, a: PayloadAction<{ classId: string; sessionId: string; studentId: string; present: boolean }>) {
      const { studentId, present } = a.payload;
      patchSession(state, a.payload.classId, a.payload.sessionId, (s) => ({ ...s, attendance: { ...(s.attendance ?? {}), [studentId]: present } }));
    },
    homeworkAdded(state, a: PayloadAction<{ classId: string; sessionId: string; hw: HW }>) {
      const { hw } = a.payload;
      patchSession(state, a.payload.classId, a.payload.sessionId, (s) =>
        (s.homework ?? []).some((h) => h.kind === hw.kind && h.id === hw.id) ? s : { ...s, homework: [...(s.homework ?? []), hw] },
      );
    },
    homeworkRemoved(state, a: PayloadAction<{ classId: string; sessionId: string; hw: HW }>) {
      const { hw } = a.payload;
      patchSession(state, a.payload.classId, a.payload.sessionId, (s) => ({ ...s, homework: (s.homework ?? []).filter((h) => !(h.kind === hw.kind && h.id === hw.id)) }));
    },

    /* ---------- documents ---------- */
    docAttached(state, a: PayloadAction<{ classId: string; sessionId: string; docId: string }>) {
      const { docId } = a.payload;
      patchSession(state, a.payload.classId, a.payload.sessionId, (s) => (s.docIds.includes(docId) ? s : { ...s, docIds: [...s.docIds, docId] }));
    },
    docDetached(state, a: PayloadAction<{ classId: string; sessionId: string; docId: string }>) {
      const { docId } = a.payload;
      patchSession(state, a.payload.classId, a.payload.sessionId, (s) => ({ ...s, docIds: s.docIds.filter((d) => d !== docId) }));
    },
    docAdded(state, a: PayloadAction<{ classId: string; doc: ClassDoc }>) {
      patch(state, a.payload.classId, (c) => ({ ...c, docs: [a.payload.doc, ...c.docs] }));
    },
    docRemoved(state, a: PayloadAction<{ classId: string; docId: string }>) {
      const { docId } = a.payload;
      patch(state, a.payload.classId, (c) => ({
        ...c,
        docs: c.docs.filter((d) => d.id !== docId),
        sessions: c.sessions.map((s) => ({ ...s, docIds: s.docIds.filter((x) => x !== docId) })),
      }));
    },
  },
});

export const classesActions = classesSlice.actions;
export const classesReducer = classesSlice.reducer;
