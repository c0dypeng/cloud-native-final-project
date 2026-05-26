"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  CheckCircle2,
  AlertTriangle,
  CircleHelp,
  Mail,
  Phone,
  Users,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import { Input } from "@workspace/ui/components/input";
import { Tabs, TabsList, TabsTrigger } from "@workspace/ui/components/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { cn } from "@workspace/ui/lib/utils";
import type {
  Event,
  SseEvent,
  TeamMember,
  TeamMemberWithStatus,
  TeamStatusResponse,
} from "@workspace/api-contracts";
import { api } from "@/lib/api-client";
import { useSse } from "@/hooks/use-sse";

type Filter = "all" | "not_reported" | "safe" | "need_help";

interface Props {
  activeEvents: Event[];
  initialEventId: string | null;
  initialStatus: TeamStatusResponse | null;
  fallbackTeam: TeamMember[] | null;
}

export function TeamCarePage({
  activeEvents,
  initialEventId,
  initialStatus,
  fallbackTeam,
}: Props) {
  const t = useTranslations("team");
  const [eventId, setEventId] = useState<string | null>(initialEventId);
  const [status, setStatus] = useState<TeamStatusResponse | null>(initialStatus);
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!eventId) {
      setStatus(null);
      return;
    }
    if (eventId === initialEventId && initialStatus) return;
    let cancelled = false;
    api.manager
      .teamStatus(eventId)
      .then((s) => {
        if (!cancelled) setStatus(s);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [eventId, initialEventId, initialStatus]);

  useSse({
    onEvent: (e: SseEvent) => {
      if (!eventId) return;
      if (
        (e.type === "report_submitted" && e.eventId === eventId) ||
        (e.type === "stats_update" && e.stats.eventId === eventId)
      ) {
        api.manager.teamStatus(eventId).then(setStatus).catch(() => undefined);
      }
    },
  });

  const rows: TeamMemberWithStatus[] = useMemo(() => {
    if (status?.members) return status.members;
    return (fallbackTeam ?? []).map(
      (m): TeamMemberWithStatus => ({
        ...m,
        reportStatus: "not_reported",
        reportedAt: null,
        reportMessage: null,
      }),
    );
  }, [status, fallbackTeam]);

  const counts = useMemo(() => {
    const c = { all: rows.length, not_reported: 0, safe: 0, need_help: 0 };
    for (const m of rows) {
      if (m.reportStatus === "safe") c.safe += 1;
      else if (m.reportStatus === "need_help") c.need_help += 1;
      else c.not_reported += 1;
    }
    return c;
  }, [rows]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((m) => {
      if (filter !== "all" && m.reportStatus !== filter) return false;
      if (!q) return true;
      return (
        m.name.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q) ||
        (m.departmentName ?? "").toLowerCase().includes(q)
      );
    });
  }, [rows, filter, query]);

  return (
    <div className="space-y-4">
      {activeEvents.length > 0 && (
        <Card>
          <CardContent className="py-3 flex flex-wrap items-center gap-3">
            <label
              htmlFor="event-select"
              className="text-sm font-medium shrink-0"
            >
              {t("eventSelectorLabel")}
            </label>
            <Select
              value={eventId ?? ""}
              onValueChange={(v) => setEventId(v)}
            >
              <SelectTrigger id="event-select" className="max-w-sm">
                <SelectValue>
                  {(value) =>
                    activeEvents.find((ev) => ev.id === value)?.title ?? ""
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {activeEvents.map((ev) => (
                  <SelectItem key={ev.id} value={ev.id}>
                    {ev.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      )}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" aria-hidden />
              {t("memberCount", { count: rows.length })}
            </CardTitle>
            <Input
              type="search"
              placeholder={t("searchPlaceholder")}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="max-w-xs h-9"
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="all">
                {t("filterAll")}
                <Badge variant="secondary" className="ml-2">
                  {counts.all}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="not_reported">
                {t("filterNotReported")}
                <Badge variant="secondary" className="ml-2">
                  {counts.not_reported}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="safe">
                {t("filterSafe")}
                <Badge
                  variant="secondary"
                  className="ml-2 bg-success/15 text-success"
                >
                  {counts.safe}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="need_help">
                {t("filterNeedHelp")}
                <Badge
                  variant="secondary"
                  className="ml-2 bg-destructive/15 text-destructive"
                >
                  {counts.need_help}
                </Badge>
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {visible.length === 0 ? (
            <p className="text-sm text-muted-foreground py-12 text-center">
              {rows.length === 0 ? t("emptyAll") : t("emptyFiltered")}
            </p>
          ) : (
            <ul className="divide-y rounded-lg border bg-card">
              {visible.map((m) => (
                <li key={m.id} className="p-3 sm:p-4">
                  <TeamRow member={m} />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function TeamRow({ member }: { member: TeamMemberWithStatus }) {
  const t = useTranslations("team");
  const status = member.reportStatus;
  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-3",
        status === "need_help" && "animate-pulse-once",
      )}
    >
      <div className="min-w-0 flex-1 flex items-start gap-3">
        <StatusDot status={status} />
        <div className="min-w-0">
          <p className="font-medium truncate flex items-center gap-2">
            {member.name}
            {member.role === "manager" && (
              <Badge variant="outline" className="text-xs">
                {t("managerBadge")}
              </Badge>
            )}
          </p>
          <p className="text-xs text-muted-foreground truncate">
            {t("deptLevel", {
              dept: member.departmentName ?? "—",
              depth: member.depth,
            })}
          </p>
          {member.reportMessage && (
            <p className="text-xs mt-1 rounded bg-muted/50 px-2 py-1 max-w-md">
              「{member.reportMessage}」
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        {member.phone && (
          <Button variant="outline" size="sm" asChild>
            <a href={`tel:${member.phone}`} aria-label={member.name}>
              <Phone className="h-3.5 w-3.5 mr-1.5" aria-hidden />
              {t("callButton")}
            </a>
          </Button>
        )}
        <Button variant="outline" size="sm" asChild>
          <a href={`mailto:${member.email}`} aria-label={member.name}>
            <Mail className="h-3.5 w-3.5 mr-1.5" aria-hidden />
            {t("emailButton")}
          </a>
        </Button>
      </div>
    </div>
  );
}

function StatusDot({
  status,
}: {
  status: TeamMemberWithStatus["reportStatus"];
}) {
  if (status === "safe") {
    return (
      <CheckCircle2 className="h-5 w-5 shrink-0 text-success mt-0.5" aria-hidden />
    );
  }
  if (status === "need_help") {
    return (
      <AlertTriangle
        className="h-5 w-5 shrink-0 text-destructive mt-0.5"
        aria-hidden
      />
    );
  }
  return (
    <CircleHelp
      className="h-5 w-5 shrink-0 text-muted-foreground mt-0.5"
      aria-hidden
    />
  );
}
