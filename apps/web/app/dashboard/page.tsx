import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { requireUser } from "@/utils/auth/server";
import { apiServer } from "@/lib/api-server";
import { NoActiveEvent } from "@/components/safety/no-active-event";
import { ActiveEventsList } from "@/components/safety/active-events-list";
import {
  TeamStatusSummary,
  TeamStatusSummarySkeleton,
} from "@/components/safety/team-status-summary";
import { UnreportedTeamList } from "@/components/safety/unreported-team-list";
import { NeedHelpBanner } from "@/components/safety/need-help-banner";
import { ReminderToast } from "@/components/safety/reminder-toast";
import { DashboardRefreshOnSse } from "@/components/safety/dashboard-refresh-on-sse";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await requireUser();
  const t = await getTranslations("dashboard");

  const { events } = await apiServer.events.list();
  const activeEvents = events.filter((e) => e.status === "active");

  const ownReports = await Promise.all(
    activeEvents.map(async (e) => {
      try {
        const { reports } = await apiServer.reports.list(e.id);
        return reports.find((r) => r.userId === user.id) ?? null;
      } catch {
        return null;
      }
    }),
  );
  const reports = ownReports.filter(
    (r): r is NonNullable<typeof r> => r !== null,
  );

  const primaryEvent = activeEvents[0];

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6 lg:px-8 lg:py-10 space-y-6">
      <DashboardRefreshOnSse />
      <ReminderToast />

      {user.role === "manager" && <NeedHelpBanner />}

      <header className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
          {t("greeting", { name: user.name })}
        </h1>
        <p className="text-sm text-muted-foreground">
          {user.role === "manager"
            ? t("managerSubtitle")
            : t("employeeSubtitle")}
        </p>
      </header>

      {activeEvents.length === 0 ? (
        <NoActiveEvent />
      ) : (
        <ActiveEventsList events={activeEvents} reports={reports} />
      )}

      {user.role === "manager" && primaryEvent && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold tracking-tight">
            {t("teamStatusFor", { event: primaryEvent.title })}
          </h2>
          <Suspense fallback={<TeamStatusSummarySkeleton />}>
            <ManagerWidgets eventId={primaryEvent.id} />
          </Suspense>
        </section>
      )}
    </div>
  );
}

async function ManagerWidgets({ eventId }: { eventId: string }) {
  try {
    const [stats, unreported] = await Promise.all([
      apiServer.stats.get(eventId),
      apiServer.stats.unreported(eventId),
    ]);
    return (
      <div className="grid gap-4 lg:grid-cols-2">
        <TeamStatusSummary eventId={eventId} initialStats={stats} />
        <UnreportedTeamList eventId={eventId} initial={unreported} />
      </div>
    );
  } catch {
    return null;
  }
}
