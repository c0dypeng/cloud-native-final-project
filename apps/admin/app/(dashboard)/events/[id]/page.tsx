import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Radio } from "lucide-react";
import Link from "next/link";
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import { getTranslations } from "next-intl/server";
import { verifySession } from "@/lib/dal";
import { apiAdminServer } from "@/lib/api-server";
import { EventDetailClient } from "./event-detail-client";

export const dynamic = "force-dynamic";

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
  const t = await getTranslations("events");
  const tStatus = await getTranslations("status");
  const tEventTypes = await getTranslations("eventTypes");

  return (
    <div className="space-y-6">
      <div>
        <Button variant="ghost" size="sm" asChild className="-ml-2 mb-2">
          <Link href="/events">
            <ArrowLeft className="mr-1.5 h-4 w-4" aria-hidden />
            {t("backToList")}
          </Link>
        </Button>
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <Badge variant={event.type === "drill" ? "outline" : "secondary"}>
                {tEventTypes.has(event.type) ? tEventTypes(event.type) : event.type}
              </Badge>
              {event.status === "active" ? (
                <Badge variant="destructive">{tStatus("active")}</Badge>
              ) : (
                <Badge variant="outline">{tStatus("closed")}</Badge>
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
                {t("liveCommandCenter")}
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
