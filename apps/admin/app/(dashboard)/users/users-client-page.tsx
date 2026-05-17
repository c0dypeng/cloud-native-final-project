"use client";

import * as React from "react";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
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

const ROLE_LABEL: Record<string, string> = { employee: "員工", manager: "主管" };

export function UsersClientPage({ initialUsers, departments }: Props) {
  const router = useRouter();
  const [users] = useState<UserAdminView[]>(initialUsers);
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
          placeholder="搜尋姓名、信箱、部門…"
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
              <TableHead>姓名</TableHead>
              <TableHead className="hidden md:table-cell">信箱</TableHead>
              <TableHead>角色</TableHead>
              <TableHead className="hidden lg:table-cell">部門</TableHead>
              <TableHead className="hidden lg:table-cell">主管</TableHead>
              <TableHead>狀態</TableHead>
              <TableHead className="w-[60px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                  沒有符合條件的使用者
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
                      {ROLE_LABEL[u.role]}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                    {u.departmentName ?? "—"}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                    {u.managerName ?? "—"}
                  </TableCell>
                  <TableCell>
                    {u.isActive ? (
                      <Badge className="bg-success/15 text-success border-success/20">
                        啟用
                      </Badge>
                    ) : (
                      <Badge variant="outline">停用</Badge>
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
  const [editOpen, setEditOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="ghost" size="sm" aria-label="動作">
              <MoreVertical className="h-4 w-4" aria-hidden />
            </Button>
          }
        />
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setEditOpen(true)}>
            <Pencil className="mr-2 h-3.5 w-3.5" aria-hidden />
            編輯資料
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setResetOpen(true)}>
            <KeyRound className="mr-2 h-3.5 w-3.5" aria-hidden />
            重設密碼
          </DropdownMenuItem>
          {user.isActive && (
            <DropdownMenuItem
              variant="destructive"
              onClick={async () => {
                try {
                  await adminApi.users.softDelete(user.id);
                  toast.success("使用者已停用");
                  onChange();
                } catch (err) {
                  toast.error("停用失敗", {
                    description: (err as { message?: string }).message,
                  });
                }
              }}
            >
              <UserX className="mr-2 h-3.5 w-3.5" aria-hidden />
              停用帳號
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
      toast.success("使用者已建立");
      setOpen(false);
      onCreated();
    } catch (err) {
      toast.error("建立失敗", {
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
            新增使用者
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>新增使用者</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <FieldRow label="姓名" name="name" required disabled={pending} />
          <FieldRow
            label="電子郵件"
            name="email"
            type="email"
            required
            disabled={pending}
          />
          <FieldRow
            label="初始密碼"
            name="password"
            type="password"
            required
            placeholder="至少 8 個字元"
            disabled={pending}
          />
          <FieldRow
            label="電話"
            name="phone"
            placeholder="(選填) 0911-000-000"
            disabled={pending}
          />
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>角色</Label>
              <Select name="role" defaultValue="employee">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="employee">員工</SelectItem>
                  <SelectItem value="manager">主管</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>部門</Label>
              <Select name="departmentId">
                <SelectTrigger>
                  <SelectValue placeholder="未指定" />
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
            <Label>主管</Label>
            <Select name="managerId">
              <SelectTrigger>
                <SelectValue placeholder="未指定" />
              </SelectTrigger>
              <SelectContent>
                {users
                  .filter((u) => u.role === "manager" && u.isActive)
                  .map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name}（{u.departmentName ?? "—"}）
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
              取消
            </Button>
            <Button type="submit" loading={pending}>
              建立
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
      toast.success("已更新");
      onSaved();
    } catch (err) {
      toast.error("更新失敗", {
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
          <DialogTitle>編輯使用者</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <FieldRow
            label="姓名"
            name="name"
            defaultValue={user.name}
            required
            disabled={pending}
          />
          <FieldRow
            label="電話"
            name="phone"
            defaultValue={user.phone ?? ""}
            disabled={pending}
          />
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>角色</Label>
              <Select name="role" defaultValue={user.role}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="employee">員工</SelectItem>
                  <SelectItem value="manager">主管</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>部門</Label>
              <Select
                name="departmentId"
                defaultValue={user.departmentId ?? ""}
              >
                <SelectTrigger>
                  <SelectValue placeholder="未指定" />
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
            <Label>主管</Label>
            <Select name="managerId" defaultValue={user.managerId ?? ""}>
              <SelectTrigger>
                <SelectValue placeholder="未指定" />
              </SelectTrigger>
              <SelectContent>
                {users
                  .filter((u) => u.id !== user.id && u.role === "manager" && u.isActive)
                  .map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name}（{u.departmentName ?? "—"}）
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
              取消
            </Button>
            <Button type="submit" loading={pending}>
              儲存
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
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    const fd = new FormData(e.currentTarget);
    try {
      await adminApi.users.resetPassword(user.id, {
        password: String(fd.get("password") ?? ""),
      });
      toast.success("密碼已重設");
      onDone();
    } catch (err) {
      toast.error("重設失敗", {
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
          <DialogTitle>重設 {user.name} 的密碼</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <FieldRow
            label="新密碼"
            name="password"
            type="password"
            placeholder="至少 8 個字元"
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
              取消
            </Button>
            <Button type="submit" loading={pending}>
              重設
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
