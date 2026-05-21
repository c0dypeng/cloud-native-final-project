"use client";

import * as React from "react";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  Plus,
  KeyRound,
  UserX,
  MoreVertical,
  Pencil,
} from "lucide-react";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { Input } from "@workspace/ui/components/input";
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog";
import { Label } from "@workspace/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import type {
  Department,
  UserAdminView,
  UserCreateInput,
  UserUpdateInput,
} from "@workspace/api-contracts";
import { adminApi } from "@/lib/api-client";

interface Props {
  initialUsers: UserAdminView[];
  departments: Department[];
}

export function UsersClientPage({ initialUsers, departments }: Props) {
  const t = useTranslations("users");
  const tCommon = useTranslations("common");
  const tRoles = useTranslations("roles");
  const tStatus = useTranslations("status");
  const router = useRouter();
  const users = initialUsers;
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.departmentName ?? "").toLowerCase().includes(q),
    );
  }, [users, query]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Input
          type="search"
          placeholder={t("searchPlaceholder")}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="max-w-xs h-9"
        />
        <CreateUserDialog
          departments={departments}
          users={users}
          onCreated={() => router.refresh()}
        />
      </div>

      <div className="rounded-lg border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("columns.name")}</TableHead>
              <TableHead className="hidden md:table-cell">{t("columns.email")}</TableHead>
              <TableHead>{t("columns.role")}</TableHead>
              <TableHead className="hidden lg:table-cell">{t("columns.department")}</TableHead>
              <TableHead className="hidden lg:table-cell">{t("columns.manager")}</TableHead>
              <TableHead>{t("columns.status")}</TableHead>
              <TableHead className="w-[60px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                  {t("empty")}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{u.name}</p>
                      <p className="text-xs text-muted-foreground md:hidden">
                        {u.email}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm">
                    {u.email}
                  </TableCell>
                  <TableCell>
                    <Badge variant={u.role === "manager" ? "default" : "secondary"}>
                      {tRoles(u.role)}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                    {u.departmentName ?? tCommon("none")}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                    {u.managerName ?? tCommon("none")}
                  </TableCell>
                  <TableCell>
                    {u.isActive ? (
                      <Badge className="bg-success/15 text-success border-success/20">
                        {tStatus("enabled")}
                      </Badge>
                    ) : (
                      <Badge variant="outline">{tStatus("disabled")}</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <UserRowActions user={u} departments={departments} users={users} onChange={() => router.refresh()} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function UserRowActions({
  user,
  departments,
  users,
  onChange,
}: {
  user: UserAdminView;
  departments: Department[];
  users: UserAdminView[];
  onChange: () => void;
}) {
  const t = useTranslations("users");
  const tCommon = useTranslations("common");
  const [editOpen, setEditOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="ghost" size="sm" aria-label={tCommon("actions")}>
              <MoreVertical className="h-4 w-4" aria-hidden />
            </Button>
          }
        />
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setEditOpen(true)}>
            <Pencil className="mr-2 h-3.5 w-3.5" aria-hidden />
            {t("edit")}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setResetOpen(true)}>
            <KeyRound className="mr-2 h-3.5 w-3.5" aria-hidden />
            {t("resetPassword")}
          </DropdownMenuItem>
          {user.isActive && (
            <DropdownMenuItem
              variant="destructive"
              onClick={async () => {
                try {
                  await adminApi.users.softDelete(user.id);
                  toast.success(t("disabled"));
                  onChange();
                } catch (err) {
                  toast.error(t("disableFailure"), {
                    description: (err as { message?: string }).message,
                  });
                }
              }}
            >
              <UserX className="mr-2 h-3.5 w-3.5" aria-hidden />
              {t("disableAccount")}
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <EditUserDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        user={user}
        departments={departments}
        users={users}
        onSaved={() => {
          setEditOpen(false);
          onChange();
        }}
      />
      <ResetPasswordDialog
        open={resetOpen}
        onOpenChange={setResetOpen}
        user={user}
        onDone={() => setResetOpen(false)}
      />
    </>
  );
}

function CreateUserDialog({
  departments,
  users,
  onCreated,
}: {
  departments: Department[];
  users: UserAdminView[];
  onCreated: () => void;
}) {
  const t = useTranslations("users");
  const tCommon = useTranslations("common");
  const tRoles = useTranslations("roles");
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    const fd = new FormData(e.currentTarget);
    const body: UserCreateInput = {
      email: String(fd.get("email") ?? ""),
      name: String(fd.get("name") ?? ""),
      password: String(fd.get("password") ?? ""),
      role: String(fd.get("role") ?? "employee") as "employee" | "manager",
      departmentId: nonEmpty(fd.get("departmentId")),
      managerId: nonEmpty(fd.get("managerId")),
      phone: nonEmpty(fd.get("phone")),
      locale: "zh-TW",
    };
    try {
      await adminApi.users.create(body);
      toast.success(t("created"));
      setOpen(false);
      onCreated();
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
          <DialogTitle>{t("create")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <FieldRow label={t("fields.name")} name="name" required disabled={pending} />
          <FieldRow
            label={t("fields.email")}
            name="email"
            type="email"
            required
            disabled={pending}
          />
          <FieldRow
            label={t("fields.password")}
            name="password"
            type="password"
            required
            placeholder={t("passwordPlaceholder")}
            disabled={pending}
          />
          <FieldRow
            label={t("fields.phone")}
            name="phone"
            placeholder={t("phonePlaceholder")}
            disabled={pending}
          />
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>{t("fields.role")}</Label>
              <Select name="role" defaultValue="employee">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="employee">{tRoles("employee")}</SelectItem>
                  <SelectItem value="manager">{tRoles("manager")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("fields.department")}</Label>
              <Select name="departmentId">
                <SelectTrigger>
                  <SelectValue placeholder={tCommon("notSpecified")} />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>{t("fields.manager")}</Label>
            <Select name="managerId">
              <SelectTrigger>
                <SelectValue placeholder={tCommon("notSpecified")} />
              </SelectTrigger>
              <SelectContent>
                {users
                  .filter((u) => u.role === "manager" && u.isActive)
                  .map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name} ({u.departmentName ?? tCommon("none")})
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

function EditUserDialog({
  open,
  onOpenChange,
  user,
  departments,
  users,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  user: UserAdminView;
  departments: Department[];
  users: UserAdminView[];
  onSaved: () => void;
}) {
  const t = useTranslations("users");
  const tCommon = useTranslations("common");
  const tRoles = useTranslations("roles");
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    const fd = new FormData(e.currentTarget);
    const body: UserUpdateInput = {
      name: String(fd.get("name") ?? ""),
      role: String(fd.get("role") ?? user.role) as "employee" | "manager",
      departmentId: nonEmpty(fd.get("departmentId")),
      managerId: nonEmpty(fd.get("managerId")),
      phone: nonEmpty(fd.get("phone")),
    };
    try {
      await adminApi.users.update(user.id, body);
      toast.success(t("updated"));
      onSaved();
    } catch (err) {
      toast.error(t("updateFailure"), {
        description: (err as { message?: string }).message,
      });
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("editTitle")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <FieldRow
            label={t("fields.name")}
            name="name"
            defaultValue={user.name}
            required
            disabled={pending}
          />
          <FieldRow
            label={t("fields.phone")}
            name="phone"
            defaultValue={user.phone ?? ""}
            disabled={pending}
          />
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>{t("fields.role")}</Label>
              <Select name="role" defaultValue={user.role}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="employee">{tRoles("employee")}</SelectItem>
                  <SelectItem value="manager">{tRoles("manager")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("fields.department")}</Label>
              <Select
                name="departmentId"
                defaultValue={user.departmentId ?? ""}
              >
                <SelectTrigger>
                  <SelectValue placeholder={tCommon("notSpecified")} />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>{t("fields.manager")}</Label>
            <Select name="managerId" defaultValue={user.managerId ?? ""}>
              <SelectTrigger>
                <SelectValue placeholder={tCommon("notSpecified")} />
              </SelectTrigger>
              <SelectContent>
                {users
                  .filter((u) => u.id !== user.id && u.role === "manager" && u.isActive)
                  .map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name} ({u.departmentName ?? tCommon("none")})
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
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

function ResetPasswordDialog({
  open,
  onOpenChange,
  user,
  onDone,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  user: UserAdminView;
  onDone: () => void;
}) {
  const t = useTranslations("users");
  const tCommon = useTranslations("common");
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    const fd = new FormData(e.currentTarget);
    try {
      await adminApi.users.resetPassword(user.id, {
        password: String(fd.get("password") ?? ""),
      });
      toast.success(t("passwordReset"));
      onDone();
    } catch (err) {
      toast.error(t("resetFailure"), {
        description: (err as { message?: string }).message,
      });
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("resetTitle", { name: user.name })}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <FieldRow
            label={t("fields.newPassword")}
            name="password"
            type="password"
            placeholder={t("passwordPlaceholder")}
            required
            disabled={pending}
          />
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={pending}
            >
              {tCommon("cancel")}
            </Button>
            <Button type="submit" loading={pending}>
              {t("resetPassword")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function FieldRow({
  label,
  name,
  type = "text",
  ...rest
}: {
  label: string;
  name: string;
  type?: string;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "name" | "type">) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} type={type} {...rest} />
    </div>
  );
}

function nonEmpty(val: FormDataEntryValue | null): string | null {
  if (!val) return null;
  const s = String(val).trim();
  return s ? s : null;
}
