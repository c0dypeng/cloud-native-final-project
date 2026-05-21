import Link from "next/link";
import { redirect } from "next/navigation";
import { ChartBar, ArrowUpRight } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { verifySession } from "@/lib/dal";
import { apiAdminServer } from "@/lib/api-server";
import { formatDateTime } from "@/lib/format-date";
import { getTranslations } from "next-intl/server";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const session = await verifySession();
  if (!session) redirect("/login");

  const { events } = await apiAdminServer.events.list();
  const sorted = [...events].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );
  const t = await getTranslations("reports");
  const tCommon = await getTranslations("common");
  const tEventTypes = await getTranslations("eventTypes");

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">
          {t("description")}
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ChartBar className="h-4 w-4" aria-hidden />
            {t("allEvents")}
          </CardTitle>
          <CardDescription>{tCommon("count", { count: events.length })}</CardDescription>
        </CardHeader>
        <CardContent>
          {events.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">
              {t("empty")}
            </p>
          ) : (
            <ul className="divide-y rounded-lg border">
              {sorted.map((e) => (
                <li
                  key={e.id}
                  className="flex flex-wrap items-center justify-between gap-3 p-4"
                >
                  <div className="min-w-0">
                    <Link
                      href={`/events/${e.id}`}
                      className="font-medium hover:underline"
                    >
                      {e.title}
                    </Link>
                    <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-muted-foreground">
                      <Badge
                        variant={e.type === "drill" ? "outline" : "secondary"}
                      >
                        {tEventTypes.has(e.type) ? tEventTypes(e.type) : e.type}
                      </Badge>
                      <span>
                        {t("createdAt", { time: formatDateTime(e.createdAt) })}
                      </span>
                      {e.closedAt && (
                        <span>· {t("closedAt", { time: formatDateTime(e.closedAt) })}</span>
                      )}
                    </div>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/events/${e.id}`}>
                      {t("viewReport")}
                      <ArrowUpRight className="ml-1 h-3.5 w-3.5" aria-hidden />
                    </Link>
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
