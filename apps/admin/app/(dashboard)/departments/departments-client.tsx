"use client";

import * as React from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Plus, Trash2, Pencil, ChevronRight, Building } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Badge } from "@workspace/ui/components/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@workspace/ui/components/alert-dialog";
import { cn } from "@workspace/ui/lib/utils";
import type { DeptTreeNode } from "@workspace/api-contracts";
import { adminApi } from "@/lib/api-client";

interface Props {
  initialTree: DeptTreeNode[];
}

function flattenForSelect(nodes: DeptTreeNode[], depth = 0): Array<{ id: string; name: string; depth: number }> {
  return nodes.flatMap((n) => [
    { id: n.id, name: n.name, depth },
    ...flattenForSelect(n.children, depth + 1),
  ]);
}

export function DepartmentsClient({ initialTree }: Props) {
  const t = useTranslations("departments");
  const router = useRouter();
  const flat = flattenForSelect(initialTree);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <CreateDeptDialog flat={flat} onDone={() => router.refresh()} />
      </div>
      <div className="rounded-lg border bg-card p-3 space-y-1">
        {initialTree.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            {t("empty")}
          </p>
        ) : (
          initialTree.map((node) => (
            <DeptNode
              key={node.id}
              node={node}
              flat={flat}
              onChanged={() => router.refresh()}
            />
          ))
        )}
      </div>
    </div>
  );
}

function DeptNode({
  node,
  flat,
  onChanged,
  depth = 0,
}: {
  node: DeptTreeNode;
  flat: Array<{ id: string; name: string; depth: number }>;
  onChanged: () => void;
  depth?: number;
}) {
  const t = useTranslations("departments");
  const [open, setOpen] = useState(true);
  const hasChildren = node.children.length > 0;
  return (
    <div>
      <div
        className="flex items-center gap-2 rounded-md px-2 py-2 hover:bg-accent group"
        style={{ paddingLeft: `${0.5 + depth * 1.25}rem` }}
      >
        {hasChildren ? (
          <button
            type="button"
            onClick={() => setOpen(!open)}
            className="p-0.5 -ml-1 rounded text-muted-foreground hover:text-foreground"
            aria-label={open ? t("collapse") : t("expand")}
          >
            <ChevronRight
              className={cn(
                "h-3.5 w-3.5 transition-transform",
                open && "rotate-90",
              )}
              aria-hidden
            />
          </button>
        ) : (
          <span className="w-4" />
        )}
        <Building className="h-4 w-4 text-muted-foreground" aria-hidden />
        <span className="font-medium">{node.name}</span>
        <Badge variant="secondary" className="text-xs">
          {t("userCount", { count: node.userCount })}
        </Badge>
        <div className="ml-auto flex opacity-0 group-hover:opacity-100 transition-opacity">
          <EditDeptDialog dept={node} flat={flat} onDone={onChanged} />
          <DeleteDeptButton dept={node} onDone={onChanged} />
        </div>
      </div>
      {hasChildren && open && (
        <div>
          {node.children.map((child) => (
            <DeptNode
              key={child.id}
              node={child}
              flat={flat}
              onChanged={onChanged}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function CreateDeptDialog({
  flat,
  onDone,
}: {
  flat: Array<{ id: string; name: string; depth: number }>;
  onDone: () => void;
}) {
  const t = useTranslations("departments");
  const tCommon = useTranslations("common");
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    const fd = new FormData(e.currentTarget);
    const parentId = String(fd.get("parentId") ?? "").trim();
    try {
      await adminApi.departments.create({
        name: String(fd.get("name") ?? ""),
        parentId: parentId || null,
      });
      toast.success(t("created"));
      setOpen(false);
      onDone();
    } catch (err) {
      toast.error(t("createFailure"), {
        description: (err as { message?: string }).message,
      });
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button>
            <Plus className="mr-1.5 h-4 w-4" aria-hidden />
            {t("create")}
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("createTitle")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">{t("name")}</Label>
            <Input id="name" name="name" required disabled={pending} />
          </div>
          <div className="space-y-2">
            <Label>{t("parent")}</Label>
            <Select name="parentId">
              <SelectTrigger>
                <SelectValue placeholder={t("root")} />
              </SelectTrigger>
              <SelectContent>
                {flat.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {"  ".repeat(d.depth) + d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
            <Button type="submit" loading={pending}>
              {tCommon("create")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditDeptDialog({
  dept,
  flat,
  onDone,
}: {
  dept: DeptTreeNode;
  flat: Array<{ id: string; name: string; depth: number }>;
  onDone: () => void;
}) {
  const t = useTranslations("departments");
  const tCommon = useTranslations("common");
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    const fd = new FormData(e.currentTarget);
    const parentId = String(fd.get("parentId") ?? "").trim();
    try {
      await adminApi.departments.update(dept.id, {
        name: String(fd.get("name") ?? ""),
        parentId: parentId || null,
      });
      toast.success(t("updated"));
      setOpen(false);
      onDone();
    } catch (err) {
      toast.error(t("updateFailure"), {
        description: (err as { message?: string }).message,
      });
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="ghost" size="sm" aria-label={t("edit")}>
            <Pencil className="h-3.5 w-3.5" aria-hidden />
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("editTitle", { name: dept.name })}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">{t("name")}</Label>
            <Input
              id="name"
              name="name"
              defaultValue={dept.name}
              required
              disabled={pending}
            />
          </div>
          <div className="space-y-2">
            <Label>{t("parent")}</Label>
            <Select name="parentId" defaultValue={dept.parentId ?? ""}>
              <SelectTrigger>
                <SelectValue placeholder={t("root")} />
              </SelectTrigger>
              <SelectContent>
                {flat
                  .filter((d) => d.id !== dept.id)
                  .map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {"  ".repeat(d.depth) + d.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
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
            <Button type="submit" loading={pending}>
              {tCommon("save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteDeptButton({
  dept,
  onDone,
}: {
  dept: DeptTreeNode;
  onDone: () => void;
}) {
  const t = useTranslations("departments");
  const tCommon = useTranslations("common");
  async function handle() {
    try {
      await adminApi.departments.remove(dept.id);
      toast.success(t("deleted"));
      onDone();
    } catch (err) {
      toast.error(t("deleteFailure"), {
        description: (err as { message?: string }).message,
      });
    }
  }
  return (
    <AlertDialog>
      <AlertDialogTrigger
        render={
          <Button variant="ghost" size="sm" aria-label={t("delete")}>
            <Trash2 className="h-3.5 w-3.5 text-destructive" aria-hidden />
          </Button>
        }
      />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("deleteTitle", { name: dept.name })}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("deleteDescription")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{tCommon("cancel")}</AlertDialogCancel>
          <AlertDialogAction onClick={handle}>{tCommon("delete")}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
