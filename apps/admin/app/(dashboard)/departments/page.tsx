import { redirect } from "next/navigation";
import { Network } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { getTranslations } from "next-intl/server";
import { verifySession } from "@/lib/dal";
import { apiAdminServer } from "@/lib/api-server";
import { DepartmentsClient } from "./departments-client";

export const dynamic = "force-dynamic";

export default async function DepartmentsPage() {
  const session = await verifySession();
  if (!session) redirect("/login");

  const { tree } = await apiAdminServer.departments.tree();
  const t = await getTranslations("departments");

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
            <Network className="h-4 w-4" aria-hidden />
            {t("tree")}
          </CardTitle>
          <CardDescription>{t("treeDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <DepartmentsClient initialTree={tree} />
        </CardContent>
      </Card>
    </div>
  );
}
