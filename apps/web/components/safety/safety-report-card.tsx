"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { CheckCircle2, AlertTriangle, Send, MapPin } from "lucide-react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { Textarea } from "@workspace/ui/components/textarea";
import { Badge } from "@workspace/ui/components/badge";
import { cn } from "@workspace/ui/lib/utils";
import type {
  Event,
  ReportStatus,
  Report,
} from "@workspace/api-contracts";
import { api } from "@/lib/api-client";

interface SafetyReportCardProps {
  event: Event;
  currentReport?: Report | null;
}

export function SafetyReportCard({
  event,
  currentReport,
}: SafetyReportCardProps) {
  const t = useTranslations("report");
  const tType = useTranslations("eventType");
  const locale = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState(currentReport?.message ?? "");
  const [showMessage, setShowMessage] = useState(false);

  const status: ReportStatus = currentReport?.status ?? "not_reported";

  function submit(targetStatus: "safe" | "need_help") {
    startTransition(async () => {
      try {
        await api.reports.submit(event.id, {
          status: targetStatus,
          message: message.trim() ? message.trim() : null,
        });
        toast.success(
          targetStatus === "safe" ? t("submittedSafe") : t("submittedNeedHelp"),
        );
        setShowMessage(false);
        router.refresh();
      } catch (err) {
        const e = err as { message?: string };
        toast.error(t("submitFailed"), {
          description: e.message ?? t("retryHint"),
        });
      }
    });
  }

  const dateFmt = new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <Card
      className={cn(
        "transition-colors",
        event.type === "drill" && "border-warning/40 bg-warning/5",
      )}
    >
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1.5 min-w-0">
            <CardTitle className="text-lg sm:text-xl flex flex-wrap items-center gap-2">
              <span className="truncate">{event.title}</span>
              {event.type === "drill" && (
                <Badge variant="outline" className="border-warning text-warning">
                  {t("drillBadge")}
                </Badge>
              )}
            </CardTitle>
            <CardDescription className="text-sm flex flex-wrap items-center gap-x-3 gap-y-1">
              <span>{t("type", { type: tType(event.type) })}</span>
              <span aria-hidden>·</span>
              <span>
                {t("createdAt", { date: dateFmt.format(new Date(event.createdAt)) })}
              </span>
            </CardDescription>
          </div>
          <CurrentStatusBadge status={status} />
        </div>
      </CardHeader>

      {event.description ? (
        <CardContent className="text-sm text-muted-foreground -mt-2">
          {event.description}
        </CardContent>
      ) : null}

      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Button
            type="button"
            size="lg"
            variant={status === "safe" ? "default" : "outline"}
            loading={pending}
            onClick={() => submit("safe")}
            className={cn(
              "h-14 text-base gap-2",
              status === "safe" &&
                "bg-success text-success-foreground hover:bg-success/90",
            )}
          >
            <CheckCircle2 className="h-5 w-5" aria-hidden />
            {t("iAmSafe")}
          </Button>
          <Button
            type="button"
            size="lg"
            variant={status === "need_help" ? "default" : "outline"}
            loading={pending}
            onClick={() => submit("need_help")}
            className={cn(
              "h-14 text-base gap-2",
              status === "need_help" &&
                "bg-destructive text-destructive-foreground hover:bg-destructive/90",
            )}
          >
            <AlertTriangle className="h-5 w-5" aria-hidden />
            {t("iNeedHelp")}
          </Button>
        </div>

        {showMessage ? (
          <div className="space-y-2">
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={t("messagePlaceholder")}
              maxLength={500}
              rows={3}
              disabled={pending}
            />
            <p className="text-xs text-muted-foreground text-right">
              {message.length}/500
            </p>
          </div>
        ) : (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowMessage(true)}
            className="text-muted-foreground"
          >
            <Send className="h-4 w-4 mr-1.5" aria-hidden />
            {t("attachMessage")}
          </Button>
        )}
      </CardContent>

      {currentReport?.reportedAt && (
        <CardFooter className="text-xs text-muted-foreground gap-1.5 border-t pt-4">
          <MapPin className="h-3.5 w-3.5" aria-hidden />
          {t("lastReported", {
            date: dateFmt.format(new Date(currentReport.reportedAt)),
          })}
        </CardFooter>
      )}
    </Card>
  );
}

function CurrentStatusBadge({ status }: { status: ReportStatus }) {
  const t = useTranslations("report");
  if (status === "safe") {
    return (
      <Badge className="bg-success/15 text-success border-success/20 shrink-0">
        {t("statusReportedSafe")}
      </Badge>
    );
  }
  if (status === "need_help") {
    return (
      <Badge className="bg-destructive/15 text-destructive border-destructive/20 shrink-0">
        {t("statusReportedNeedHelp")}
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="shrink-0">
      {t("statusNotReported")}
    </Badge>
  );
}
