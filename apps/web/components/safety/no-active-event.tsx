"use client";

import { ShieldCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@workspace/ui/components/empty";

export function NoActiveEvent() {
  const t = useTranslations("dashboard.noActiveEvent");
  return (
    <Empty className="border rounded-2xl py-12">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <ShieldCheck className="h-6 w-6" aria-hidden />
        </EmptyMedia>
        <EmptyTitle>{t("title")}</EmptyTitle>
        <EmptyDescription>{t("description")}</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <p className="text-xs text-muted-foreground">{t("footer")}</p>
      </EmptyContent>
    </Empty>
  );
}
