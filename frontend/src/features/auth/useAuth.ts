import { useAction, useResource, useResourceCache } from "@/shared/api/resource/index.ts";
import { fetchMe, logout } from "./authApi.ts";
import { AUTH_QUERY_KEY } from "./authKeys.ts";
import type { AuthUser } from "./types.ts";

const SESSION_STALE_MS = 5 * 60_000;

/**
 * Session state, hydrated from GET /auth/me. `isLoading` is true only until the first answer, so guards
 * can wait for it and avoid flashing a redirect on page load. Roles here only drive the UI; the
 * backend enforces every permission.
 */
export function useAuth() {
  const query = useResource({
    queryKey: AUTH_QUERY_KEY,
    queryFn: fetchMe,
    staleTime: SESSION_STALE_MS,
  });

  const user: AuthUser | null = query.data ?? null;
  const roles = user?.roles ?? [];

  return {
    user,
    isLoading: query.isLoading,
    isAuthenticated: user !== null,
    isAdmin: roles.includes("ADMIN"),
    isTeacher: roles.some((role) => role.startsWith("TEACHER")),
    hasAnyRole: (wanted: string[]) => wanted.some((role) => roles.includes(role)),
  };
}

export function useLogout() {
  const cache = useResourceCache();

  return useAction({
    mutationFn: logout,
    onSettled: () => {
      // Mark the session as guest; the store then drops the previous user's data (see `app/store.ts`).
      cache.setData(AUTH_QUERY_KEY, null);
    },
  });
}
