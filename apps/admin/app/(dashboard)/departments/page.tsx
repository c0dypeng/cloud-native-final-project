import { redirect } from "next/navigation";
import { Network } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { verifySession } from "@/lib/dal";
import { apiAdminServer } from "@/lib/api-server";
import { DepartmentsClient } from "./departments-client";

export const dynamic = "force-dynamic";

export default async function DepartmentsPage() {
  const session = await verifySession();
  if (!session) redirect("/login");

  const { tree } = await apiAdminServer.departments.tree();

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">組織架構</h1>
        <p className="text-sm text-muted-foreground">
          管理部門階層 — 影響主管「下屬」範圍與報表分組。
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Network className="h-4 w-4" aria-hidden />
            部門樹
          </CardTitle>
          <CardDescription>點選部門查看下屬部門與人數。</CardDescription>
        </CardHeader>
        <CardContent>
          <DepartmentsClient initialTree={tree} />
        </CardContent>
      </Card>
    </div>
  );
}
