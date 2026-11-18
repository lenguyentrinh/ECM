import { useMemo } from "react";
import { store, useAppSelector } from "@/app/store.ts";
import { useAuth } from "@/features/auth/useAuth.ts";
import { useStudentScope } from "./useStudentScope.ts";
import { emptyProgress, flashcardsActions as fc } from "./slice.ts";
import type { Actor, Card, Deck, DeckView, StudentDeckProgress } from "./types.ts";

/**
 * Public API of the flashcards state (a Redux slice in `slice.ts`; no backend for decks yet, lost on reload).
 * The functions below create ids, then dispatch; authors/owners are passed in from the logged-in user.
 */
const { dispatch } = store;

let seq = 100;
const newId = (p: string) => `${p}-${++seq}`;

export const blankCard = (): Card => ({
  id: newId("card"),
  word: "",
  ipa: "",
  pos: "",
  meaning: "",
  synonym: "",
  example: "",
  exampleVi: "",
});

/* ------- teacher actions ------- */
export function createDeck(classId: string, init: { title?: string; categoryId?: string; author: Actor }): string {
  const id = newId("deck");
  dispatch(
    fc.deckAdded({
      deck: {
        id,
        title: init.title?.trim() || "Bộ thẻ mới",
        categoryId: init.categoryId,
        classId,
        published: false,
        authorId: init.author.id,
        authorName: init.author.name,
        cards: [],
      },
    }),
  );
  return id;
}

/** Admin: publish a center-curated deck (source SYSTEM). Returns the new id. */
export function createCenterDeck(input: {
  title: string;
  /** Display label of the audience ("Toàn trung tâm" or the category name). */
  scope: string;
  categoryId?: string;
  scopeCategoryId?: string;
  /** The logged-in admin who publishes the deck. */
  author: Actor;
  cards: Pick<Card, "word" | "meaning" | "example">[];
}): string {
  const id = newId("sys");
  dispatch(
    fc.deckAdded({
      deck: {
        id,
        title: input.title.trim(),
        classId: "",
        source: "SYSTEM",
        scope: input.scope,
        categoryId: input.categoryId || undefined,
        scopeCategoryId: input.scopeCategoryId || undefined,
        published: true,
        authorId: input.author.id,
        authorName: input.author.name,
        cards: input.cards.map((c) => ({ ...blankCard(), word: c.word.trim(), meaning: c.meaning.trim(), example: c.example.trim() })),
      },
    }),
  );
  return id;
}

/** Only center decks can be deleted by an admin; teacher/student decks belong to their owners. */
export const deleteCenterDeck = (id: string) => dispatch(fc.centerDeckDeleted(id));

export const updateDeck = (id: string, patch: Partial<Pick<Deck, "title" | "classId" | "published" | "categoryId">>) => dispatch(fc.deckUpdated({ id, patch }));

export const addCards = (id: string, cards: Card[]) => dispatch(fc.cardsAdded({ id, cards }));
export const updateCard = (id: string, cardId: string, patch: Partial<Card>) => dispatch(fc.cardUpdated({ id, cardId, patch }));
export const removeCard = (id: string, cardId: string) => dispatch(fc.cardRemoved({ id, cardId }));

/* ------- student actions ------- */
export type StudyOutcome = { hardIds: string[]; studiedIds: string[] };

/** Finish a study run: cards seen and not flagged hard become known; hard flags are replaced by the run's flags for those cards. */
export const finishStudy = (deckId: string, { hardIds, studiedIds }: StudyOutcome) => dispatch(fc.studyFinished({ deckId, hardIds, studiedIds }));

/** Toggle a hard flag outside a study run (also used live while studying). */
export const setHardCards = (deckId: string, hard: string[]) => dispatch(fc.hardSet({ deckId, hard }));

export const recordTest = (deckId: string, test: { correct: number; total: number }) => dispatch(fc.testRecorded({ deckId, test }));

/* ------- student-owned decks (source STUDENT, visible only to ownerId) ------- */
type OwnCard = Pick<Card, "word" | "meaning" | "example">;
const ownCards = (cards: OwnCard[]): Card[] =>
  cards.map((c) => ({ ...blankCard(), word: c.word.trim(), meaning: c.meaning.trim(), example: c.example.trim(), pos: "từ vựng" }));

export function createStudentDeck(input: { title: string; cards: OwnCard[]; owner: Actor }): string {
  const id = newId("my");
  dispatch(
    fc.deckAdded({
      atEnd: true,
      deck: {
        id,
        title: input.title.trim(),
        classId: "",
        source: "STUDENT",
        ownerId: input.owner.id,
        published: true,
        authorId: input.owner.id,
        authorName: "Bạn tự tạo",
        cards: ownCards(input.cards),
      },
    }),
  );
  return id;
}

/** Only the owner can change a STUDENT deck. Editing the cards restarts the deck's progress. */
export const updateStudentDeck = (id: string, input: { title: string; cards: OwnCard[] }, ownerId: string) =>
  dispatch(fc.studentDeckUpdated({ id, title: input.title.trim(), cards: ownCards(input.cards), ownerId }));

export const deleteStudentDeck = (id: string, ownerId: string) => dispatch(fc.studentDeckDeleted({ id, ownerId }));

/** Cards still to review today: 0 once studied today; otherwise cards not yet known (or the whole deck when all are known). */
export function dueCount(deck: Deck, p: StudentDeckProgress): number {
  if (p.studiedToday || deck.cards.length === 0) return 0;
  const known = new Set(p.known ?? []);
  const unknown = deck.cards.filter((c) => !known.has(c.id)).length;
  return unknown > 0 ? unknown : deck.cards.length;
}

/* ------- derived data ------- */
function toView(deck: Deck): DeckView {
  // Per-student progress is not collected anywhere yet, so class stats are 0 (shown as "—").
  return { ...deck, studentsDone: 0, studentsTotal: 0, retention: 0 };
}

/** All decks (every teacher) with derived class stats. Used by the admin Library page. */
export function useDecks(): DeckView[] {
  const decks = useAppSelector((s) => s.flashcards.decks);
  // Student-owned decks are private: never visible to teachers/admin.
  return useMemo(() => decks.filter((d) => d.source !== "STUDENT").map(toView), [decks]);
}

export function useDeck(id: string | undefined): Deck | undefined {
  return useAppSelector((s) => s.flashcards.decks.find((d) => d.id === id));
}

/**
 * Decks the logged-in student can see: own decks; published teacher decks of the classes they are enrolled in;
 * published center decks for the whole center or for a category they study.
 */
export function useStudentDecks(): { deck: Deck; progress: StudentDeckProgress }[] {
  const decks = useAppSelector((s) => s.flashcards.decks);
  const progress = useAppSelector((s) => s.flashcards.progress);
  const { user } = useAuth();
  const { courseIds, categoryIds } = useStudentScope();
  return useMemo(
    () =>
      decks
        .filter((d) =>
          d.source === "STUDENT"
            ? !!user && d.ownerId === user.id
            : d.published &&
              (d.source === "SYSTEM" ? !d.scopeCategoryId || categoryIds.has(d.scopeCategoryId) : courseIds.has(d.classId)),
        )
        .map((deck) => ({ deck, progress: progress[deck.id] ?? emptyProgress(deck.cards.length) })),
    [decks, progress, user, courseIds, categoryIds],
  );
}

/** Every card meaning in the system, for building test distractors when a deck is too small. */
export function useAllDecks(): Deck[] {
  return useAppSelector((s) => s.flashcards.decks);
}
