import HomePage from "@/pages/HomePage.tsx";
import LoginPage from "@/pages/LoginPage.tsx";
import SignupPage from "@/pages/SignupPage.tsx";
import ForgotPasswordPage from "@/pages/ForgotPasswordPage.tsx";
import VerifyEmailPage from "@/pages/VerifyEmailPage.tsx";
import { lazyPage } from "@/app/lazyPage";
import RequireAuth from "@/shared/components/auth/RequireAuth.tsx";
import { createBrowserRouter, Navigate, useParams } from "react-router-dom";
import { scheduleRoutes } from "@/app/routes/schedule.tsx";
import { classRoutes } from "@/app/routes/classes.tsx";
import { flashcardRoutes } from "@/app/routes/flashcards.tsx";
import { wordRushRoutes } from "@/app/routes/wordRush.tsx";
import { miscRoutes } from "@/app/routes/misc.tsx";
import RoleShellRoute from "@/shared/components/layout/RoleShellRoute.tsx";
import PublicLayout from "@/shared/components/layout/PublicLayout.tsx";

const CoursesPage = lazyPage(() => import("@/pages/CoursesPage.tsx"));
const CourseDetailPage = lazyPage(() => import("@/pages/CourseDetailPage.tsx"));
const AccountPage = lazyPage(() => import("@/pages/AccountPage.tsx"));
const AdminCategoriesPage = lazyPage(() => import("@/pages/admin/AdminCategoriesPage.tsx"));
const AdminClassesPage = lazyPage(() => import("@/pages/admin/AdminClassesPage.tsx"));
const AdminClassDetailPage = lazyPage(() => import("@/pages/admin/AdminClassDetailPage.tsx"));
const ManageUsersPage = lazyPage(() => import("@/pages/admin/ManageUsersPage.tsx"));
const UserDetailPage = lazyPage(() => import("@/pages/admin/UserDetailPage.tsx"));

const ADMIN_ONLY = ["ADMIN"];

const CourseRedirect = () => <Navigate to={`/admin/classes/${useParams().id ?? ""}`} replace />;

const Placeholder = ({ title }: { title: string }) => (
  <PublicLayout>
    <main className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="rounded-3xl border border-slate-200 bg-white px-6 py-10 shadow-sm">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-950">{title}</h1>
      </div>
    </main>
  </PublicLayout>
);

export const router = createBrowserRouter([
  { path: "/", element: <HomePage /> },
  { path: "/auth/login", element: <LoginPage /> },
  { path: "/auth/signup", element: <SignupPage /> },
  { path: "/auth/forgot-password", element: <ForgotPasswordPage /> },
  { path: "/auth/verify-email", element: <VerifyEmailPage /> },
  { path: "/account", element: <RequireAuth><AccountPage /></RequireAuth> },
  { path: "/courses", element: <CoursesPage /> },
  { path: "/courses/:id", element: <CourseDetailPage /> },
  { path: "/teaching-classes", element: <Navigate to="/courses" replace /> },
  {
    // Persistent header + sidebar for /admin, /teacher and /student pages.
    element: <RoleShellRoute />,
    children: [
      { path: "/admin", element: <RequireAuth roles={ADMIN_ONLY}><Navigate to="/admin/schedule" replace /></RequireAuth> },
      { path: "/admin/users", element: <RequireAuth roles={ADMIN_ONLY}><ManageUsersPage /></RequireAuth> },
      { path: "/admin/users/:id", element: <RequireAuth roles={ADMIN_ONLY}><UserDetailPage /></RequireAuth> },
      { path: "/admin/classes", element: <RequireAuth roles={ADMIN_ONLY}><AdminClassesPage /></RequireAuth> },
      { path: "/admin/classes/:id", element: <RequireAuth roles={ADMIN_ONLY}><AdminClassDetailPage /></RequireAuth> },
      { path: "/admin/categories", element: <RequireAuth roles={ADMIN_ONLY}><AdminCategoriesPage /></RequireAuth> },
      { path: "/admin/courses", element: <Navigate to="/admin/classes" replace /> },
      { path: "/admin/courses/:id", element: <CourseRedirect /> },
      ...scheduleRoutes,
      ...classRoutes,
      ...flashcardRoutes,
      ...wordRushRoutes,
      ...miscRoutes,
    ],
  },
  { path: "/contact", element: <Placeholder title="Trang liên hệ (đang cập nhật)" /> },
  { path: "*", element: <Placeholder title="404 - Không tìm thấy trang" /> },
]);