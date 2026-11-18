import type { WRPlayer, WRQuestion, WRReport, WRRoom, WRSet } from "./types.ts";

/* Pure Word Rush helpers shared by the slice and the store facade. Anything time based takes `now` as a parameter. */

export const isValidQuestion = (x: WRQuestion) =>
  x.sentence.includes("___") && x.options.length === 4 && x.options.every((o) => o.trim() !== "") && x.answer >= 0 && x.answer < 4;

export const rankOf = (players: WRPlayer[]) => [...players].sort((a, b) => b.score - a.score);

export function scoreFor(ms: number, durSec: number, streak: number) {
  const base = Math.round(1000 * (1 - ms / 1000 / durSec / 2));
  return Math.max(0, base) + 100 * Math.min(streak, 5);
}

export const emptyReport = (s: WRSet): WRReport => ({
  hasData: false,
  players: 0,
  avgPct: 0,
  hardest: null,
  avgSeconds: 0,
  perQuestion: s.questions.map((_, index) => ({ index, pct: 0, wrongOption: null, wrongCount: 0 })),
  board: [],
});

export function reportOf(r: WRRoom): WRReport {
  const perQuestion = r.questions.map((q, index) => {
    const st = r.stats[index] ?? { answered: 0, correct: 0, wrong: [0, 0, 0, 0] };
    const worst = st.wrong.reduce((best, n, k) => (n > st.wrong[best] ? k : best), 0);
    return {
      index,
      pct: st.answered ? Math.round((st.correct / st.answered) * 100) : 0,
      wrongOption: st.wrong[worst] > 0 ? q.options[worst] : null,
      wrongCount: st.wrong[worst] ?? 0,
    };
  });
  const answered = r.stats.reduce((a, x) => a + x.answered, 0);
  const correct = r.stats.reduce((a, x) => a + x.correct, 0);
  const asked = perQuestion.filter((_, i) => (r.stats[i]?.answered ?? 0) > 0);
  const hardest = asked.length ? asked.reduce((a, b) => (b.pct < a.pct ? b : a)) : null;
  const totalMs = r.players.reduce((a, p) => a + p.answerMs, 0);
  const totalAnswers = r.players.reduce((a, p) => a + p.answered, 0);
  return {
    hasData: answered > 0,
    players: r.players.length,
    avgPct: answered ? Math.round((correct / answered) * 100) : 0,
    hardest: hardest ? { index: hardest.index, pct: hardest.pct } : null,
    avgSeconds: totalAnswers ? Math.round(totalMs / totalAnswers / 1000) : 0,
    perQuestion,
    board: rankOf(r.players).map((p) => ({ name: p.name, score: p.score, correct: p.correctCount, avgSec: p.answered ? Math.round(p.answerMs / p.answered / 1000) : 0 })),
  };
}

export const newPlayer = (id: string, name: string): WRPlayer => ({
  id,
  name,
  score: 0,
  streak: 0,
  prevRank: 0,
  lastGain: 0,
  lastCorrect: null,
  correctCount: 0,
  answerMs: 0,
  answered: 0,
});

export function toReveal(r: WRRoom, now: number): WRRoom {
  const order = rankOf(r.players);
  const dur = r.secPerQ;
  const q = r.questions[r.qIndex];
  const correct = q.answer;
  const st = { answered: 0, correct: 0, wrong: [0, 0, 0, 0] };
  const players = r.players.map((p) => {
    const a = r.answers[p.id];
    const prevRank = order.findIndex((x) => x.id === p.id) + 1;
    if (!a) return { ...p, streak: 0, lastGain: 0, lastCorrect: null, prevRank };
    st.answered++;
    const answerMs = p.answerMs + a.ms;
    const answered = p.answered + 1;
    if (a.choice === correct) {
      st.correct++;
      const streak = p.streak + 1;
      const gain = scoreFor(a.ms, dur, streak);
      return { ...p, streak, score: p.score + gain, lastGain: gain, lastCorrect: true, correctCount: p.correctCount + 1, prevRank, answerMs, answered };
    }
    st.wrong[a.choice]++;
    return { ...p, streak: 0, lastGain: 0, lastCorrect: false, prevRank, answerMs, answered };
  });
  const stats = [...r.stats];
  stats[r.qIndex] = st;
  return { ...r, phase: "reveal", phaseAt: now, players, stats };
}

export function advance(r: WRRoom, now: number): WRRoom {
  if (r.qIndex + 1 >= r.questions.length) return { ...r, phase: "podium", phaseAt: now };
  return { ...r, qIndex: r.qIndex + 1, phase: "question", qStartedAt: now, phaseAt: now, answers: {} };
}

/** One timer tick: the next room state, or null when nothing changes yet. */
export function tickRoom(r: WRRoom, now: number): WRRoom | null {
  if (r.phase === "question") {
    // Time is up (or everybody answered): reveal.
    const everyone = r.players.length > 0 && r.players.every((p) => r.answers[p.id]);
    return everyone || now - r.qStartedAt >= r.secPerQ * 1000 ? toReveal(r, now) : null;
  }
  if (r.auto && now - r.phaseAt > 4500) {
    if (r.phase === "reveal") return { ...r, phase: "board", phaseAt: now };
    if (r.phase === "board") return advance(r, now);
  }
  return null;
}
