import Link from "next/link";
import { Plus, AlertCircle } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { verifySession } from "@/lib/dal";
import { redirect } from "next/navigation";
import { apiAdminServer } from "@/lib/api-server";
import { formatDateTime } from "@/lib/format-date";
import { CreateEventDialog } from "@/components/events/create-event-dialog";

export const dynamic = "force-dynamic";

const EVENT_TYPE_LABEL: Record<string, string> = {
  earthquake: "地震",
  fire: "火災",
  security: "資安",
  accident: "意外",
  drill: "演習",
  other: "其他",
};

export default async function EventsPage() {
  const session = await verifySession();
  if (!session) redirect("/login");

  const { events } = await apiAdminServer.events.list();
  const sorted = [...events].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">事件管理</h1>
          <p className="text-sm text-muted-foreground">
            建立緊急事件後，員工會立即收到通知並可回報安全狀態。
          </p>
        </div>
        <CreateEventDialog
          trigger={
            <Button>
              <Plus className="mr-1.5 h-4 w-4" aria-hidden />
              建立事件
            </Button>
          }
        />
      </header>

      <Card>
        <CardHeader>
          <CardTitle>事件列表</CardTitle>
          <CardDescription>共 {events.length} 筆</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {events.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <AlertCircle className="mx-auto h-8 w-8 text-muted-foreground" aria-hidden />
              <p className="mt-3 text-sm text-muted-foreground">
                尚未建立過任何事件。
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>事件名稱</TableHead>
                  <TableHead className="hidden sm:table-cell">類型</TableHead>
                  <TableHead>狀態</TableHead>
                  <TableHead className="hidden md:table-cell">建立時間</TableHead>
                  <TableHead className="hidden md:table-cell">結束時間</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.map((e) => (
                  <TableRow key={e.id} className="cursor-pointer">
                    <TableCell className="font-medium">
                      <Link href={`/events/${e.id}`} className="hover:underline">
                        {e.title}
                      </Link>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <Badge
                        variant={e.type === "drill" ? "outline" : "secondary"}
                      >
                        {EVENT_TYPE_LABEL[e.type] ?? e.type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {e.status === "active" ? (
                        <Badge variant="destructive">進行中</Badge>
                      ) : (
                        <Badge variant="outline">已結束</Badge>
                      )}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                      {formatDateTime(e.createdAt)}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                      {e.closedAt ? formatDateTime(e.closedAt) : "—"}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/events/${e.id}`}>查看</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
