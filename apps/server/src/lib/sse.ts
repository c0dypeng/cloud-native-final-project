import type { Response } from "express";
import { Redis } from "ioredis";
import type { SseEvent } from "@workspace/api-contracts";
import { logger } from "./logger.js";
import { sseActiveConnections } from "./metrics.js";

/**
 * In-memory SSE connection registry on this pod. To fan events out across
 * multiple server replicas, we publish every outbound event to Redis and let
 * each pod's subscriber dispatch to its locally-connected clients.
 */
interface Connection {
  res: Response;
  userId: string | null;
  adminId: string | null;
  role: "employee" | "manager" | "admin";
  /** Idempotency flag so heartbeat-fail + res.close don't double-decrement. */
  dropped: boolean;
}

const connections = new Set<Connection>();

type Envelope =
  | { scope: "all"; event: SseEvent }
  | { scope: "oversight"; event: SseEvent }
  | { scope: "user"; userId: string; event: SseEvent }
  | { scope: "managers"; managerIds: string[]; event: SseEvent };

const CHANNEL = "huyouan:sse";
const REDIS_URL = process.env.REDIS_URL ?? "redis://localhost:6379";

// Dedicated subscriber connection (Redis subs can't run other commands).
const subscriber = new Redis(REDIS_URL, {
  lazyConnect: false,
  maxRetriesPerRequest: null,
  enableReadyCheck: true,
});
const publisher = new Redis(REDIS_URL, {
  lazyConnect: false,
  maxRetriesPerRequest: 3,
});

subscriber.on("error", (err) =>
  logger.warn({ err }, "sse subscriber connection error"),
);
publisher.on("error", (err) =>
  logger.warn({ err }, "sse publisher connection error"),
);

subscriber.subscribe(CHANNEL).catch((err) => {
  logger.error({ err }, "sse subscriber failed to subscribe");
});
subscriber.on("message", (channel, payload) => {
  if (channel !== CHANNEL) return;
  try {
    const env = JSON.parse(payload) as Envelope;
    dispatchLocal(env);
  } catch (err) {
    logger.warn({ err }, "sse subscriber got malformed payload");
  }
});

function dispatchLocal(env: Envelope): void {
  switch (env.scope) {
    case "all":
      for (const c of connections) send(c, env.event);
      return;
    case "oversight":
      for (const c of connections) {
        if (c.role === "admin" || c.role === "manager") send(c, env.event);
      }
      return;
    case "user":
      for (const c of connections) {
        if (c.userId === env.userId) send(c, env.event);
      }
      return;
    case "managers": {
      const ids = new Set(env.managerIds);
      for (const c of connections) {
        if (c.role === "admin") {
          send(c, env.event);
          continue;
        }
        if (c.userId && ids.has(c.userId)) send(c, env.event);
      }
      return;
    }
  }
}

function publish(env: Envelope): void {
  // Best-effort: failures bubble up as warnings but don't break the request.
  publisher.publish(CHANNEL, JSON.stringify(env)).catch((err) => {
    logger.warn({ err, scope: env.scope }, "sse publish failed");
  });
}

function send(conn: Connection, event: SseEvent): void {
  if (conn.dropped) return;
  try {
    conn.res.write(`event: ${event.type}\n`);
    conn.res.write(`data: ${JSON.stringify(event)}\n\n`);
  } catch (err) {
    logger.warn({ err }, "sse write failed; dropping connection");
    drop(conn);
  }
}

function drop(conn: Connection): void {
  if (conn.dropped) return;
  conn.dropped = true;
  if (connections.delete(conn)) {
    sseActiveConnections.dec();
  }
  try {
    conn.res.end();
  } catch {
    // ignore
  }
}

export function register(
  res: Response,
  identity: {
    userId?: string;
    adminId?: string;
    role: "employee" | "manager" | "admin";
  },
): () => void {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders?.();

  const conn: Connection = {
    res,
    userId: identity.userId ?? null,
    adminId: identity.adminId ?? null,
    role: identity.role,
    dropped: false,
  };
  connections.add(conn);
  sseActiveConnections.inc();

  send(conn, {
    type: "connected",
    userId: conn.userId ?? conn.adminId ?? "anonymous",
    role: conn.role,
    timestamp: new Date().toISOString(),
  });

  const heartbeat = setInterval(() => {
    try {
      conn.res.write(":ping\n\n");
    } catch {
      clearInterval(heartbeat);
      drop(conn);
    }
  }, 25_000);

  res.on("close", () => {
    clearInterval(heartbeat);
    drop(conn);
  });

  return () => {
    clearInterval(heartbeat);
    drop(conn);
  };
}

/** Broadcast to every connected admin or manager (any pod). */
export function broadcastToOversight(event: SseEvent): void {
  publish({ scope: "oversight", event });
}

/** Broadcast to every connection (any pod) — event_created / event_closed. */
export function broadcastAll(event: SseEvent): void {
  publish({ scope: "all", event });
}

/** Send to a specific user (any pod) — reminder. */
export function sendToUser(userId: string, event: SseEvent): void {
  publish({ scope: "user", userId, event });
}

/**
 * Send to every manager in the chain + every admin (any pod) — need_help.
 */
export function sendToManagerChain(
  managerIds: string[],
  event: SseEvent,
): void {
  publish({ scope: "managers", managerIds, event });
}

export function connectionCount(): number {
  return connections.size;
}
