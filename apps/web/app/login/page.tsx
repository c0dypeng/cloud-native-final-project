import { Suspense } from "react";
import { ShieldCheck } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { LoginForm } from "./login-form";
import { LanguageSwitcher } from "@/components/layout/language-switcher";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const tApp = await getTranslations("app");
  return (
    <div className="flex min-h-svh w-full items-center justify-center bg-muted/40 p-4 md:p-8">
      <div className="w-full max-w-md space-y-8">
        <div className="absolute top-4 right-4">
          <LanguageSwitcher variant="inline" />
        </div>
        <div className="flex flex-col items-center text-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
            <ShieldCheck className="h-7 w-7" aria-hidden />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {tApp("name")}
            </h1>
            <p className="text-sm text-muted-foreground">{tApp("tagline")}</p>
          </div>
        </div>
        <Suspense>
          <LoginForm searchParamsPromise={searchParams} />
        </Suspense>
      </div>
    </div>
  );
}
