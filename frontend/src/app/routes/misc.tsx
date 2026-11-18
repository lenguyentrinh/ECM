import { lazyPage } from "@/app/lazyPage";
import type { RouteObject } from "react-router-dom";
import RequireAuth from "@/shared/components/auth/RequireAuth";

const AdminLibraryPage = lazyPage(() => import("@/pages/admin/AdminLibraryPage"));
const AdminLibraryDetailPage = lazyPage(() => import("@/pages/admin/AdminLibraryDetailPage"));

export const miscRoutes: RouteObject[] = [
  { path: "/admin/library", element: <RequireAuth roles={["ADMIN"]}><AdminLibraryPage /></RequireAuth> },
  { path: "/admin/library/:id", element: <RequireAuth roles={["ADMIN"]}><AdminLibraryDetailPage /></RequireAuth> },
];
