import { Resend } from "resend";
import { logger } from "./logger.js";
import { reminderEmailsTotal } from "./metrics.js";

const apiKey = process.env.RESEND_API_KEY;
const fromEmail =
  process.env.RESEND_FROM_EMAIL ?? "護你安 <no-reply@huyouan.local>";

const client = apiKey ? new Resend(apiKey) : null;

/**
 * HTML-escape user-controlled strings before interpolating into email bodies.
 * Prevents HTML/JS injection via fields like `message` (set by employees) or
 * `eventTitle` (set by admins). Returns "" for null/undefined.
 */
function esc(value: string | null | undefined): string {
  if (value == null) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Escape a phone number for use in an href="tel:..." attribute. Allows only
 * digits, +, -, spaces, and parentheses; everything else is stripped.
 */
function escTel(value: string | null | undefined): string {
  if (value == null) return "";
  return String(value).replace(/[^\d+\-\s()]/g, "");
}

/**
 * Escape a URL for use in href attributes. Restricts to http(s) schemes.
 */
function escUrl(value: string): string {
  const trimmed = value.trim();
  if (!/^https?:\/\//i.test(trimmed)) return "";
  return esc(trimmed);
}

if (!client) {
  logger.warn(
    "RESEND_API_KEY not set — reminder emails will be logged but not sent",
  );
}

interface SendArgs {
  to: string;
  subject: string;
  html: string;
}

/**
 * Send an email via Resend. If no API key is configured (dev), logs the
 * message body and returns true so the caller can proceed.
 */
export async function sendEmail(args: SendArgs): Promise<boolean> {
  if (!client) {
    logger.info({ to: args.to, subject: args.subject }, "[email:dry-run]");
    reminderEmailsTotal.inc({ result: "dry_run" });
    return true;
  }
  try {
    const { error } = await client.emails.send({
      from: fromEmail,
      to: args.to,
      subject: args.subject,
      html: args.html,
    });
    if (error) {
      logger.error({ err: error, to: args.to }, "resend send failed");
      reminderEmailsTotal.inc({ result: "error" });
      return false;
    }
    reminderEmailsTotal.inc({ result: "sent" });
    return true;
  } catch (err) {
    logger.error({ err, to: args.to }, "resend send threw");
    reminderEmailsTotal.inc({ result: "error" });
    return false;
  }
}

export function unreportedReminderEmail(args: {
  name: string;
  eventTitle: string;
  reportUrl: string;
}): { subject: string; html: string } {
  const name = esc(args.name);
  const title = esc(args.eventTitle);
  const url = escUrl(args.reportUrl);
  return {
    // Subject is plain text — Resend doesn't render HTML — but strip newlines
    // to avoid header injection.
    subject: `【護你安】請回報您的安全狀況 — ${args.eventTitle}`.replace(/[\r\n]/g, " "),
    html: `<div style="font-family:-apple-system,system-ui,'Segoe UI',sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#1c1917;">
  <h2 style="margin:0 0 16px;font-size:20px;">${name} 您好，</h2>
  <p style="line-height:1.6;">護你安系統偵測到您尚未回報目前進行中的事件：</p>
  <p style="font-size:18px;font-weight:600;margin:16px 0;background:#f5f5f4;padding:12px 16px;border-radius:8px;">${title}</p>
  <p style="line-height:1.6;">請盡速透過以下連結回報您的安全狀況：</p>
  <p style="margin:24px 0;">
    <a href="${url}" style="display:inline-block;background:#1c1917;color:#fafaf9;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;">前往回報</a>
  </p>
  <p style="color:#78716c;font-size:13px;line-height:1.6;">本郵件為系統自動發送。若您已回報，請忽略此訊息。</p>
</div>`,
  };
}

export function managerReminderEmail(args: {
  name: string;
  eventTitle: string;
  unreportedCount: number;
  dashboardUrl: string;
}): { subject: string; html: string } {
  const name = esc(args.name);
  const title = esc(args.eventTitle);
  const url = escUrl(args.dashboardUrl);
  const count = Number.isFinite(args.unreportedCount)
    ? Math.max(0, Math.floor(args.unreportedCount))
    : 0;
  return {
    subject: `【護你安】您的部屬尚有 ${count} 人未回報 — ${args.eventTitle}`.replace(
      /[\r\n]/g,
      " ",
    ),
    html: `<div style="font-family:-apple-system,system-ui,'Segoe UI',sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#1c1917;">
  <h2 style="margin:0 0 16px;font-size:20px;">${name} 您好，</h2>
  <p style="line-height:1.6;">您的部屬中尚有 <strong>${count}</strong> 人未針對下列事件回報：</p>
  <p style="font-size:18px;font-weight:600;margin:16px 0;background:#f5f5f4;padding:12px 16px;border-radius:8px;">${title}</p>
  <p style="line-height:1.6;">請至儀表板查看未回報名單並關懷部屬：</p>
  <p style="margin:24px 0;">
    <a href="${url}" style="display:inline-block;background:#1c1917;color:#fafaf9;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;">前往儀表板</a>
  </p>
</div>`,
  };
}

export function needHelpAlertEmail(args: {
  managerName: string;
  employeeName: string;
  eventTitle: string;
  message: string | null;
  contactPhone: string | null;
  dashboardUrl: string;
}): { subject: string; html: string } {
  const managerName = esc(args.managerName);
  const employeeName = esc(args.employeeName);
  const eventTitle = esc(args.eventTitle);
  const message = esc(args.message);
  const phone = escTel(args.contactPhone);
  const url = escUrl(args.dashboardUrl);
  return {
    subject: `【🚨 緊急】部屬 ${args.employeeName} 需要協助 — ${args.eventTitle}`.replace(
      /[\r\n]/g,
      " ",
    ),
    html: `<div style="font-family:-apple-system,system-ui,'Segoe UI',sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#1c1917;">
  <h2 style="margin:0 0 16px;font-size:20px;color:#dc2626;">⚠️ ${managerName} 您好，</h2>
  <p style="line-height:1.6;">您的部屬 <strong>${employeeName}</strong> 在以下事件中標記了「需要協助」：</p>
  <p style="font-size:18px;font-weight:600;margin:16px 0;background:#fef2f2;padding:12px 16px;border-radius:8px;border-left:4px solid #dc2626;">${eventTitle}</p>
  ${message ? `<p style="line-height:1.6;background:#f5f5f4;padding:12px 16px;border-radius:8px;"><strong>留言：</strong>${message}</p>` : ""}
  ${phone ? `<p style="line-height:1.6;"><strong>聯絡電話：</strong><a href="tel:${phone}">${phone}</a></p>` : ""}
  <p style="margin:24px 0;">
    <a href="${url}" style="display:inline-block;background:#dc2626;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;">立即查看</a>
  </p>
</div>`,
  };
}
