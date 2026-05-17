"use client";

import { useSse } from "@/hooks/use-sse";
import { Wifi, WifiOff } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@workspace/ui/lib/utils";

export function ConnectionStatus() {
  const t = useTranslations("connection");
  const { status } = useSse({});
  const live = status === "open";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-xs rounded-full px-2 py-1",
        live
          ? "bg-success/10 text-success"
          : "bg-muted text-muted-foreground",
      )}
      title={live ? t("liveTitle") : t("reconnectingTitle")}
      aria-live="polite"
    >
      {live ? (
        <Wifi className="h-3.5 w-3.5" aria-hidden />
      ) : (
        <WifiOff className="h-3.5 w-3.5" aria-hidden />
      )}
      {live ? t("live") : t("reconnecting")}
    </span>
  );
}
