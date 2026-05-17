import type { Event, Report } from "@workspace/api-contracts";
import { SafetyReportCard } from "./safety-report-card";

interface ActiveEventsListProps {
  events: Event[];
  reports: Report[];
}

export function ActiveEventsList({ events, reports }: ActiveEventsListProps) {
  const byEvent = new Map(reports.map((r) => [r.eventId, r]));
  return (
    <div className="space-y-4">
      {events.map((event) => (
        <SafetyReportCard
          key={event.id}
          event={event}
          currentReport={byEvent.get(event.id) ?? null}
        />
      ))}
    </div>
  );
}
