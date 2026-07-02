/**
 * P0-X — Pending role helper.
 *
 * When a user picks a role on the Signup page and continues with Google,
 * the role is stashed in localStorage (+ sessionStorage for back-compat).
 * After the OAuth round trip we auto-claim it in Dashboard so the user
 * never sees a second role-selection screen.
 *
 * A 10-minute TTL guards against stale values (e.g. a user who abandoned
 * OAuth days ago and is now logging into a different account).
 */

const KEY = "wroob_pending_role";
const TTL_MS = 10 * 60 * 1000;

export type PendingRole = "student" | "employer";

export function readPendingRole(): PendingRole | null {
  // Prefer localStorage with timestamp; fall back to legacy sessionStorage.
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as { role?: string; ts?: number };
        if (
          (parsed?.role === "student" || parsed?.role === "employer") &&
          typeof parsed.ts === "number" &&
          Date.now() - parsed.ts < TTL_MS
        ) {
          return parsed.role as PendingRole;
        }
      } catch {
        // Legacy plain-string value.
        if (raw === "student" || raw === "employer") return raw;
      }
    }
  } catch {}

  try {
    const raw = sessionStorage.getItem(KEY);
    if (raw === "student" || raw === "employer") return raw;
  } catch {}

  return null;
}

export function clearPendingRole(): void {
  try { localStorage.removeItem(KEY); } catch {}
  try { sessionStorage.removeItem(KEY); } catch {}
}
