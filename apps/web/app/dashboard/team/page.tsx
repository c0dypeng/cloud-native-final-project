import { getTranslations } from "next-intl/server";
import { requireRole } from "@/utils/auth/server";
import { apiServer } from "@/lib/api-server";
import { TeamCarePage } from "./team-care-page";

export const dynamic = "force-dynamic";

export default async function TeamPage() {
  await requireRole("manager");
  const t = await getTranslations("team");

  const { events } = await apiServer.events.list();
  const activeEvents = events.filter((e) => e.status === "active");
  const primaryEvent = activeEvents[0] ?? null;

  let teamStatus = null;
  if (primaryEvent) {
    try {
      teamStatus = await apiServer.manager.teamStatus(primaryEvent.id);
    } catch {
      teamStatus = null;
    }
  }

  const team = teamStatus
    ? null
    : await apiServer.manager.team().catch(() => ({ members: [] }));

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-10 space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
          {t("header")}
        </h1>
        <p className="text-sm text-muted-foreground">
          {primaryEvent
            ? t("eventLabel", { event: primaryEvent.title })
            : t("noEventLabel")}
        </p>
      </header>
      <TeamCarePage
        eventId={primaryEvent?.id ?? null}
        initialStatus={teamStatus}
        fallbackTeam={team?.members ?? null}
      />
    </div>
  );
}
