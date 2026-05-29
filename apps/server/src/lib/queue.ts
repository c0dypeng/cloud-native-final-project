import { redis, redisStreamConsumer } from "./redis.js";
import { logger } from "./logger.js";
import {
  mqPublishedTotal,
  mqProcessedTotal,
  mqProcessingSeconds,
  mqStreamLength,
} from "./metrics.js";

export const STREAM = "report:events";
export const GROUP = "report-workers";
const MAX_LEN = 100_000;
const CLAIM_IDLE_MS = 60_000;

export type ReportEventPayload =
  | {
      type: "report_submitted";
      eventId: string;
      userId: string;
      status: "safe" | "need_help";
      locale: string;
      timestamp: string;
    }
  | {
      type: "need_help_followup";
      eventId: string;
      userId: string;
      message: string | null;
      locale: string;
      timestamp: string;
    };

let ensured = false;
async function ensureGroup(): Promise<void> {
  if (ensured) return;
  try {
    await redis.xgroup("CREATE", STREAM, GROUP, "$", "MKSTREAM");
    logger.info({ stream: STREAM, group: GROUP }, "consumer group created");
    ensured = true;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("BUSYGROUP")) {
      ensured = true;
      return;
    }
    logger.warn({ err }, "xgroup create failed; will retry on next call");
    throw err;
  }
}

export async function publishReportEvent(
  payload: ReportEventPayload,
): Promise<void> {
  try {
    await ensureGroup();
  } catch {
    // ensureGroup logs; XADD below will MKSTREAM on its own anyway.
  }
  await redis.xadd(
    STREAM,
    "MAXLEN",
    "~",
    String(MAX_LEN),
    "*",
    "payload",
    JSON.stringify(payload),
  );
  mqPublishedTotal.inc({ event_type: payload.type });
}

interface WorkerOptions {
  consumerName: string;
  blockMs?: number;
  batchSize?: number;
  handler: (payload: ReportEventPayload) => Promise<void>;
}

let stopRequested = false;

export async function startReportWorker(opts: WorkerOptions): Promise<void> {
  await ensureGroup();
  const { consumerName, blockMs = 5_000, batchSize = 16, handler } = opts;
  logger.info({ consumerName }, "report worker started");

  void claimIdleLoop(consumerName, handler);
  void streamLengthLoop();

  while (!stopRequested) {
    try {
      const res = (await redisStreamConsumer.xreadgroup(
        "GROUP",
        GROUP,
        consumerName,
        "COUNT",
        batchSize,
        "BLOCK",
        blockMs,
        "STREAMS",
        STREAM,
        ">",
      )) as [string, [string, string[]][]][] | null;
      if (!res) continue;
      for (const [, entries] of res) {
        await Promise.all(
          entries.map((entry) => processEntry(entry, handler)),
        );
      }
    } catch (err) {
      if (stopRequested) return;
      logger.error({ err }, "xreadgroup failed; backing off 1s");
      await sleep(1_000);
    }
  }
}

async function processEntry(
  entry: [string, string[]],
  handler: (payload: ReportEventPayload) => Promise<void>,
): Promise<void> {
  const [entryId, fields] = entry;
  const payloadIdx = fields.indexOf("payload");
  if (payloadIdx === -1) {
    await redis.xack(STREAM, GROUP, entryId);
    return;
  }
  const raw = fields[payloadIdx + 1];
  if (!raw) {
    await redis.xack(STREAM, GROUP, entryId);
    return;
  }
  let payload: ReportEventPayload;
  try {
    payload = JSON.parse(raw) as ReportEventPayload;
  } catch (err) {
    logger.warn({ err, entryId }, "malformed queue payload — acking");
    mqProcessedTotal.inc({ event_type: "unknown", result: "malformed" });
    await redis.xack(STREAM, GROUP, entryId);
    return;
  }
  const end = mqProcessingSeconds.startTimer({ event_type: payload.type });
  try {
    await handler(payload);
    mqProcessedTotal.inc({ event_type: payload.type, result: "success" });
    await redis.xack(STREAM, GROUP, entryId);
  } catch (err) {
    mqProcessedTotal.inc({ event_type: payload.type, result: "error" });
    logger.error({ err, entryId, type: payload.type }, "queue handler failed");
  } finally {
    end();
  }
}

async function claimIdleLoop(
  consumerName: string,
  handler: (payload: ReportEventPayload) => Promise<void>,
): Promise<void> {
  while (!stopRequested) {
    await sleep(30_000);
    if (stopRequested) return;
    try {
      // xautoclaim doesn't block, runs on the main client to keep the consumer
      // connection free for its BLOCKing XREADGROUP.
      const res = (await redis.xautoclaim(
        STREAM,
        GROUP,
        consumerName,
        CLAIM_IDLE_MS,
        "0",
        "COUNT",
        50,
      )) as [string, [string, string[]][], string[]] | null;
      if (!res) continue;
      const [, entries] = res;
      for (const entry of entries) {
        await processEntry(entry, handler);
      }
    } catch (err) {
      logger.warn({ err }, "xautoclaim failed");
    }
  }
}

async function streamLengthLoop(): Promise<void> {
  while (!stopRequested) {
    try {
      const len = await redis.xlen(STREAM);
      mqStreamLength.set(len);
    } catch {
      // ignore
    }
    await sleep(10_000);
  }
}

export function stopReportWorker(): void {
  if (stopRequested) return;
  stopRequested = true;
  // Aborts the BLOCKing XREADGROUP so the worker loop exits within ms instead
  // of waiting up to `blockMs`. The other clients are closed by the server's
  // shutdown path.
  try {
    redisStreamConsumer.disconnect();
  } catch {
    // best-effort
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
