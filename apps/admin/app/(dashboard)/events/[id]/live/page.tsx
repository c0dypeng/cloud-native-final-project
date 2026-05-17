import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Radio } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import { verifySession } from "@/lib/dal";
import { apiAdminServer } from "@/lib/api-server";
import { LiveCommandCenter } from "./live-command-center";

export const dynamic = "force-dynamic";

const EVENT_TYPE_LABEL: Record<string, string> = {
  earthquake: "地震",
  fire: "火災",
  security: "資安事件",
  accident: "意外",
  drill: "演習",
  other: "其他",
};

export default async function LivePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await verifySession();
  if (!session) redirect("/login");
  const { id } = await params;

  let event;
  let initialStats;
  let initialUnreported;
  try {
    [{ event }, initialStats, initialUnreported] = await Promise.all([
      apiAdminServer.events.get(id),
      apiAdminServer.stats.get(id),
      apiAdminServer.stats.unreported(id),
    ]);
  } catch {
    notFound();
  }
  if (!event) notFound();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild className="-ml-2">
            <Link href={`/events/${id}`}>
              <ArrowLeft className="mr-1.5 h-4 w-4" aria-hidden />
              返回事件詳情
            </Link>
          </Button>
          <span className="text-muted-foreground">·</span>
          <Badge variant={event.type === "drill" ? "outline" : "secondary"}>
            {EVENT_TYPE_LABEL[event.type] ?? event.type}
          </Badge>
          {event.status === "active" ? (
            <Badge
              variant="destructive"
              className="animate-pulse [animation-duration:2s]"
            >
              <Radio className="h-3 w-3 mr-1" aria-hidden />
              LIVE · 進行中
            </Badge>
          ) : (
            <Badge variant="outline">已結束</Badge>
          )}
        </div>
      </div>

      <header className="space-y-1">
        <h1 className="text-3xl font-semibold tracking-tight">{event.title}</h1>
        {event.description && (
          <p className="text-sm text-muted-foreground max-w-3xl">
            {event.description}
          </p>
        )}
      </header>

      <LiveCommandCenter
        eventId={id}
        eventTitle={event.title}
        eventActive={event.status === "active"}
        initialStats={initialStats}
        initialUnreported={initialUnreported}
      />
    </div>
  );
}
