import { AppSidebar } from "@/components/layout/app-sidebar";
import { SiteHeader } from "@/components/layout/site-header";
import { requireAuth } from "@/utils/auth/server";
import { apiFetch } from "@/utils/api";
import {
  SidebarInset,
  SidebarProvider,
} from "@workspace/ui/components/sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAuth();

  // Fetch profile from API to get the user's name (not in JWT payload).
  let name = user.email;
  try {
    const res = await apiFetch("/api/auth/me");
    if (res.ok) {
      const data = (await res.json()) as { user?: { name?: string } };
      if (data.user?.name) name = data.user.name;
    }
  } catch {
    // Network failure — fall back to email as display name.
  }

  return (
    <SidebarProvider>
      <AppSidebar variant="inset" user={{ name, email: user.email }} />
      <SidebarInset>
        <SiteHeader />
        <div className="flex-1 min-h-0 overflow-hidden">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
