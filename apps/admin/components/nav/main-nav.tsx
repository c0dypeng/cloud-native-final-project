"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  Home,
  AlertCircle,
  Users,
  Network,
  ChartBar,
} from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";

export function MainNav() {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const routes = [
    { label: t("overview"), href: "/", icon: Home },
    { label: t("events"), href: "/events", icon: AlertCircle },
    { label: t("users"), href: "/users", icon: Users },
    { label: t("departments"), href: "/departments", icon: Network },
    { label: t("reports"), href: "/reports", icon: ChartBar },
  ];
  return (
    <nav className="flex flex-col space-y-1">
      {routes.map((route) => {
        const Icon = route.icon;
        const isActive =
          pathname === route.href ||
          (route.href !== "/" && pathname.startsWith(route.href));
        return (
          <Link
            key={route.href}
            href={route.href}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all hover:bg-accent",
              isActive
                ? "bg-accent text-accent-foreground font-medium"
                : "text-muted-foreground",
            )}
          >
            <Icon className="h-4 w-4" />
            {route.label}
          </Link>
        );
      })}
    </nav>
  );
}
