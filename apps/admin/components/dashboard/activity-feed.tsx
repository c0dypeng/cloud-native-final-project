"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  CheckCircle2,
  AlertTriangle,
  Plus,
  Square,
  Activity,
} from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";
import type { SseEvent } from "@workspace/api-contracts";
import { formatTime } from "@/lib/format-date";
import { useSse } from "@/hooks/use-sse";

interface FeedItem {
  id: string;
  kind: "report" | "event" | "info";
  text: string;
  detail?: string;
  tone: "success" | "destructive" | "default" | "warning";
  at: string;
}

const MAX = 25;

export function ActivityFeed() {
  const t = useTranslations("activityFeed");
  const [items, setItems] = useState<FeedItem[]>([]);

  useSse({
    onEvent: (e: SseEvent) => {
      const now = new Date().toISOString();
      let item: FeedItem | null = null;
      if (e.type === "report_submitted") {
        item = {
          id: `${e.timestamp}-${e.userId}`,
          kind: "report",
          text:
            e.status === "safe"
              ? t("safeReport")
              : t("needHelpReport"),
          tone: e.status === "safe" ? "success" : "destructive",
          at: e.timestamp,
        };
      } else if (e.type === "event_created") {
        item = {
          id: `c-${e.eventId}`,
          kind: "event",
          text: t("eventCreated", { title: e.title }),
          tone: "destructive",
          at: e.timestamp,
        };
      } else if (e.type === "event_closed") {
        item = {
          id: `x-${e.eventId}-${e.timestamp}`,
          kind: "event",
          text: t("eventClosed"),
          tone: "default",
          at: e.timestamp,
        };
      } else if (e.type === "need_help") {
        item = {
          id: `nh-${e.userId}-${e.timestamp}`,
          kind: "report",
          text: t("needHelp", { name: e.userName }),
          detail: e.message ?? undefined,
          tone: "destructive",
          at: e.timestamp,
        };
      } else if (e.type === "connected") {
        item = {
          id: `cn-${e.timestamp}`,
          kind: "info",
          text: t("connected"),
          tone: "default",
          at: now,
        };
      }
      if (item) {
        setItems((prev) => [item!, ...prev].slice(0, MAX));
      }
    },
  });

  if (items.length === 0) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-8 justify-center">
        <Activity className="h-4 w-4 animate-pulse" aria-hidden />
        {t("waiting")}
      </div>
    );
  }

  return (
    <ul className="space-y-2 max-h-80 overflow-auto pr-1">
      {items.map((item) => (
        <li
          key={item.id}
          className="flex items-start gap-3 rounded-md border bg-card p-2.5 text-sm"
        >
          <Icon kind={item.kind} tone={item.tone} />
          <div className="min-w-0 flex-1">
            <p
              className={cn(
                "leading-tight",
                item.tone === "destructive" && "text-destructive font-medium",
              )}
            >
              {item.text}
            </p>
            {item.detail && (
              <p className="text-xs text-muted-foreground mt-0.5 truncate">
                {item.detail}
              </p>
            )}
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {formatTime(item.at)}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}

function Icon({
  kind,
  tone,
}: {
  kind: FeedItem["kind"];
  tone: FeedItem["tone"];
}) {
  const cls = cn(
    "h-4 w-4 shrink-0 mt-0.5",
    tone === "success" && "text-success",
    tone === "destructive" && "text-destructive",
    tone === "default" && "text-muted-foreground",
  );
  if (kind === "event") {
    return tone === "destructive" ? (
      <Plus className={cls} aria-hidden />
    ) : (
      <Square className={cls} aria-hidden />
    );
  }
  if (kind === "report") {
    return tone === "destructive" ? (
      <AlertTriangle className={cls} aria-hidden />
    ) : (
      <CheckCircle2 className={cls} aria-hidden />
    );
  }
  return <Activity className={cls} aria-hidden />;
}
