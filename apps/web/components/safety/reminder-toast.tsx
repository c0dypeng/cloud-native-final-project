"use client";

import { useRef } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import type { SseEvent } from "@workspace/api-contracts";
import { useSse } from "@/hooks/use-sse";

export function ReminderToast() {
  const t = useTranslations("reminderToast");
  const lastShown = useRef<Set<string>>(new Set());

  useSse({
    onEvent: (e: SseEvent) => {
      if (e.type === "reminder") {
        const key = `r:${e.eventId}:${e.timestamp}`;
        if (lastShown.current.has(key)) return;
        lastShown.current.add(key);
        toast.warning(t("self"), {
          description: e.eventTitle,
          duration: 10_000,
        });
      } else if (e.type === "manager_reminder") {
        const key = `m:${e.eventId}:${e.timestamp}`;
        if (lastShown.current.has(key)) return;
        lastShown.current.add(key);
        toast.warning(t("manager", { count: e.unreportedCount }), {
          description: e.eventTitle,
          duration: 10_000,
        });
      } else if (e.type === "event_created") {
        toast.error(t("newEvent", { title: e.title }), {
          description: t("newEventDescription"),
          duration: 30_000,
        });
      } else if (e.type === "event_closed") {
        toast.success(t("eventClosed"), { duration: 5_000 });
      }
    },
  });

  return null;
}
