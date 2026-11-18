import { createSlice, current, type PayloadAction } from "@reduxjs/toolkit";
import { advance, newPlayer, reportOf, tickRoom, toReveal } from "./logic.ts";
import type { WRQuestion, WRReport, WRResult, WRRoom, WRSet } from "./types.ts";

/**
 * Redux slice for Word Rush (no backend yet): starts empty and is lost on reload. The live room lives in this
 * browser tab only; a WebSocket/SSE feed would replace the timer tick and the room actions later.
 * Reducers are pure: ids, pins and timestamps are created by the callers in `store.ts`.
 */
export type WordRushState = {
  sets: WRSet[];
  room: WRRoom | null;
  results: Record<string, WRResult>;
  /** Last finished live session per set. */
  reports: Record<string, WRReport>;
  best: { score: number; title: string };
};

const initialState: WordRushState = { sets: [], room: null, results: {}, reports: {}, best: { score: 0, title: "" } };

type Now = PayloadAction<{ now: number }>;

/** Replace the room with `fn(room)` (a plain copy of it), if a room is open. */
function patchRoom(state: WordRushState, fn: (r: WRRoom) => WRRoom) {
  if (state.room) state.room = fn(current(state.room));
}

const wordRushSlice = createSlice({
  name: "wordRush",
  initialState,
  reducers: {
    setCreated(state, a: PayloadAction<WRSet>) {
      state.sets.unshift(a.payload);
    },
    setUpdated(state, a: PayloadAction<{ id: string; patch: Partial<WRSet> }>) {
      const s = state.sets.find((x) => x.id === a.payload.id);
      if (s) Object.assign(s, a.payload.patch);
    },
    questionAdded(state, a: PayloadAction<{ setId: string; question: WRQuestion }>) {
      state.sets.find((s) => s.id === a.payload.setId)?.questions.push(a.payload.question);
    },
    questionUpdated(state, a: PayloadAction<{ setId: string; qid: string; patch: Partial<WRQuestion> }>) {
      const q = state.sets.find((s) => s.id === a.payload.setId)?.questions.find((x) => x.id === a.payload.qid);
      if (q) Object.assign(q, a.payload.patch);
    },
    questionDeleted(state, a: PayloadAction<{ setId: string; qid: string }>) {
      const s = state.sets.find((x) => x.id === a.payload.setId);
      if (s) s.questions = s.questions.filter((x) => x.id !== a.payload.qid);
    },
    resultSaved(state, a: PayloadAction<WRResult>) {
      const r = a.payload;
      const prev = state.results[r.setId];
      if (r.kind === "game" && r.score > state.best.score) {
        state.best = { score: r.score, title: state.sets.find((s) => s.id === r.setId)?.title ?? state.best.title };
      }
      state.results[r.setId] = prev && prev.kind === "game" && prev.score > r.score && r.kind === "game" ? prev : r;
    },

    /* ---------- live room ---------- */
    roomOpened(state, a: PayloadAction<WRRoom>) {
      state.room = a.payload;
    },
    roomStarted(state, a: Now) {
      patchRoom(state, (r) =>
        r.questions.length === 0 ? r : { ...r, phase: "question", qIndex: 0, qStartedAt: a.payload.now, phaseAt: a.payload.now, answers: {}, stats: [] },
      );
    },
    questionEnded(state, a: Now) {
      patchRoom(state, (r) => (r.phase === "question" ? toReveal(r, a.payload.now) : r));
    },
    boardShown(state, a: Now) {
      patchRoom(state, (r) => ({ ...r, phase: "board", phaseAt: a.payload.now }));
    },
    nextQuestion(state, a: Now) {
      patchRoom(state, (r) => advance(r, a.payload.now));
    },
    /** Last question revealed -> final standings. */
    finalShown(state, a: Now) {
      patchRoom(state, (r) => ({ ...r, phase: "podium", phaseAt: a.payload.now }));
    },
    autoToggled(state, a: Now) {
      patchRoom(state, (r) => ({ ...r, auto: !r.auto, phaseAt: a.payload.now }));
    },
    roomTicked(state, a: Now) {
      patchRoom(state, (r) => tickRoom(r, a.payload.now) ?? r);
    },
    /** Closing a room that really played saves its report for the Library / set report. */
    roomClosed(state) {
      const r = state.room ? current(state.room) : null;
      const report = r ? reportOf(r) : null;
      if (r && report?.hasData) state.reports[r.setId] = report;
      state.room = null;
    },
    playerJoined(state, a: PayloadAction<{ id: string; name: string }>) {
      patchRoom(state, (r) => (r.players.some((p) => p.id === a.payload.id) ? r : { ...r, players: [...r.players, newPlayer(a.payload.id, a.payload.name)] }));
    },
    playerLeft(state, a: PayloadAction<string>) {
      patchRoom(state, (r) => ({ ...r, players: r.players.filter((p) => p.id !== a.payload) }));
    },
    answered(state, a: PayloadAction<{ choice: number; playerId: string; now: number }>) {
      const { choice, playerId, now } = a.payload;
      patchRoom(state, (r) => {
        if (r.phase !== "question" || r.answers[playerId] || !r.players.some((p) => p.id === playerId)) return r;
        return { ...r, answers: { ...r.answers, [playerId]: { choice, ms: now - r.qStartedAt } } };
      });
    },
  },
});

export const wordRushActions = wordRushSlice.actions;
export const wordRushReducer = wordRushSlice.reducer;
