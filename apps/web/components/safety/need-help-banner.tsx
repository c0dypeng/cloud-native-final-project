"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { AlertTriangle, X } from "lucide-react";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/alert";
import { Button } from "@workspace/ui/components/button";
import { cn } from "@workspace/ui/lib/utils";
import type { SseEvent } from "@workspace/api-contracts";
import { useSse } from "@/hooks/use-sse";

interface AlertItem {
  id: string;
  eventId: string;
  userId: string;
  userName: string;
  departmentName: string | null;
  message: string | null;
  timestamp: string;
}

export function NeedHelpBanner() {
  const t = useTranslations("needHelp");
  const [alerts, setAlerts] = useState<AlertItem[]>([]);

  useSse({
    onEvent: (e: SseEvent) => {
      if (e.type !== "need_help") return;
      setAlerts((prev) => [
        {
          id: `${e.eventId}:${e.userId}:${e.timestamp}`,
          eventId: e.eventId,
          userId: e.userId,
          userName: e.userName,
          departmentName: e.departmentName,
          message: e.message,
          timestamp: e.timestamp,
        },
        ...prev.slice(0, 4),
      ]);
    },
  });

  if (alerts.length === 0) return null;

  return (
    <div className="space-y-2 mb-4">
      {alerts.map((a) => (
        <Alert
          key={a.id}
          variant="destructive"
          className={cn(
            "border-destructive bg-destructive/5 animate-pulse-once",
            "[&_svg]:size-5",
          )}
        >
          <AlertTriangle aria-hidden />
          <AlertTitle className="text-base">
            {t("alertTitle", { name: a.userName })}
          </AlertTitle>
          <AlertDescription className="space-y-2">
            {a.departmentName && (
              <p className="text-xs">{a.departmentName}</p>
            )}
            {a.message && (
              <p className="rounded-md bg-destructive/10 px-2 py-1 text-sm">
                「{a.message}」
              </p>
            )}
            <div className="flex flex-wrap gap-2 pt-1">
              <Button
                size="sm"
                variant="destructive"
                onClick={() => dismiss(a.id, setAlerts)}
              >
                {t("willHandle")}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => dismiss(a.id, setAlerts)}
              >
                <X className="h-3.5 w-3.5 mr-1" aria-hidden />
                {t("close")}
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      ))}
    </div>
  );
}

function dismiss(
  id: string,
  setAlerts: React.Dispatch<React.SetStateAction<AlertItem[]>>,
) {
  setAlerts((prev) => prev.filter((a) => a.id !== id));
}
