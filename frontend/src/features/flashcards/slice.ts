import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { Card, Deck, StudentDeckProgress } from "./types.ts";

/**
 * Redux slice for flashcard decks (no backend for decks yet): starts empty and is lost on reload.
 * Reducers are pure: ids and anything time/random based are created by the callers in `store.ts`.
 */
export type FlashcardsState = { decks: Deck[]; progress: Record<string, StudentDeckProgress> };

const initialState: FlashcardsState = { decks: [], progress: {} };

export const emptyProgress = (n: number): StudentDeckProgress => ({ fresh: n, learning: 0, review: 0, studiedToday: false, test: null });

const flashcardsSlice = createSlice({
  name: "flashcards",
  initialState,
  reducers: {
    /** Teacher / admin decks go to the top of the list; student-owned decks are appended (`atEnd`). */
    deckAdded(state, a: PayloadAction<{ deck: Deck; atEnd?: boolean }>) {
      if (a.payload.atEnd) state.decks.push(a.payload.deck);
      else state.decks.unshift(a.payload.deck);
    },
    /** Only center decks can be deleted by an admin; teacher/student decks belong to their owners. */
    centerDeckDeleted(state, a: PayloadAction<string>) {
      state.decks = state.decks.filter((d) => !(d.id === a.payload && d.source === "SYSTEM"));
    },
    deckUpdated(state, a: PayloadAction<{ id: string; patch: Partial<Pick<Deck, "title" | "classId" | "published" | "categoryId">> }>) {
      const d = state.decks.find((x) => x.id === a.payload.id);
      if (d) Object.assign(d, a.payload.patch);
    },
    cardsAdded(state, a: PayloadAction<{ id: string; cards: Card[] }>) {
      state.decks.find((d) => d.id === a.payload.id)?.cards.push(...a.payload.cards);
    },
    cardUpdated(state, a: PayloadAction<{ id: string; cardId: string; patch: Partial<Card> }>) {
      const c = state.decks.find((d) => d.id === a.payload.id)?.cards.find((x) => x.id === a.payload.cardId);
      if (c) Object.assign(c, a.payload.patch);
    },
    cardRemoved(state, a: PayloadAction<{ id: string; cardId: string }>) {
      const d = state.decks.find((x) => x.id === a.payload.id);
      if (d) d.cards = d.cards.filter((c) => c.id !== a.payload.cardId);
    },
    /** Finish a study run: cards seen and not flagged hard become known; hard flags are replaced by the run's flags for those cards. */
    studyFinished(state, a: PayloadAction<{ deckId: string; hardIds: string[]; studiedIds: string[] }>) {
      const { deckId, hardIds, studiedIds } = a.payload;
      const deck = state.decks.find((d) => d.id === deckId);
      if (!deck) return;
      const prev = state.progress[deckId] ?? emptyProgress(deck.cards.length);
      const live = new Set(deck.cards.map((c) => c.id));
      const hard = new Set([...(prev.hard ?? []).filter((id) => !studiedIds.includes(id)), ...hardIds]);
      const known = new Set([...(prev.known ?? []), ...studiedIds.filter((id) => !hardIds.includes(id))]);
      hard.forEach((id) => known.delete(id));
      state.progress[deckId] = {
        ...prev,
        known: [...known].filter((id) => live.has(id)),
        hard: [...hard].filter((id) => live.has(id)),
        fresh: 0,
        learning: 0,
        review: 0,
        studiedToday: true,
      };
    },
    /** Toggle a hard flag outside a study run (also used live while studying). */
    hardSet(state, a: PayloadAction<{ deckId: string; hard: string[] }>) {
      const deck = state.decks.find((d) => d.id === a.payload.deckId);
      if (!deck) return;
      const prev = state.progress[a.payload.deckId] ?? emptyProgress(deck.cards.length);
      state.progress[a.payload.deckId] = { ...prev, hard: a.payload.hard };
    },
    testRecorded(state, a: PayloadAction<{ deckId: string; test: { correct: number; total: number } }>) {
      const prev = state.progress[a.payload.deckId] ?? emptyProgress(0);
      state.progress[a.payload.deckId] = { ...prev, test: a.payload.test };
    },
    /** Only the owner can change a STUDENT deck. Editing the cards restarts the deck's progress. */
    studentDeckUpdated(state, a: PayloadAction<{ id: string; title: string; cards: Card[]; ownerId: string }>) {
      const d = state.decks.find((x) => x.id === a.payload.id);
      if (!d || d.source !== "STUDENT" || d.ownerId !== a.payload.ownerId) return;
      d.title = a.payload.title;
      d.cards = a.payload.cards;
      delete state.progress[a.payload.id];
    },
    studentDeckDeleted(state, a: PayloadAction<{ id: string; ownerId: string }>) {
      const d = state.decks.find((x) => x.id === a.payload.id);
      if (!d || d.source !== "STUDENT" || d.ownerId !== a.payload.ownerId) return;
      state.decks = state.decks.filter((x) => x.id !== a.payload.id);
      delete state.progress[a.payload.id];
    },
  },
});

export const flashcardsActions = flashcardsSlice.actions;
export const flashcardsReducer = flashcardsSlice.reducer;
