import { WifiOff } from "lucide-react";
import { getTranslations } from "next-intl/server";

export default async function OfflinePage() {
  const t = await getTranslations("offline");
  return (
    <div className="flex min-h-svh items-center justify-center p-6">
      <div className="text-center space-y-4 max-w-sm">
        <div className="mx-auto h-14 w-14 flex items-center justify-center rounded-2xl bg-muted">
          <WifiOff className="h-7 w-7 text-muted-foreground" aria-hidden />
        </div>
        <h1 className="text-xl font-semibold">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("description")}</p>
      </div>
    </div>
  );
}
