import { redirect } from "next/navigation";
import { Users as UsersIcon } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { verifySession } from "@/lib/dal";
import { apiAdminServer } from "@/lib/api-server";
import { UsersClientPage } from "./users-client-page";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const session = await verifySession();
  if (!session) redirect("/login");

  const [{ users }, { departments }] = await Promise.all([
    apiAdminServer.users.list({ limit: 200 }),
    apiAdminServer.departments.list(),
  ]);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">使用者管理</h1>
          <p className="text-sm text-muted-foreground">
            建立、編輯、停用員工帳號。
          </p>
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UsersIcon className="h-4 w-4" aria-hidden />
            使用者列表
          </CardTitle>
          <CardDescription>共 {users.length} 位</CardDescription>
        </CardHeader>
        <CardContent>
          <UsersClientPage initialUsers={users} departments={departments} />
        </CardContent>
      </Card>
    </div>
  );
}
