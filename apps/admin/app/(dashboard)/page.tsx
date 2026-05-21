import Link from "next/link";
import { AlertCircle, Users, ShieldCheck, ArrowUpRight } from "lucide-react";
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
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { apiAdminServer } from "@/lib/api-server";
import { formatDateTime } from "@/lib/format-date";
import { ActivityFeed } from "@/components/dashboard/activity-feed";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await verifySession();
  if (!session) redirect("/login");

  const [{ events }, userPage] = await Promise.all([
    apiAdminServer.events.list(),
    apiAdminServer.users
      .list({ limit: 1 })
      .catch(() => ({ users: [], total: 0 })),
  ]);
  const activeEvents = events.filter((e) => e.status === "active");
  const totalUsers = userPage.total;
  const t = await getTranslations("dashboard");
  const tStatus = await getTranslations("status");

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("greeting", { username: session.username })}
          </p>
        </div>
        <Button asChild>
          <Link href="/events">
            {t("manageEvents")}
            <ArrowUpRight className="ml-1 h-4 w-4" aria-hidden />
          </Link>
        </Button>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          title={t("activeEvents")}
          value={activeEvents.length}
          description={t("activeEventsDescription")}
          icon={<AlertCircle className="h-4 w-4" aria-hidden />}
          accent={activeEvents.length > 0 ? "destructive" : "muted"}
        />
        <StatCard
          title={t("totalEvents")}
          value={events.length}
          description={t("totalEventsDescription")}
          icon={<ShieldCheck className="h-4 w-4" aria-hidden />}
        />
        <StatCard
          title={t("users")}
          value={totalUsers}
          description={t("usersDescription")}
          icon={<Users className="h-4 w-4" aria-hidden />}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-start justify-between space-y-0">
            <div className="space-y-1">
              <CardTitle>{t("activeEvents")}</CardTitle>
              <CardDescription>
                {t("activeEventsCardDescription")}
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/events">{t("allEvents")}</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {activeEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                {t("noActiveEvents")}
              </p>
            ) : (
              <ul className="divide-y rounded-lg border">
                {activeEvents.slice(0, 5).map((e) => (
                  <li key={e.id} className="p-3">
                    <Link
                      href={`/events/${e.id}`}
                      className="flex items-center justify-between gap-3 hover:bg-accent rounded-md -m-3 p-3 transition-colors"
                    >
                      <div className="min-w-0">
                        <p className="font-medium truncate">{e.title}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {formatDateTime(e.createdAt)}
                        </p>
                      </div>
                      <Badge variant="destructive">{tStatus("active")}</Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t("activity")}</CardTitle>
            <CardDescription>{t("activityDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            <ActivityFeed />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  description,
  icon,
  accent = "default",
}: {
  title: string;
  value: number;
  description: string;
  icon: React.ReactNode;
  accent?: "default" | "destructive" | "muted";
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <span
          className={
            accent === "destructive"
              ? "text-destructive"
              : accent === "muted"
                ? "text-muted-foreground"
                : ""
          }
        >
          {icon}
        </span>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-semibold tabular-nums">{value}</div>
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      </CardContent>
    </Card>
  );
}
