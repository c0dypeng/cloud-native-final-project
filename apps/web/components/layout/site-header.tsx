import { SidebarTrigger } from "@workspace/ui/components/sidebar";
import { ConnectionStatus } from "@/components/layout/connection-status";
import { LanguageSwitcher } from "@/components/layout/language-switcher";

interface SiteHeaderProps {
  title?: string;
}

export function SiteHeader({ title }: SiteHeaderProps) {
  return (
    <header className="flex shrink-0 items-center gap-3 py-3 px-4 lg:px-6 border-b bg-background/80 backdrop-blur-sm sticky top-0 z-30">
      <SidebarTrigger />
      <div className="flex-1 min-w-0">
        {title ? (
          <h2 className="text-base font-semibold tracking-tight truncate">
            {title}
          </h2>
        ) : null}
      </div>
      <ConnectionStatus />
      <LanguageSwitcher />
    </header>
  );
}
