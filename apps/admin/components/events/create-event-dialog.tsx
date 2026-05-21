"use client";

import * as React from "react";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Textarea } from "@workspace/ui/components/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import {
  eventCreateInputSchema,
  type EventCreateInput,
  type EventType,
} from "@workspace/api-contracts";
import { adminApi } from "@/lib/api-client";

const TYPE_OPTIONS: EventType[] = [
  "earthquake",
  "fire",
  "security",
  "accident",
  "drill",
  "other",
];

export function CreateEventDialog({ trigger }: { trigger: React.ReactNode }) {
  const t = useTranslations("createEvent");
  const tCommon = useTranslations("common");
  const tEventTypes = useTranslations("eventTypes");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const form = useForm<EventCreateInput>({
    resolver: zodResolver(eventCreateInputSchema),
    defaultValues: { title: "", description: "", type: "earthquake" },
  });

  function onSubmit(values: EventCreateInput) {
    startTransition(async () => {
      try {
        const res = await adminApi.events.create(values);
        toast.success(t("success"));
        setOpen(false);
        form.reset();
        router.push(`/events/${res.event.id}`);
        router.refresh();
      } catch (err) {
        const msg = (err as { message?: string }).message;
        toast.error(t("failure"), { description: msg ?? tCommon("retryLater") });
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger as React.ReactElement<Record<string, unknown>>} />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>
            {t("description")}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">{t("name")}</Label>
            <Input
              id="title"
              placeholder={t("namePlaceholder")}
              {...form.register("title")}
              disabled={pending}
            />
            {form.formState.errors.title && (
              <p className="text-xs text-destructive">
                {form.formState.errors.title.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">{t("type")}</Label>
            <Select
              value={form.watch("type")}
              onValueChange={(v) => form.setValue("type", v as EventType)}
            >
              <SelectTrigger id="type" disabled={pending}>
                <SelectValue placeholder={t("typePlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                {TYPE_OPTIONS.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type === "drill" ? tEventTypes("drillNonEmergency") : tEventTypes(type)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">{t("details")}</Label>
            <Textarea
              id="description"
              rows={3}
              placeholder={t("detailsPlaceholder")}
              {...form.register("description")}
              disabled={pending}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={pending}
            >
              {tCommon("cancel")}
            </Button>
            <Button type="submit" loading={pending} loadingText={t("submitting")}>
              {t("submit")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
