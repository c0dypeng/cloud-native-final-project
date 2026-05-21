"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  AlertTriangle,
  CircleHelp,
  Users,
  XCircle,
  Mail,
  Phone,
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
import { Input } from "@workspace/ui/components/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@workspace/ui/components/alert-dialog";
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { cn } from "@workspace/ui/lib/utils";
import type {
  ReportListResponse,
  ReportWithUser,
  SseEvent,
  StatsResponse,
} from "@workspace/api-contracts";
import { adminApi } from "@/lib/api-client";
import { formatDateTime } from "@/lib/format-date";
import { useSse } from "@/hooks/use-sse";

type Filter = "all" | "safe" | "need_help" | "not_reported";

interface Props {
  eventId: string;
  eventTitle: string;
  eventStatus: "active" | "closed";
  initialStats: StatsResponse;
  initialReports: ReportWithUser[];
}

export function EventDetailClient({
  eventId,
  eventTitle,
  eventStatus,
  initialStats,
  initialReports,
}: Props) {
  const router = useRouter();
  const [stats, setStats] = useState<StatsResponse>(initialStats);
  const [reports, setReports] = useState<ReportWithUser[]>(initialReports);
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [closing, startClose] = useTransition();

  useSse({
    onEvent: (e: SseEvent) => {
      if (
        (e.type === "report_submitted" && e.eventId === eventId) ||
        (e.type === "stats_update" && e.stats.eventId === eventId)
      ) {
        Promise.all([
          adminApi.stats.get(eventId),
          adminApi.reports.list(eventId),
        ])
          .then(([s, r]: [StatsResponse, ReportListResponse]) => {
            setStats(s);
            setReports(r.reports);
          })
          .catch(() => undefined);
      }
      if (e.type === "event_closed" && e.eventId === eventId) {
        router.refresh();
      }
    },
  });

  function handleClose() {
    startClose(async () => {
      try {
        await adminApi.events.close(eventId);
        toast.success("事件已結束");
        router.refresh();
      } catch (err) {
        const msg = (err as { message?: string }).message;
        toast.error("無法結束事件", { description: msg ?? "請稍後再試" });
      }
    });
  }

  const filtered = reports.filter((r) => {
    if (filter === "safe" && r.status !== "safe") return false;
    if (filter === "need_help" && r.status !== "need_help") return false;
    if (filter === "not_reported" && r.status !== "not_reported") return false;
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      r.user.name.toLowerCase().includes(q) ||
      r.user.email.toLowerCase().includes(q) ||
      (r.user.departmentName ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryTile
          label="總員工數"
          value={stats.overall.total}
          icon={<Users className="h-4 w-4 text-muted-foreground" aria-hidden />}
        />
        <SummaryTile
          label="已安全"
          value={stats.overall.safe}
          tone="success"
          icon={<CheckCircle2 className="h-4 w-4" aria-hidden />}
        />
        <SummaryTile
          label="需協助"
          value={stats.overall.needHelp}
          tone="destructive"
          icon={<AlertTriangle className="h-4 w-4" aria-hidden />}
        />
        <SummaryTile
          label="未回報"
          value={stats.overall.notReported}
          tone="muted"
          icon={<CircleHelp className="h-4 w-4" aria-hidden />}
        />
      </div>

      {stats.byDepartment.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">依部門統計</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>部門</TableHead>
                  <TableHead className="text-right">已安全</TableHead>
                  <TableHead className="text-right">需協助</TableHead>
                  <TableHead className="text-right">未回報</TableHead>
                  <TableHead className="text-right">總人數</TableHead>
                  <TableHead>進度</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.byDepartment.map((d) => {
                  const reported = d.safe + d.needHelp;
                  const pct = d.total > 0 ? (reported / d.total) * 100 : 0;
                  return (
                    <TableRow key={d.departmentId}>
                      <TableCell className="font-medium">
                        {d.departmentName}
                      </TableCell>
                      <TableCell className="text-right text-success tabular-nums">
                        {d.safe}
                      </TableCell>
                      <TableCell className="text-right text-destructive tabular-nums">
                        {d.needHelp}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground tabular-nums">
                        {d.notReported}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {d.total}
                      </TableCell>
                      <TableCell className="w-40">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full bg-success transition-all"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground tabular-nums w-8 text-right">
                            {Math.round(pct)}%
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base">回報明細</CardTitle>
              <CardDescription>
                共 {reports.length} 筆。即時更新。
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="search"
                placeholder="搜尋姓名、信箱、部門…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="max-w-xs h-9"
              />
              {eventStatus === "active" && (
                <AlertDialog>
                  <AlertDialogTrigger
                    render={
                      <Button variant="outline" size="sm" disabled={closing}>
                        <XCircle className="mr-1.5 h-4 w-4" aria-hidden />
                        結束事件
                      </Button>
                    }
                  />
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>確定結束「{eventTitle}」？</AlertDialogTitle>
                      <AlertDialogDescription>
                        結束後員工將無法再回報，但歷史紀錄會保留。此動作無法復原。
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>取消</AlertDialogCancel>
                      <AlertDialogAction onClick={handleClose}>
                        確定結束
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 p-0">
          <div className="px-6">
            <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="all">全部</TabsTrigger>
                <TabsTrigger value="safe">安全</TabsTrigger>
                <TabsTrigger value="need_help">需協助</TabsTrigger>
                <TabsTrigger value="not_reported">未回報</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>狀態</TableHead>
                <TableHead>姓名</TableHead>
                <TableHead className="hidden md:table-cell">部門</TableHead>
                <TableHead className="hidden md:table-cell">回報時間</TableHead>
                <TableHead>聯絡</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                    沒有符合條件的回報
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((r) => (
                  <TableRow
                    key={r.id}
                    className={cn(
                      r.status === "need_help" && "bg-destructive/5",
                    )}
                  >
                    <TableCell>
                      <StatusBadge status={r.status} />
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{r.user.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {r.user.email}
                        </p>
                        {r.message && (
                          <p className="text-xs mt-1 max-w-xs truncate">
                            「{r.message}」
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm">
                      {r.user.departmentName ?? "—"}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                      {r.reportedAt ? formatDateTime(r.reportedAt) : "尚未回報"}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {r.user.phone && (
                          <Button variant="ghost" size="sm" asChild>
                            <a
                              href={`tel:${r.user.phone}`}
                              aria-label={`撥打 ${r.user.name}`}
                            >
                              <Phone className="h-3.5 w-3.5" aria-hidden />
                            </a>
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" asChild>
                          <a
                            href={`mailto:${r.user.email}`}
                            aria-label={`寄信給 ${r.user.name}`}
                          >
                            <Mail className="h-3.5 w-3.5" aria-hidden />
                          </a>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryTile({
  label,
  value,
  icon,
  tone = "default",
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  tone?: "default" | "success" | "destructive" | "muted";
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-sm font-medium">{label}</CardTitle>
        <span
          className={cn(
            tone === "success" && "text-success",
            tone === "destructive" && "text-destructive",
          )}
        >
          {icon}
        </span>
      </CardHeader>
      <CardContent>
        <div
          className={cn(
            "text-3xl font-semibold tabular-nums",
            tone === "success" && "text-success",
            tone === "destructive" && "text-destructive",
          )}
        >
          {value}
        </div>
      </CardContent>
    </Card>
  );
}

function StatusBadge({
  status,
}: {
  status: "safe" | "need_help" | "not_reported";
}) {
  if (status === "safe") {
    return (
      <Badge className="bg-success/15 text-success border-success/20">安全</Badge>
    );
  }
  if (status === "need_help") {
    return (
      <Badge className="bg-destructive/15 text-destructive border-destructive/20">
        需協助
      </Badge>
    );
  }
  return <Badge variant="outline">未回報</Badge>;
}
