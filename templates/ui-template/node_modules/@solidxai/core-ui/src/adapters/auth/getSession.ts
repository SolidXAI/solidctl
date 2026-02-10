import { loadSession, saveSession, clearSession } from "./storage";
import { refreshAccessToken } from "./refreshAccessToken";
import { eventBus, AppEvents } from "../../helpers/eventBus";
import type { Session } from "./types";
import { signOut } from "./signOut";

// NOTE: Single-flight refresh prevents a burst of concurrent requests from
// triggering multiple refresh calls and racing to update the session.
let refreshPromise: Promise<any> | null = null;

export async function getSession(): Promise<Session> {
  const session = loadSession();
  if (!session?.user?.accessToken) return null;

  const expiresAt = session.user.accessTokenExpires;
  const bufferMs = 60_000;
  if (expiresAt && Date.now() >= expiresAt - bufferMs) {
    if (!refreshPromise) {
      refreshPromise = refreshAccessToken({ refreshToken: session.user.refreshToken }).finally(() => {
        refreshPromise = null;
      });
    }

    const refreshed = await refreshPromise;
    // NOTE: On refresh failure, clear storage and stop; do not persist a broken session,
    // which can otherwise cause repeated refresh attempts and redirect loops.
    if ((refreshed as any)?.error || !(refreshed as any)?.accessToken) {
      clearSession();
      await signOut({ callbackUrl: "/auth/login" });
      return null;
    }

    const nextSession: Session = {
      ...session,
      user: {
        ...session.user,
        accessToken: (refreshed as any).accessToken,
        refreshToken: (refreshed as any).refreshToken ?? session.user.refreshToken,
        accessTokenExpires: (refreshed as any).accessTokenExpires,
      },
      error: null,
    };
    saveSession(nextSession);
    eventBus.emit(AppEvents.SessionUpdated, nextSession);
    return nextSession;
  }

  return session;
}
