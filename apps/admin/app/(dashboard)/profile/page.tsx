import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ShieldCheck, User, KeyRound, Globe } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import { Avatar, AvatarFallback } from "@workspace/ui/components/avatar";
import { verifySession } from "@/lib/dal";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const session = await verifySession();
  if (!session) redirect("/login");

  const t = await getTranslations("profile");
  const tRoles = await getTranslations("roles");

  const initials = session.username.slice(0, 2).toUpperCase();

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </header>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16 bg-primary text-primary-foreground">
              <AvatarFallback className="bg-primary text-primary-foreground text-xl">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col gap-1">
              <CardTitle className="text-xl">{session.username}</CardTitle>
              <CardDescription className="flex items-center gap-2">
                <Badge variant="secondary" className="gap-1">
                  <ShieldCheck className="h-3 w-3" aria-hidden />
                  {tRoles("admin")}
                </Badge>
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("accountInfo")}</CardTitle>
          <CardDescription>{t("accountInfoNote")}</CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="divide-y rounded-lg border">
            <Row
              icon={<User className="h-4 w-4" aria-hidden />}
              label={t("username")}
              value={session.username}
            />
            <Row
              icon={<ShieldCheck className="h-4 w-4" aria-hidden />}
              label={t("role")}
              value={tRoles("admin")}
            />
            <Row
              icon={<KeyRound className="h-4 w-4" aria-hidden />}
              label={t("adminId")}
              value={session.adminId}
              mono
            />
            <Row
              icon={<Globe className="h-4 w-4" aria-hidden />}
              label={t("environment")}
              value={process.env.NODE_ENV ?? "development"}
            />
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}

function Row({
  icon,
  label,
  value,
  mono = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3">
      <dt className="flex items-center gap-2 text-sm text-muted-foreground">
        {icon}
        {label}
      </dt>
      <dd className={`text-sm ${mono ? "font-mono text-xs" : "font-medium"}`}>
        {value}
      </dd>
    </div>
  );
}
