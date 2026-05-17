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
import { apiAdminServer } from "@/lib/api-server";
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

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">後台概覽</h1>
          <p className="text-sm text-muted-foreground">
            您好，{session.username}。即時掌握全公司的安全狀況。
          </p>
        </div>
        <Button asChild>
          <Link href="/events">
            管理事件
            <ArrowUpRight className="ml-1 h-4 w-4" aria-hidden />
          </Link>
        </Button>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          title="進行中事件"
          value={activeEvents.length}
          description="可同時進行多個事件"
          icon={<AlertCircle className="h-4 w-4" aria-hidden />}
          accent={activeEvents.length > 0 ? "destructive" : "muted"}
        />
        <StatCard
          title="累計事件"
          value={events.length}
          description="包含已結束事件"
          icon={<ShieldCheck className="h-4 w-4" aria-hidden />}
        />
        <StatCard
          title="使用者數"
          value={totalUsers}
          description="員工 + 主管"
          icon={<Users className="h-4 w-4" aria-hidden />}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-start justify-between space-y-0">
            <div className="space-y-1">
              <CardTitle>進行中事件</CardTitle>
              <CardDescription>
                點選事件查看回報狀態，或前往 Live 指揮中心。
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/events">全部事件</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {activeEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                目前沒有進行中的事件。
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
                          {new Date(e.createdAt).toLocaleString("zh-TW")}
                        </p>
                      </div>
                      <Badge variant="destructive">進行中</Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>即時活動</CardTitle>
            <CardDescription>SSE 推送的最新回報。</CardDescription>
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
