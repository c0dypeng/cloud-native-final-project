"use client";

import { useRouter } from "next/navigation";
import type { SseEvent } from "@workspace/api-contracts";
import { useSse } from "@/hooks/use-sse";

/**
 * Refreshes the current Server Component tree when meaningful SSE events
 * arrive (new event, event closed, own report changed elsewhere).
 * Lives in the dashboard tree so client refetches happen automatically.
 */
export function DashboardRefreshOnSse() {
  const router = useRouter();
  useSse({
    onEvent: (e: SseEvent) => {
      if (
        e.type === "event_created" ||
        e.type === "event_closed"
      ) {
        router.refresh();
      }
    },
  });
  return null;
}
