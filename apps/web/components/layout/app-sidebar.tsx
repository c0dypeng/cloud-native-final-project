"use client";

import Link from "next/link";
import { Home, Settings, ShieldCheck, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import type { UserPublic } from "@workspace/api-contracts";
import { NavMain } from "@/components/layout/nav-main";
import { NavSecondary } from "@/components/layout/nav-secondary";
import { NavUser } from "@/components/layout/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@workspace/ui/components/sidebar";

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  user: UserPublic;
}

export function AppSidebar({ user, ...props }: AppSidebarProps) {
  const tNav = useTranslations("nav");
  const tApp = useTranslations("app");
  const navItems = [
    { title: tNav("dashboard"), url: "/dashboard", icon: Home },
    ...(user.role === "manager"
      ? ([{ title: tNav("team"), url: "/dashboard/team", icon: Users }] as const)
      : []),
  ];
  const secondaryItems = [
    { title: tNav("settings"), url: "/dashboard/settings", icon: Settings },
  ];
  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link href="/dashboard">
                <ShieldCheck className="size-5" />
                <span className="text-base font-semibold">{tApp("name")}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navItems} />
        <NavSecondary items={secondaryItems} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
    </Sidebar>
  );
}
