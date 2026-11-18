import { lazyPage } from "@/app/lazyPage";
import type { RouteObject } from "react-router-dom";
import RequireAuth from "@/shared/components/auth/RequireAuth";

const TeacherClassesPage = lazyPage(() => import("@/pages/teacher/TeacherClassesPage"));
const TeacherClassDetailPage = lazyPage(() => import("@/pages/teacher/TeacherClassDetailPage"));
const StudentClassesPage = lazyPage(() => import("@/pages/student/StudentClassesPage"));
const StudentClassDetailPage = lazyPage(() => import("@/pages/student/StudentClassDetailPage"));

const TEACHER_ROLES = ["TEACHER"];
const STUDENT_ROLES = ["STUDENT"];

export const classRoutes: RouteObject[] = [
  { path: "/teacher/classes", element: <RequireAuth roles={TEACHER_ROLES}><TeacherClassesPage /></RequireAuth> },
  { path: "/teacher/classes/:id", element: <RequireAuth roles={TEACHER_ROLES}><TeacherClassDetailPage /></RequireAuth> },
  { path: "/student/classes", element: <RequireAuth roles={STUDENT_ROLES}><StudentClassesPage /></RequireAuth> },
  { path: "/student/classes/:id", element: <RequireAuth roles={STUDENT_ROLES}><StudentClassDetailPage /></RequireAuth> },
];
