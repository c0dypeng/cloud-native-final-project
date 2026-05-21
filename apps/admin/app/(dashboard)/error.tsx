"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@workspace/ui/components/button";
import { AlertCircle } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("error");
  useEffect(() => {
    console.error("Dashboard error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center gap-4">
      <AlertCircle className="h-12 w-12 text-destructive" />
      <div className="text-center">
        <h2 className="text-2xl font-bold">{t("title")}</h2>
        <p className="mt-2 text-muted-foreground">
          {error.message || t("unexpected")}
        </p>
      </div>
      <Button onClick={reset}>{t("retry")}</Button>
    </div>
  );
}
