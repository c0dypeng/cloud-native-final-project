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

export const dynamic = "force-dynamic";

const EVENT_TYPE_LABEL: Record<string, string> = {
  earthquake: "地震",
  fire: "火災",
  security: "資安",
  accident: "意外",
  drill: "演習",
  other: "其他",
};

export default async function ReportsPage() {
  const session = await verifySession();
  if (!session) redirect("/login");

  const { events } = await apiAdminServer.events.list();
  const sorted = [...events].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">統計報表</h1>
        <p className="text-sm text-muted-foreground">
          點選事件查看詳細統計，含全公司與依部門分組。
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ChartBar className="h-4 w-4" aria-hidden />
            所有事件
          </CardTitle>
          <CardDescription>共 {events.length} 筆</CardDescription>
        </CardHeader>
        <CardContent>
          {events.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">
              尚未建立過任何事件。
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
                        {EVENT_TYPE_LABEL[e.type] ?? e.type}
                      </Badge>
                      <span>
                        建立於 {formatDateTime(e.createdAt)}
                      </span>
                      {e.closedAt && (
                        <span>· 結束於 {formatDateTime(e.closedAt)}</span>
                      )}
                    </div>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/events/${e.id}`}>
                      查看報表
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
