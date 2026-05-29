import "dotenv/config";
import { app } from "./app.js";
import { logger } from "./lib/logger.js";
import { startReminderJob } from "./jobs/reminder.job.js";
import { startReportEventWorker } from "./jobs/report-worker.js";
import { stopReportWorker } from "./lib/queue.js";

const PORT = process.env.PORT || 4000;
const NODE_ENV = process.env.NODE_ENV || "development";

const server = app.listen(PORT, () => {
  logger.info({ port: PORT, env: NODE_ENV }, "Server started");
  if (process.env.REMINDER_JOB_DISABLED !== "1") {
    startReminderJob();
  }
  if (process.env.REPORT_WORKER_DISABLED !== "1") {
    startReportEventWorker();
  }
});

function shutdown(signal: string) {
  logger.info({ signal }, "shutting down");
  stopReportWorker();
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10_000).unref();
}
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

// Defense-in-depth: a single bad request must never take down the pod (which
// would drop every SSE connection and wipe in-memory admin sessions). Express 4
// does not forward async-handler rejections to the error middleware, so log
// loudly and keep serving instead of letting Node terminate the process.
process.on("unhandledRejection", (reason) => {
  logger.error({ err: reason }, "unhandledRejection — keeping process alive");
});
process.on("uncaughtException", (err) => {
  logger.error({ err }, "uncaughtException — keeping process alive");
});
