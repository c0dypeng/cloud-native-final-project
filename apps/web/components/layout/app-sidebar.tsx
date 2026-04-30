"use client";

import Link from "next/link";
import {
  Settings,
  ShieldCheck,
  Home,
} from "lucide-react";
import { NavMain } from "@/components/layout/nav-main";
import { NavSecondary } from "@/components/layout/nav-secondary";
import { NavUser, type NavUserData } from "@/components/layout/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@workspace/ui/components/sidebar";

const NAV_ITEMS = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: Home,
  },
] as const;

const SECONDARY_NAV_ITEMS = [
  {
    title: "Settings",
    url: "/dashboard/settings",
    icon: Settings,
  },
] as const;

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  user: NavUserData;
}

export function AppSidebar({ user, ...props }: AppSidebarProps) {
  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link href="/dashboard">
                <ShieldCheck className="size-5" />
                <span className="text-base font-semibold">員工安全回報</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={NAV_ITEMS} />
        <NavSecondary items={SECONDARY_NAV_ITEMS} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
    </Sidebar>
  );
}
