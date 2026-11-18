import { lazyPage } from "@/app/lazyPage";
import type { RouteObject } from "react-router-dom";
import RequireAuth from "@/shared/components/auth/RequireAuth.tsx";

const AdminSchedulePage = lazyPage(() => import("@/pages/admin/AdminSchedulePage.tsx"));
const TeacherSchedulePage = lazyPage(() => import("@/pages/teacher/TeacherSchedulePage.tsx"));
const StudentSchedulePage = lazyPage(() => import("@/pages/student/StudentSchedulePage.tsx"));

const ADMIN = ["ADMIN"];
const TEACHER = ["TEACHER"];
const STUDENT = ["STUDENT"];

export const scheduleRoutes: RouteObject[] = [
  { path: "/teacher/schedule", element: <RequireAuth roles={TEACHER}><TeacherSchedulePage /></RequireAuth> },
  { path: "/student/schedule", element: <RequireAuth roles={STUDENT}><StudentSchedulePage /></RequireAuth> },
  { path: "/admin/schedule", element: <RequireAuth roles={ADMIN}><AdminSchedulePage /></RequireAuth> },
];
