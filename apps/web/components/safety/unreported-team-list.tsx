"use client";

import Link from "next/link";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Mail, Phone, ArrowRight } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import type {
  UnreportedResponse,
  UnreportedUser,
  SseEvent,
} from "@workspace/api-contracts";
import { api } from "@/lib/api-client";
import { useSse } from "@/hooks/use-sse";

const PREVIEW_LIMIT = 6;

interface Props {
  eventId: string;
  initial: UnreportedResponse;
}

export function UnreportedTeamList({ eventId, initial }: Props) {
  const t = useTranslations("unreported");
  const [users, setUsers] = useState<UnreportedUser[]>(initial.users);

  useSse({
    onEvent: (e: SseEvent) => {
      if (
        (e.type === "report_submitted" && e.eventId === eventId) ||
        (e.type === "stats_update" && e.stats.eventId === eventId)
      ) {
        api.stats
          .unreported(eventId)
          .then((r) => setUsers(r.users))
          .catch(() => undefined);
      }
    },
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1.5">
            <CardTitle className="text-base">{t("title")}</CardTitle>
            <CardDescription>
              {users.length === 0
                ? t("allReported")
                : t("needsReminder", { count: users.length })}
            </CardDescription>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard/team">
              {t("fullCare")}
              <ArrowRight className="ml-1 h-4 w-4" aria-hidden />
            </Link>
          </Button>
        </div>
      </CardHeader>
      {users.length > 0 && (
        <CardContent className="space-y-2">
          {users.slice(0, PREVIEW_LIMIT).map((u) => (
            <UnreportedRow key={u.id} user={u} />
          ))}
          {users.length > PREVIEW_LIMIT && (
            <p className="text-xs text-muted-foreground pt-1">
              {t("more", { count: users.length - PREVIEW_LIMIT })}
            </p>
          )}
        </CardContent>
      )}
    </Card>
  );
}

function UnreportedRow({ user }: { user: UnreportedUser }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-card px-3 py-2.5">
      <div className="min-w-0 flex-1">
        <p className="font-medium text-sm truncate">{user.name}</p>
        <p className="text-xs text-muted-foreground truncate">
          {user.departmentName ?? "—"}
        </p>
      </div>
      <div className="flex items-center gap-1.5">
        {user.phone && (
          <Button variant="outline" size="sm" asChild>
            <a href={`tel:${user.phone}`} aria-label={user.name}>
              <Phone className="h-3.5 w-3.5" aria-hidden />
            </a>
          </Button>
        )}
        <Button variant="outline" size="sm" asChild>
          <a href={`mailto:${user.email}`} aria-label={user.name}>
            <Mail className="h-3.5 w-3.5" aria-hidden />
          </a>
        </Button>
      </div>
    </div>
  );
}
