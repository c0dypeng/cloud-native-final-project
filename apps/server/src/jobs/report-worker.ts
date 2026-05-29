import { and, eq, sql } from "drizzle-orm";
import { db } from "../lib/db.js";
import {
  departmentTranslations,
  eventTranslations,
  users,
  departments,
  events,
} from "@workspace/database";
import { broadcastToOversight, sendToManagerChain } from "../lib/sse.js";
import { getManagerChain, getDirectManager } from "../lib/team.js";
import { sendEmail, needHelpAlertEmail } from "../lib/resend.js";
import { logger } from "../lib/logger.js";
import {
  type ReportEventPayload,
  startReportWorker,
} from "../lib/queue.js";
import type { SupportedLocale } from "../lib/locale.js";

async function handle(payload: ReportEventPayload): Promise<void> {
  if (payload.type === "report_submitted") {
    broadcastToOversight({
      type: "report_submitted",
      eventId: payload.eventId,
      userId: payload.userId,
      status: payload.status,
      timestamp: payload.timestamp,
    });
    return;
  }

  if (payload.type === "need_help_followup") {
    await fanOutNeedHelp(payload);
    return;
  }
}

async function fanOutNeedHelp(
  payload: Extract<ReportEventPayload, { type: "need_help_followup" }>,
): Promise<void> {
  const locale = payload.locale as SupportedLocale;

  const [eventRow, userRow, managerChain, direct] = await Promise.all([
    db
      .select({
        title: sql<string>`coalesce(${eventTranslations.title}, ${events.title})`,
      })
      .from(events)
      .leftJoin(
        eventTranslations,
        and(
          eq(eventTranslations.eventId, events.id),
          eq(eventTranslations.locale, locale),
        ),
      )
      .where(eq(events.id, payload.eventId))
      .limit(1)
      .then((r) => r[0] ?? null),
    db
      .select({
        name: users.name,
        email: users.email,
        phone: users.phone,
        departmentId: users.departmentId,
        departmentName: sql<
          string | null
        >`coalesce(${departmentTranslations.name}, ${departments.name})`,
      })
      .from(users)
      .leftJoin(departments, eq(departments.id, users.departmentId))
      .leftJoin(
        departmentTranslations,
        and(
          eq(departmentTranslations.departmentId, departments.id),
          eq(departmentTranslations.locale, locale),
        ),
      )
      .where(eq(users.id, payload.userId))
      .limit(1)
      .then((r) => r[0] ?? null),
    getManagerChain(payload.userId),
    getDirectManager(payload.userId),
  ]);

  sendToManagerChain(managerChain, {
    type: "need_help",
    eventId: payload.eventId,
    userId: payload.userId,
    userName: userRow?.name ?? "(unknown)",
    departmentName: userRow?.departmentName ?? null,
    message: payload.message,
    timestamp: payload.timestamp,
  });

  if (direct && eventRow) {
    const tpl = needHelpAlertEmail({
      managerName: direct.name,
      employeeName: userRow?.name ?? "(unknown)",
      eventTitle: eventRow.title,
      message: payload.message,
      contactPhone: userRow?.phone ?? null,
      dashboardUrl:
        (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000") +
        "/dashboard",
    });
    await sendEmail({ to: direct.email, ...tpl });
  }
}

export function startReportEventWorker(): void {
  const consumerName =
    process.env.POD_NAME ?? process.env.HOSTNAME ?? `worker-${process.pid}`;
  void startReportWorker({ consumerName, handler: handle }).catch((err) =>
    logger.error({ err }, "report worker exited"),
  );
}
