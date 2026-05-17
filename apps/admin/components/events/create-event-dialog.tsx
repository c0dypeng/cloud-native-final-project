"use client";

import * as React from "react";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
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

const TYPE_OPTIONS: Array<{ value: EventType; label: string }> = [
  { value: "earthquake", label: "地震" },
  { value: "fire", label: "火災" },
  { value: "security", label: "資安事件" },
  { value: "accident", label: "意外" },
  { value: "drill", label: "演習 (非緊急)" },
  { value: "other", label: "其他" },
];

export function CreateEventDialog({ trigger }: { trigger: React.ReactNode }) {
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
        toast.success("事件已建立，員工已收到通知");
        setOpen(false);
        form.reset();
        router.push(`/events/${res.event.id}`);
        router.refresh();
      } catch (err) {
        const msg = (err as { message?: string }).message;
        toast.error("建立失敗", { description: msg ?? "請稍後再試" });
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger as React.ReactElement<Record<string, unknown>>} />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>建立緊急事件</DialogTitle>
          <DialogDescription>
            建立後系統會立即推送通知，所有員工會看到回報按鈕。
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">事件名稱 *</Label>
            <Input
              id="title"
              placeholder="例如：2026 花蓮地震"
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
            <Label htmlFor="type">類型 *</Label>
            <Select
              value={form.watch("type")}
              onValueChange={(v) => form.setValue("type", v as EventType)}
            >
              <SelectTrigger id="type" disabled={pending}>
                <SelectValue placeholder="選擇類型" />
              </SelectTrigger>
              <SelectContent>
                {TYPE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">詳細說明（選填）</Label>
            <Textarea
              id="description"
              rows={3}
              placeholder="提供更多事件背景，例如地點、影響範圍"
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
              取消
            </Button>
            <Button type="submit" loading={pending} loadingText="建立中…">
              建立並推送
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
