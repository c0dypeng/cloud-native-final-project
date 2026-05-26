import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { MainNav } from "@/components/nav/main-nav";
import { UserNav } from "@/components/nav/user-nav";
import { LanguageSwitcher } from "@/components/nav/language-switcher";
import { verifySession } from "@/lib/dal";
import { redirect } from "next/navigation";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await verifySession();
  if (!session) redirect("/login");
  const tApp = await getTranslations("app");
  const username = session.username;

  return (
    <div className="flex min-h-screen bg-muted/30">
      <aside className="hidden w-64 border-r bg-card lg:block">
        <div className="flex h-full flex-col">
          <div className="flex h-14 items-center border-b px-4 lg:h-16 lg:px-6">
            <Link href="/" className="flex items-center gap-2 font-semibold">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <ShieldCheck className="h-4 w-4" aria-hidden />
              </div>
              <div className="flex flex-col">
                <span className="text-base leading-tight">{tApp("name")}</span>
                <span className="text-[10px] font-normal text-muted-foreground leading-tight">
                  {tApp("subtitle")}
                </span>
              </div>
            </Link>
          </div>
          <div className="flex-1 overflow-auto py-4">
            <div className="px-3 py-2">
              <MainNav />
            </div>
          </div>
        </div>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex h-14 items-center gap-4 border-b bg-background/80 backdrop-blur px-4 lg:h-16 lg:px-6 sticky top-0 z-30">
          <div className="lg:hidden flex items-center gap-2 font-semibold">
            <ShieldCheck className="h-5 w-5" aria-hidden />
            {tApp("name")}
          </div>
          <div className="flex-1" />
          <LanguageSwitcher />
          <UserNav username={username} />
        </header>
        <main className="flex-1 overflow-auto p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
