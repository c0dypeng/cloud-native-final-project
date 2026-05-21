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
import { getTranslations } from "next-intl/server";
import { apiAdminServer } from "@/lib/api-server";
import { formatDateTime } from "@/lib/format-date";
import { CreateEventDialog } from "@/components/events/create-event-dialog";

export const dynamic = "force-dynamic";

export default async function EventsPage() {
  const session = await verifySession();
  if (!session) redirect("/login");

  const { events } = await apiAdminServer.events.list();
  const sorted = [...events].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const t = await getTranslations("events");
  const tCommon = await getTranslations("common");
  const tStatus = await getTranslations("status");
  const tEventTypes = await getTranslations("eventTypes");

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("description")}
          </p>
        </div>
        <CreateEventDialog
          trigger={
            <Button>
              <Plus className="mr-1.5 h-4 w-4" aria-hidden />
              {t("create")}
            </Button>
          }
        />
      </header>

      <Card>
        <CardHeader>
          <CardTitle>{t("list")}</CardTitle>
          <CardDescription>{tCommon("count", { count: events.length })}</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {events.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <AlertCircle className="mx-auto h-8 w-8 text-muted-foreground" aria-hidden />
              <p className="mt-3 text-sm text-muted-foreground">
                {t("empty")}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("name")}</TableHead>
                  <TableHead className="hidden sm:table-cell">{t("type")}</TableHead>
                  <TableHead>{t("status")}</TableHead>
                  <TableHead className="hidden md:table-cell">{t("createdAt")}</TableHead>
                  <TableHead className="hidden md:table-cell">{t("closedAt")}</TableHead>
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
                        {tEventTypes.has(e.type) ? tEventTypes(e.type) : e.type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {e.status === "active" ? (
                        <Badge variant="destructive">{tStatus("active")}</Badge>
                      ) : (
                        <Badge variant="outline">{tStatus("closed")}</Badge>
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
                        <Link href={`/events/${e.id}`}>{tCommon("view")}</Link>
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
