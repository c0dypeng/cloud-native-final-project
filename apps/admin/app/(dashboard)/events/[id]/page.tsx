import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Radio } from "lucide-react";
import Link from "next/link";
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import { verifySession } from "@/lib/dal";
import { apiAdminServer } from "@/lib/api-server";
import { EventDetailClient } from "./event-detail-client";

export const dynamic = "force-dynamic";

const EVENT_TYPE_LABEL: Record<string, string> = {
  earthquake: "地震",
  fire: "火災",
  security: "資安事件",
  accident: "意外",
  drill: "演習",
  other: "其他",
};

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await verifySession();
  if (!session) redirect("/login");
  const { id } = await params;

  let event;
  let stats;
  let reports;
  try {
    [{ event }, stats, { reports }] = await Promise.all([
      apiAdminServer.events.get(id),
      apiAdminServer.stats.get(id),
      apiAdminServer.reports.list(id),
    ]);
  } catch {
    notFound();
  }

  if (!event) notFound();

  return (
    <div className="space-y-6">
      <div>
        <Button variant="ghost" size="sm" asChild className="-ml-2 mb-2">
          <Link href="/events">
            <ArrowLeft className="mr-1.5 h-4 w-4" aria-hidden />
            返回事件列表
          </Link>
        </Button>
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <Badge variant={event.type === "drill" ? "outline" : "secondary"}>
                {EVENT_TYPE_LABEL[event.type] ?? event.type}
              </Badge>
              {event.status === "active" ? (
                <Badge variant="destructive">進行中</Badge>
              ) : (
                <Badge variant="outline">已結束</Badge>
              )}
            </div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {event.title}
            </h1>
            {event.description && (
              <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
                {event.description}
              </p>
            )}
          </div>
          {event.status === "active" && (
            <Button asChild variant="default">
              <Link href={`/events/${id}/live`}>
                <Radio className="mr-1.5 h-4 w-4 animate-pulse [animation-duration:2s]" aria-hidden />
                Live 指揮中心
              </Link>
            </Button>
          )}
        </header>
      </div>

      <EventDetailClient
        eventId={id}
        eventTitle={event.title}
        eventStatus={event.status}
        initialStats={stats}
        initialReports={reports}
      />
    </div>
  );
}
