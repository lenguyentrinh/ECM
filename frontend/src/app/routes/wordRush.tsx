import { lazyPage } from "@/app/lazyPage";
import type { RouteObject } from "react-router-dom";
import RequireAuth from "@/shared/components/auth/RequireAuth.tsx";
import { STUDENT_ROLES, TEACHER_ROLES } from "@/features/wordRush/constants.ts";

const TeacherWordRushPage = lazyPage(() => import("@/pages/teacher/TeacherWordRushPage.tsx"));
const TeacherWordRushSetPage = lazyPage(() => import("@/pages/teacher/TeacherWordRushSetPage.tsx"));
const TeacherWordRushRoomPage = lazyPage(() => import("@/pages/teacher/TeacherWordRushRoomPage.tsx"));
const StudentWordRushPage = lazyPage(() => import("@/pages/student/StudentWordRushPage.tsx"));

export const wordRushRoutes: RouteObject[] = [
  { path: "/teacher/word-rush", element: <RequireAuth roles={TEACHER_ROLES}><TeacherWordRushPage /></RequireAuth> },
  { path: "/teacher/word-rush/sets/:id", element: <RequireAuth roles={TEACHER_ROLES}><TeacherWordRushSetPage /></RequireAuth> },
  { path: "/teacher/word-rush/room", element: <RequireAuth roles={TEACHER_ROLES}><TeacherWordRushRoomPage /></RequireAuth> },
  { path: "/student/word-rush", element: <RequireAuth roles={STUDENT_ROLES}><StudentWordRushPage /></RequireAuth> },
];
