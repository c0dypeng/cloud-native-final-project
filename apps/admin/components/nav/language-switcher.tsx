"use client";

import { useTransition } from "react";
import { useLocale } from "next-intl";
import { Languages, Check } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import { Button } from "@workspace/ui/components/button";
import { setLocaleAction } from "@/i18n/actions";

export function LanguageSwitcher() {
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
        <DropdownMenuItem onClick={() => pick("zh-TW")}>
          {current === "zh-TW" ? (
            <Check className="mr-2 h-3.5 w-3.5" aria-hidden />
          ) : (
            <span className="mr-2 inline-block w-3.5" />
          )}
          繁體中文
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => pick("en")}>
          {current === "en" ? (
            <Check className="mr-2 h-3.5 w-3.5" aria-hidden />
          ) : (
            <span className="mr-2 inline-block w-3.5" />
          )}
          English
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
