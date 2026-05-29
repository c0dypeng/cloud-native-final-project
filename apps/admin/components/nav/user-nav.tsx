"use client";

import Link from "next/link";
import { LogOut, UserCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@workspace/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import { Avatar, AvatarFallback } from "@workspace/ui/components/avatar";
import { logout } from "@/lib/actions";

interface Props {
  username: string;
}

export function UserNav({ username }: Props) {
  const tRoles = useTranslations("roles");
  const tNav = useTranslations("nav");
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="relative h-8 w-8 rounded-full p-0"
          aria-label={username}
        >
          <Avatar className="h-8 w-8 bg-primary text-primary-foreground">
            <AvatarFallback className="bg-primary text-primary-foreground">
              {username.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{username}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {tRoles("admin")}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link
            href="/profile"
            className="flex w-full items-center cursor-pointer"
          >
            <UserCircle className="mr-2 h-4 w-4" />
            <span>{tNav("profile")}</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <form action={logout}>
          <DropdownMenuItem asChild>
            <button
              type="submit"
              className="flex w-full items-center cursor-pointer"
            >
              <LogOut className="mr-2 h-4 w-4" />
              <span>{tNav("logout")}</span>
            </button>
          </DropdownMenuItem>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
