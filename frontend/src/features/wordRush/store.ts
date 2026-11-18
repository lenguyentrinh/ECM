import { useMemo } from "react";
import { store, useAppSelector } from "@/app/store.ts";
import { addIsoDays, nowDate } from "@/shared/utils/now.ts";
import { emptyReport, isValidQuestion, rankOf, scoreFor } from "./logic.ts";
import { wordRushActions as wr, type WordRushState } from "./slice.ts";
import type { WRQuestion, WRReport, WRResult, WRSet, WRSetSummary } from "./types.ts";

/**
 * Public API of the Word Rush state (a Redux slice in `slice.ts`; no backend yet, lost on reload). The live room lives
 * in this browser tab only; a WebSocket/SSE feed would replace the local timer and the room actions later.
 * Reports are built from live sessions that were really played, never from generated numbers.
 * This file owns everything impure (ids, PIN, `Date.now()`, the timer); reducers only apply the results.
 */
const { dispatch } = store;
const get = () => store.getState().wordRush;

/** Whole slice: re-renders on every room change. Prefer the narrow hooks below. */
export const useWRState = (): WordRushState => useAppSelector((s) => s.wordRush);
export const useWRSets = () => useAppSelector((s) => s.wordRush.sets);
export const useWRRoom = () => useAppSelector((s) => s.wordRush.room);
export const useWRReports = () => useAppSelector((s) => s.wordRush.reports);

/** Identity of whoever joins a live room (the logged-in student). */
export type RoomPlayer = { id: string; name: string };

export { isValidQuestion, rankOf, scoreFor };

const DOW = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
export function fmtDeadline(iso: string) {
  const d = new Date(`${iso}T00:00:00`);
  return `${DOW[d.getDay()]} ${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** Report of the last live session of this set, or an empty one when it was never played. */
export function buildReport(s: WRSet): WRReport {
  const saved = get().reports[s.id];
  return saved ? { ...saved, perQuestion: saved.perQuestion.filter((p) => p.index < s.questions.length) } : emptyReport(s);
}

function summarize(s: WRSet, reports: Record<string, WRReport>): WRSetSummary {
  // Student participation is not tracked per student yet, so done/total stay 0 (UI shows "—").
  return { ...s, published: s.selfPaced, studentsDone: 0, studentsTotal: 0, accuracy: reports[s.id]?.avgPct ?? 0 };
}

/** Read API for the admin Library page. */
export function useWordRushSets(): WRSetSummary[] {
  const sets = useWRSets();
  const reports = useWRReports();
  return useMemo(() => sets.map((s) => summarize(s, reports)), [sets, reports]);
}

export function useWRSet(id: string | undefined) {
  return useAppSelector((s) => s.wordRush.sets.find((x) => x.id === id));
}

const blankQuestion = (id: string): WRQuestion => ({ id, sentence: "Viết câu có chỗ trống ___ ở đây.", options: ["", "", "", ""], answer: 0, topic: "Chủ đề mới" });

export const updateSet = (id: string, patch: Partial<WRSet>) => dispatch(wr.setUpdated({ id, patch }));
export const updateQuestion = (setId: string, qid: string, patch: Partial<WRQuestion>) => dispatch(wr.questionUpdated({ setId, qid, patch }));
export function addQuestion(setId: string): string {
  const id = `q${Date.now()}`;
  dispatch(wr.questionAdded({ setId, question: blankQuestion(id) }));
  return id;
}
export const deleteQuestion = (setId: string, qid: string) => dispatch(wr.questionDeleted({ setId, qid }));
export function createSet(init: { title?: string; categoryId?: string; classId?: string; author: { id: string; name: string } }): string {
  const id = `s${Date.now()}`;
  dispatch(
    wr.setCreated({
      id,
      title: init.title?.trim() || "Bộ câu hỏi mới",
      categoryId: init.categoryId,
      classId: init.classId ?? "",
      authorId: init.author.id,
      authorName: init.author.name,
      selfPaced: false,
      mode: "game",
      testMin: 10,
      deadline: addIsoDays(nowDate(), 14),
      secPerQ: 20,
      questions: [blankQuestion(`q${Date.now()}a`)],
    }),
  );
  return id;
}

/* ---------- student results ---------- */
export const saveResult = (r: WRResult) => dispatch(wr.resultSaved(r));

/* ---------- live room ---------- */
let timer: number | null = null;
function stopTimer() {
  if (timer !== null) window.clearInterval(timer);
  timer = null;
}
function tick() {
  // The room can vanish without close() (e.g. the session ended and the store was reset): stop ticking then.
  if (!get().room) stopTimer();
  else dispatch(wr.roomTicked({ now: Date.now() }));
}
function ensureTimer() {
  if (timer === null) timer = window.setInterval(tick, 300);
}

/** Close the current room (if any): stop the timer and save its report when it really played. */
function closeRoom() {
  stopTimer();
  dispatch(wr.roomClosed());
}

export const roomActions = {
  open(setId: string) {
    const s = get().sets.find((x) => x.id === setId);
    if (!s) return;
    const questions = s.questions.filter(isValidQuestion).map((x) => ({ ...x, options: [...x.options] })); // snapshot
    const pin = String(Math.floor(100000 + Math.random() * 900000));
    // Never drop a room that is still open: closing it first saves the report of a session that was played.
    if (get().room) closeRoom();
    dispatch(
      wr.roomOpened({
        pin,
        setId,
        title: s.title,
        teacherName: s.authorName,
        questions,
        secPerQ: s.secPerQ || 20,
        phase: "lobby",
        qIndex: 0,
        qStartedAt: 0,
        phaseAt: Date.now(),
        auto: false, // design v5: the teacher moves every step manually
        players: [],
        answers: {},
        stats: [],
      }),
    );
    ensureTimer();
  },
  start: () => dispatch(wr.roomStarted({ now: Date.now() })),
  endQuestion: () => dispatch(wr.questionEnded({ now: Date.now() })),
  toBoard: () => dispatch(wr.boardShown({ now: Date.now() })),
  next: () => dispatch(wr.nextQuestion({ now: Date.now() })),
  /** Last question revealed -> final standings (design: the end screen is the board titled "Kết quả chung cuộc"). */
  toFinal: () => dispatch(wr.finalShown({ now: Date.now() })),
  toggleAuto: () => dispatch(wr.autoToggled({ now: Date.now() })),
  /** Closing a room that really played saves its report for the Library / set report. */
  close: closeRoom,
  /** Student side */
  join(pin: string, who: RoomPlayer): boolean {
    const r = get().room;
    if (!r || r.pin !== pin.replace(/\s/g, "")) return false;
    dispatch(wr.playerJoined({ id: who.id, name: who.name.trim() || "Học viên" }));
    return true;
  },
  leave: (playerId: string) => dispatch(wr.playerLeft(playerId)),
  answer: (choice: number, playerId: string) => dispatch(wr.answered({ choice, playerId, now: Date.now() })),
};
