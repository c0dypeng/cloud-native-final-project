"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  CircleHelp,
  Mail,
  Phone,
  Radio,
  Users,
  Activity,
  Wifi,
  WifiOff,
} from "lucide-react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { cn } from "@workspace/ui/lib/utils";
import type {
  SseEvent,
  StatsResponse,
  UnreportedResponse,
  UnreportedUser,
} from "@workspace/api-contracts";
import { adminApi } from "@/lib/api-client";
import { formatTime } from "@/lib/format-date";
import { useSse } from "@/hooks/use-sse";

type ActivityKind = "safe" | "need_help" | "reminder" | "event";

interface ActivityItem {
  id: string;
  kind: ActivityKind;
  text: string;
  detail?: string;
  user?: string;
  at: string;
}

const ACTIVITY_MAX = 60;

interface Props {
  eventId: string;
  eventTitle: string;
  eventActive: boolean;
  initialStats: StatsResponse;
  initialUnreported: UnreportedResponse;
}

export function LiveCommandCenter({
  eventId,
  eventTitle: _eventTitle,
  eventActive,
  initialStats,
  initialUnreported,
}: Props) {
  const [stats, setStats] = useState<StatsResponse>(initialStats);
  const [unreported, setUnreported] = useState<UnreportedUser[]>(
    initialUnreported.users,
  );
  const [feed, setFeed] = useState<ActivityItem[]>([]);
  const [pulse, setPulse] = useState<Record<string, boolean>>({});
  const [reminding, startReminding] = useTransition();
  const feedScrollRef = useRef<HTMLDivElement | null>(null);

  // Refetch slow-changing dimensions on report events.
  function refreshAggregates() {
    Promise.all([
      adminApi.stats.get(eventId),
      adminApi.stats.unreported(eventId),
    ])
      .then(([s, u]) => {
        setStats(s);
        setUnreported(u.users);
      })
      .catch(() => undefined);
  }

  function bump(key: string) {
    setPulse((p) => ({ ...p, [key]: true }));
    setTimeout(() => setPulse((p) => ({ ...p, [key]: false })), 700);
  }

  const { status } = useSse({
    onEvent: (e: SseEvent) => {
      const now = new Date().toISOString();
      if (e.type === "report_submitted" && e.eventId === eventId) {
        const verb = e.status === "safe" ? "回報「我安全」" : "回報「需要協助」";
        const item: ActivityItem = {
          id: `${e.timestamp}-${e.userId}`,
          kind: e.status,
          text: verb,
          user: e.userId.slice(0, 8),
          at: e.timestamp,
        };
        setFeed((prev) => [item, ...prev].slice(0, ACTIVITY_MAX));
        bump(e.status === "safe" ? "safe" : "needHelp");
        refreshAggregates();
        return;
      }
      if (e.type === "need_help" && e.eventId === eventId) {
        const item: ActivityItem = {
          id: `nh-${e.userId}-${e.timestamp}`,
          kind: "need_help",
          text: `🚨 ${e.userName} 需要協助`,
          detail: e.message ?? undefined,
          user: e.departmentName ?? undefined,
          at: e.timestamp,
        };
        setFeed((prev) => [item, ...prev].slice(0, ACTIVITY_MAX));
        return;
      }
      if (e.type === "reminder" && e.eventId === eventId) {
        const item: ActivityItem = {
          id: `r-${e.timestamp}`,
          kind: "reminder",
          text: "已發送提醒給未回報員工",
          at: e.timestamp,
        };
        setFeed((prev) => [item, ...prev].slice(0, ACTIVITY_MAX));
        return;
      }
      if (e.type === "event_closed" && e.eventId === eventId) {
        const item: ActivityItem = {
          id: `x-${e.timestamp}`,
          kind: "event",
          text: "事件已結束",
          at: e.timestamp,
        };
        setFeed((prev) => [item, ...prev].slice(0, ACTIVITY_MAX));
      }
      // Refresh on stats_update too (in case we missed individual events)
      if (e.type === "stats_update" && e.stats.eventId === eventId) {
        setStats(e.stats);
      }
      void now;
    },
  });

  useEffect(() => {
    feedScrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, [feed]);

  function handleRemindNow() {
    if (!eventActive) return;
    startReminding(async () => {
      try {
        const res = await adminApi.events.remind(eventId);
        toast.success(`已觸發提醒 (${res.unreported} 人未回報)`);
        refreshAggregates();
      } catch (err) {
        toast.error("觸發失敗", {
          description: (err as { message?: string }).message ?? "請稍後再試",
        });
      }
    });
  }

  const overall = stats.overall;
  const reportedPct =
    overall.total > 0
      ? Math.round(((overall.safe + overall.needHelp) / overall.total) * 100)
      : 0;

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
      {/* ── Left column: big metrics + dept breakdown ────────────────── */}
      <div className="space-y-4">
        {/* Connection + actions bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-card px-4 py-3">
          <div className="flex items-center gap-2">
            <ConnBadge status={status} />
            <span className="text-xs text-muted-foreground hidden sm:inline">
              即時連線到 /api/sse
            </span>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={handleRemindNow}
            disabled={!eventActive || reminding}
            loading={reminding}
            loadingText="觸發中…"
          >
            <Bell className="mr-1.5 h-4 w-4" aria-hidden />
            立即發送提醒
          </Button>
        </div>

        {/* Big metric tiles */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <MetricTile
            icon={<Users className="h-5 w-5" aria-hidden />}
            label="總員工"
            value={overall.total}
            tone="muted"
          />
          <MetricTile
            icon={<CheckCircle2 className="h-5 w-5" aria-hidden />}
            label="已安全"
            value={overall.safe}
            tone="success"
            pulse={pulse.safe}
          />
          <MetricTile
            icon={<AlertTriangle className="h-5 w-5" aria-hidden />}
            label="需要協助"
            value={overall.needHelp}
            tone="destructive"
            pulse={pulse.needHelp}
            critical={overall.needHelp > 0}
          />
          <MetricTile
            icon={<CircleHelp className="h-5 w-5" aria-hidden />}
            label="未回報"
            value={overall.notReported}
            tone="warning"
          />
        </div>

        {/* Response progress bar */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">
              回報進度 — {reportedPct}%
            </CardTitle>
            <CardDescription>
              {overall.safe + overall.needHelp} / {overall.total} 已回報
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex h-3 rounded-full overflow-hidden bg-muted">
              <div
                className="bg-success transition-all duration-500"
                style={{
                  width: `${overall.total === 0 ? 0 : (overall.safe / overall.total) * 100}%`,
                }}
              />
              <div
                className="bg-destructive transition-all duration-500"
                style={{
                  width: `${overall.total === 0 ? 0 : (overall.needHelp / overall.total) * 100}%`,
                }}
              />
              <div
                className="bg-warning/70 transition-all duration-500"
                style={{
                  width: `${overall.total === 0 ? 0 : (overall.notReported / overall.total) * 100}%`,
                }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Department breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">依部門</CardTitle>
            <CardDescription>各部門的回報進度</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {stats.byDepartment.length === 0 ? (
              <Skeleton className="h-8" />
            ) : (
              stats.byDepartment.map((d) => {
                const reported = d.safe + d.needHelp;
                const pct = d.total > 0 ? (reported / d.total) * 100 : 0;
                return (
                  <div key={d.departmentId} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium truncate">
                        {d.departmentName}
                      </span>
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {reported}/{d.total} ·{" "}
                        {d.needHelp > 0 && (
                          <span className="text-destructive font-medium">
                            {d.needHelp} 求助 ·{" "}
                          </span>
                        )}
                        {Math.round(pct)}%
                      </span>
                    </div>
                    <div className="flex h-1.5 rounded-full overflow-hidden bg-muted">
                      <div
                        className="bg-success transition-all"
                        style={{ width: `${(d.safe / Math.max(d.total, 1)) * 100}%` }}
                      />
                      <div
                        className="bg-destructive transition-all"
                        style={{
                          width: `${(d.needHelp / Math.max(d.total, 1)) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Right column: live activity feed + unreported ─────────────── */}
      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4" aria-hidden />
              即時活動
            </CardTitle>
            <CardDescription>最近 {ACTIVITY_MAX} 筆事件</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div
              ref={feedScrollRef}
              className="h-[420px] overflow-auto px-4 pb-4"
            >
              {feed.length === 0 ? (
                <p className="py-12 text-center text-sm text-muted-foreground">
                  等待員工回報…
                </p>
              ) : (
                <ul className="space-y-2">
                  {feed.map((item) => (
                    <FeedRow key={item.id} item={item} />
                  ))}
                </ul>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CircleHelp className="h-4 w-4 text-warning" aria-hidden />
              未回報名單 ({unreported.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {unreported.length === 0 ? (
              <p className="px-4 pb-6 text-sm text-success text-center">
                所有員工皆已回報 ✓
              </p>
            ) : (
              <ul className="max-h-[280px] overflow-auto divide-y">
                {unreported.slice(0, 30).map((u) => (
                  <li
                    key={u.id}
                    className="flex items-center justify-between gap-2 px-4 py-2 text-sm"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">{u.name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {u.departmentName ?? "—"}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      {u.phone && (
                        <Button variant="ghost" size="sm" asChild>
                          <a href={`tel:${u.phone}`} aria-label={u.name}>
                            <Phone className="h-3.5 w-3.5" aria-hidden />
                          </a>
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" asChild>
                        <a href={`mailto:${u.email}`} aria-label={u.name}>
                          <Mail className="h-3.5 w-3.5" aria-hidden />
                        </a>
                      </Button>
                    </div>
                  </li>
                ))}
                {unreported.length > 30 && (
                  <li className="px-4 py-2 text-xs text-muted-foreground text-center">
                    另有 {unreported.length - 30} 人
                  </li>
                )}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MetricTile({
  icon,
  label,
  value,
  tone,
  pulse,
  critical,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  tone: "success" | "destructive" | "warning" | "muted";
  pulse?: boolean;
  critical?: boolean;
}) {
  const toneClasses = {
    success: "border-success/30 bg-success/5 text-success",
    destructive: "border-destructive/30 bg-destructive/5 text-destructive",
    warning: "border-warning/30 bg-warning/5 text-warning",
    muted: "border-border bg-card text-foreground",
  };
  return (
    <div
      className={cn(
        "rounded-xl border p-4 sm:p-5 transition-all",
        toneClasses[tone],
        pulse && "ring-2 ring-current ring-offset-2 ring-offset-background scale-[1.02]",
        critical && "animate-pulse [animation-duration:1.5s]",
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium">{label}</span>
        {icon}
      </div>
      <div className="text-3xl sm:text-4xl font-bold tabular-nums">{value}</div>
    </div>
  );
}

function FeedRow({ item }: { item: ActivityItem }) {
  const time = formatTime(item.at);
  const styles = {
    safe: "border-success/20 bg-success/5",
    need_help: "border-destructive/30 bg-destructive/10",
    reminder: "border-warning/20 bg-warning/5",
    event: "border-border bg-muted/30",
  } as const;
  const Icon = {
    safe: CheckCircle2,
    need_help: AlertTriangle,
    reminder: Bell,
    event: Radio,
  }[item.kind];
  const iconTone = {
    safe: "text-success",
    need_help: "text-destructive",
    reminder: "text-warning",
    event: "text-muted-foreground",
  }[item.kind];
  return (
    <li
      className={cn(
        "flex items-start gap-2 rounded-md border px-2.5 py-2 text-sm",
        styles[item.kind],
      )}
    >
      <Icon className={cn("h-4 w-4 mt-0.5 shrink-0", iconTone)} aria-hidden />
      <div className="min-w-0 flex-1">
        <p className={cn("leading-tight", item.kind === "need_help" && "font-medium")}>
          {item.text}
        </p>
        {item.detail && (
          <p className="text-xs mt-0.5 rounded bg-background/60 px-1.5 py-0.5">
            「{item.detail}」
          </p>
        )}
        <p className="text-[10px] text-muted-foreground mt-0.5">
          {time}
          {item.user ? ` · ${item.user}` : ""}
        </p>
      </div>
    </li>
  );
}

function ConnBadge({
  status,
}: {
  status: "connecting" | "open" | "closed" | "error";
}) {
  const live = status === "open";
  return (
    <Badge
      variant={live ? "default" : "outline"}
      className={cn(
        "gap-1",
        live && "bg-success/15 text-success border-success/30",
      )}
    >
      {live ? (
        <Wifi className="h-3 w-3" aria-hidden />
      ) : (
        <WifiOff className="h-3 w-3" aria-hidden />
      )}
      {live ? "LIVE" : "重新連線中"}
    </Badge>
  );
}
