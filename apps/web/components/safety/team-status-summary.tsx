"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  CheckCircle2,
  AlertTriangle,
  CircleHelp,
  Users,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { cn } from "@workspace/ui/lib/utils";
import type { StatsResponse, SseEvent } from "@workspace/api-contracts";
import { api } from "@/lib/api-client";
import { useSse } from "@/hooks/use-sse";

interface Props {
  eventId: string;
  initialStats: StatsResponse;
}

export function TeamStatusSummary({ eventId, initialStats }: Props) {
  const t = useTranslations("summary");
  const [stats, setStats] = useState<StatsResponse>(initialStats);
  const [pulse, setPulse] = useState(false);

  useSse({
    onEvent: (e: SseEvent) => {
      if (
        e.type === "stats_update" &&
        e.stats.eventId === eventId
      ) {
        setStats(e.stats);
        triggerPulse();
        return;
      }
      if (e.type === "report_submitted" && e.eventId === eventId) {
        // Refetch to get fresh aggregates (the server invalidates cache on each upsert)
        api.stats.get(eventId).then(setStats).catch(() => undefined);
        triggerPulse();
      }
    },
  });

  function triggerPulse() {
    setPulse(true);
    setTimeout(() => setPulse(false), 700);
  }

  const overall = stats.overall;
  const safePct = overall.total > 0 ? (overall.safe / overall.total) * 100 : 0;
  const needHelpPct =
    overall.total > 0 ? (overall.needHelp / overall.total) * 100 : 0;
  const notReportedPct =
    overall.total > 0 ? (overall.notReported / overall.total) * 100 : 0;

  return (
    <Card className={cn("transition-shadow", pulse && "ring-2 ring-primary/30")}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Users className="h-4 w-4" aria-hidden />
          {t("title")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          <Tile
            icon={<CheckCircle2 className="h-4 w-4" aria-hidden />}
            label={t("safe")}
            value={overall.safe}
            tone="success"
          />
          <Tile
            icon={<AlertTriangle className="h-4 w-4" aria-hidden />}
            label={t("needHelp")}
            value={overall.needHelp}
            tone="destructive"
          />
          <Tile
            icon={<CircleHelp className="h-4 w-4" aria-hidden />}
            label={t("notReported")}
            value={overall.notReported}
            tone="muted"
          />
        </div>
        <div>
          <div className="flex h-2.5 overflow-hidden rounded-full bg-muted">
            <span
              className="bg-success transition-all"
              style={{ width: `${safePct}%` }}
            />
            <span
              className="bg-destructive transition-all"
              style={{ width: `${needHelpPct}%` }}
            />
            <span
              className="bg-muted-foreground/30 transition-all"
              style={{ width: `${notReportedPct}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {t("totalLabel", {
              total: overall.total,
              rate:
                overall.total === 0
                  ? "—"
                  : `${Math.round(((overall.safe + overall.needHelp) / overall.total) * 100)}%`,
            })}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function Tile({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  tone: "success" | "destructive" | "muted";
}) {
  return (
    <div
      className={cn(
        "rounded-lg p-3 sm:p-4 flex flex-col gap-1",
        tone === "success" && "bg-success/10 text-success",
        tone === "destructive" && "bg-destructive/10 text-destructive",
        tone === "muted" && "bg-muted text-foreground",
      )}
    >
      <span className="flex items-center gap-1.5 text-xs sm:text-sm">
        {icon}
        {label}
      </span>
      <span className="text-2xl sm:text-3xl font-semibold tabular-nums">
        {value}
      </span>
    </div>
  );
}

export function TeamStatusSummarySkeleton() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <Skeleton className="h-5 w-32" />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
        <Skeleton className="h-2.5" />
      </CardContent>
    </Card>
  );
}
