const LAST_RELOAD_KEY = "stale-chunk-reload-at";
const MIN_INTERVAL_MS = 10_000;

/** True if a reload already happened recently (storage may be blocked, then we just reload). */
function reloadedRecently(): boolean {
  try {
    const last = Number(sessionStorage.getItem(LAST_RELOAD_KEY)) || 0;
    if (Date.now() - last < MIN_INTERVAL_MS) return true;
    sessionStorage.setItem(LAST_RELOAD_KEY, String(Date.now()));
  } catch {
    // storage blocked: fall through and reload
  }
  return false;
}

/**
 * After a redeploy, old hashed chunk names 404 and Vite fires `vite:preloadError`.
 * Reload once to pick up the new index; the time guard prevents a reload loop
 * when the failure is a real outage rather than a stale deploy.
 */
export function reloadOnStaleChunk() {
  window.addEventListener("vite:preloadError", (event) => {
    if (reloadedRecently()) return; // let the error surface
    event.preventDefault();
    window.location.reload();
  });
}
