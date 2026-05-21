"use client";

import { useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Languages, Check } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import { Button } from "@workspace/ui/components/button";
import { setLocaleAction } from "@/i18n/actions";

const OPTIONS = ["zh-TW", "en", "ja"] as const;

export function LanguageSwitcher() {
  const current = useLocale();
  const t = useTranslations("common.languages");
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
          <Button
            variant="ghost"
            size="sm"
            disabled={pending}
            aria-label="Language"
          >
            <Languages className="h-4 w-4" aria-hidden />
          </Button>
        }
      />
      <DropdownMenuContent align="end">
        {OPTIONS.map((code) => (
          <DropdownMenuItem key={code} onClick={() => pick(code)}>
            {current === code ? (
              <Check className="mr-2 h-3.5 w-3.5" aria-hidden />
            ) : (
              <span className="mr-2 inline-block w-3.5" />
            )}
            {t(code)}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
