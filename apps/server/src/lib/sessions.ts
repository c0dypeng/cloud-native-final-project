import { redis } from "./redis.js";
import { logger } from "./logger.js";

export interface AdminSession {
  createdAt: number;
  adminId: string;
  username: string;
}

export const ADMIN_SESSION_TTL_SEC = 24 * 60 * 60;
export const ADMIN_SESSION_TTL_MS = ADMIN_SESSION_TTL_SEC * 1000;

const KEY_PREFIX = "admin-session:";
function key(sessionId: string): string {
  return `${KEY_PREFIX}${sessionId}`;
}

/**
 * Process-local fallback so an admin session still works while Redis is
 * temporarily unavailable (slow boot, restart, etc.). Cleared every 5 min.
 */
const localFallback = new Map<string, AdminSession>();
setInterval(() => {
  const now = Date.now();
  for (const [id, s] of localFallback) {
    if (now - s.createdAt > ADMIN_SESSION_TTL_MS) localFallback.delete(id);
  }
}, 5 * 60 * 1000).unref?.();

export async function createAdminSession(
  adminId: string,
  username: string,
): Promise<string> {
  const sessionId = crypto.randomUUID();
  const session: AdminSession = { createdAt: Date.now(), adminId, username };
  localFallback.set(sessionId, session);
  try {
    await redis.set(
      key(sessionId),
      JSON.stringify(session),
      "EX",
      ADMIN_SESSION_TTL_SEC,
    );
  } catch (err) {
    logger.warn({ err }, "redis createAdminSession failed — using local fallback");
  }
  return sessionId;
}

/**
 * Look up an admin session by id, returning null if missing or expired.
 * Tries Redis first, falls back to the local map so a Redis blip doesn't
 * log everyone out.
 */
export async function getValidAdminSession(
  sessionId: string,
): Promise<AdminSession | null> {
  try {
    const raw = await redis.get(key(sessionId));
    if (raw) {
      const parsed = JSON.parse(raw) as AdminSession;
      if (Date.now() - parsed.createdAt <= ADMIN_SESSION_TTL_MS) return parsed;
      await redis.del(key(sessionId)).catch(() => undefined);
      return null;
    }
  } catch (err) {
    logger.warn({ err }, "redis getValidAdminSession failed — using local fallback");
  }
  // Fallback to local map
  const local = localFallback.get(sessionId);
  if (!local) return null;
  if (Date.now() - local.createdAt > ADMIN_SESSION_TTL_MS) {
    localFallback.delete(sessionId);
    return null;
  }
  return local;
}

export async function deleteAdminSession(sessionId: string): Promise<void> {
  localFallback.delete(sessionId);
  try {
    await redis.del(key(sessionId));
  } catch (err) {
    logger.warn({ err }, "redis deleteAdminSession failed");
  }
}
