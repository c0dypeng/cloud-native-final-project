"use client";

import { useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Languages, Check } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import { Button } from "@workspace/ui/components/button";
import { setLocaleAction } from "@/i18n/actions";

const OPTIONS = [
  { code: "zh-TW", labelKey: "languageZh" as const },
  { code: "en", labelKey: "languageEn" as const },
  { code: "ja", labelKey: "languageJa" as const },
];

export function LanguageSwitcher({
  variant = "icon",
}: {
  variant?: "icon" | "inline";
}) {
  const t = useTranslations("settings");
  const current = useLocale();
  const [pending, startTransition] = useTransition();

  function pick(code: string) {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("locale", code);
      await setLocaleAction(fd);
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          variant === "inline" ? (
            <Button variant="outline" size="sm" disabled={pending}>
              <Languages className="h-4 w-4 mr-1.5" aria-hidden />
              {t(OPTIONS.find((o) => o.code === current)?.labelKey ?? "languageZh")}
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              aria-label="Language"
              disabled={pending}
            >
              <Languages className="h-4 w-4" aria-hidden />
            </Button>
          )
        }
      />
      <DropdownMenuContent align="end">
        <DropdownMenuGroup>
          <DropdownMenuLabel>{t("language")}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {OPTIONS.map((o) => (
            <DropdownMenuItem
              key={o.code}
              onClick={() => pick(o.code)}
              disabled={pending}
            >
              {o.code === current ? (
                <Check className="mr-2 h-3.5 w-3.5" aria-hidden />
              ) : (
                <span className="mr-2 inline-block w-3.5" />
              )}
              {t(o.labelKey)}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
