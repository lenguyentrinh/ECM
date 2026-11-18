import { Outlet, useLocation } from "react-router-dom";
import AppShell from "./AppShell";
import type { NAV } from "./navConfig";

const ROLE_BY_SEGMENT: Record<string, keyof typeof NAV> = { admin: "admin", teacher: "teacher", student: "student" };

/**
 * Pathless layout route for /admin, /teacher and /student pages. The header and sidebar stay mounted while the
 * page inside changes, so clicking a sidebar tab no longer blanks the screen while the page chunk loads.
 * Per-route `RequireAuth roles` still enforces who may see each page.
 */
export default function RoleShellRoute() {
  const segment = useLocation().pathname.split("/")[1] ?? "";
  const role = ROLE_BY_SEGMENT[segment];
  if (!role) return <Outlet />;
  return (
    <AppShell role={role}>
      <Outlet />
    </AppShell>
  );
}
