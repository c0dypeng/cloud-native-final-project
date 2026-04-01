// In-memory admin session store
// Each entry: sessionId → { createdAt, adminId, username }
export interface AdminSession {
  createdAt: number;
  adminId: string;
  username: string;
}

export const adminSessions = new Map<string, AdminSession>();

export function createAdminSession(adminId: string, username: string): string {
  const sessionId = crypto.randomUUID();
  adminSessions.set(sessionId, { createdAt: Date.now(), adminId, username });
  return sessionId;
}
