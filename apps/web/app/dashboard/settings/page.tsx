import { getTranslations } from "next-intl/server";
import { requireUser } from "@/utils/auth/server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import { Mail, User, Globe } from "lucide-react";
import { LanguageSwitcher } from "@/components/layout/language-switcher";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await requireUser();
  const t = await getTranslations("settings");
  const tRole = await getTranslations("roles");

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 lg:px-8 lg:py-10 space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
          {t("title")}
        </h1>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>{t("accountInfo")}</CardTitle>
          <CardDescription>{t("accountInfoNote")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          <Row icon={<User className="h-4 w-4" aria-hidden />} label={t("name")}>
            {user.name}
          </Row>
          <Row icon={<Mail className="h-4 w-4" aria-hidden />} label={t("email")}>
            {user.email}
          </Row>
          <Row icon={<Badge variant="outline">·</Badge>} label={t("role")}>
            <Badge variant="secondary">{tRole(user.role)}</Badge>
          </Row>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-4 w-4" aria-hidden />
            {t("language")}
          </CardTitle>
          <CardDescription>{t("languageDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <LanguageSwitcher variant="inline" />
        </CardContent>
      </Card>
    </div>
  );
}

function Row({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-2 border-b last:border-b-0">
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}
        <span className="text-xs uppercase tracking-wider">{label}</span>
      </div>
      <div>{children}</div>
    </div>
  );
}
