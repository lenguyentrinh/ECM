import { lazyPage } from "@/app/lazyPage";
import type { RouteObject } from "react-router-dom";
import RequireAuth from "@/shared/components/auth/RequireAuth.tsx";

const TeacherFlashcardsPage = lazyPage(() => import("@/pages/teacher/TeacherFlashcardsPage.tsx"));
const TeacherFlashcardDeckPage = lazyPage(() => import("@/pages/teacher/TeacherFlashcardDeckPage.tsx"));
const StudentFlashcardsPage = lazyPage(() => import("@/pages/student/StudentFlashcardsPage.tsx"));
const StudentFlashcardStudyPage = lazyPage(() => import("@/pages/student/StudentFlashcardStudyPage.tsx"));
const StudentFlashcardTestPage = lazyPage(() => import("@/pages/student/StudentFlashcardTestPage.tsx"));
const StudentDeckEditPage = lazyPage(() => import("@/pages/student/StudentDeckEditPage.tsx"));

const TEACHER_ROLES = ["TEACHER"];
const STUDENT_ROLES = ["STUDENT"];

export const flashcardRoutes: RouteObject[] = [
  { path: "/teacher/flashcards", element: <RequireAuth roles={TEACHER_ROLES}><TeacherFlashcardsPage /></RequireAuth> },
  { path: "/teacher/flashcards/:id", element: <RequireAuth roles={TEACHER_ROLES}><TeacherFlashcardDeckPage /></RequireAuth> },
  { path: "/student/flashcards", element: <RequireAuth roles={STUDENT_ROLES}><StudentFlashcardsPage /></RequireAuth> },
  { path: "/student/flashcards/new", element: <RequireAuth roles={STUDENT_ROLES}><StudentDeckEditPage /></RequireAuth> },
  { path: "/student/flashcards/:id/edit", element: <RequireAuth roles={STUDENT_ROLES}><StudentDeckEditPage /></RequireAuth> },
  { path: "/student/flashcards/:id/study", element: <RequireAuth roles={STUDENT_ROLES}><StudentFlashcardStudyPage /></RequireAuth> },
  { path: "/student/flashcards/:id/test", element: <RequireAuth roles={STUDENT_ROLES}><StudentFlashcardTestPage /></RequireAuth> },
];
