"use client";

import { useEffect, useRef, useState } from "react";
import { sseEventSchema, type SseEvent } from "@workspace/api-contracts";

export type SseStatus = "connecting" | "open" | "closed" | "error";

interface UseSseOptions {
  onEvent?: (event: SseEvent) => void;
  enabled?: boolean;
}

type Listener = (event: SseEvent) => void;
type StatusListener = (status: SseStatus) => void;

const listeners = new Set<Listener>();
const statusListeners = new Set<StatusListener>();
let source: EventSource | null = null;
let currentStatus: SseStatus = "closed";
let reconnectAttempts = 0;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

function notifyStatus(next: SseStatus) {
  currentStatus = next;
  for (const fn of statusListeners) fn(next);
}

function openConnection() {
  if (source) return;
  notifyStatus("connecting");
  source = new EventSource("/api/sse");

  source.onopen = () => {
    reconnectAttempts = 0;
    notifyStatus("open");
  };

  source.onmessage = (msg: MessageEvent<string>) => {
    if (!msg.data) return;
    try {
      const parsed = sseEventSchema.parse(JSON.parse(msg.data));
      for (const fn of listeners) fn(parsed);
    } catch (err) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("[sse] parse failed", err);
      }
    }
  };

  source.onerror = () => {
    source?.close();
    source = null;
    notifyStatus("error");
    reconnectAttempts += 1;
    const delay = Math.min(1000 * 2 ** Math.min(reconnectAttempts, 5), 30_000);
    if (reconnectTimer) clearTimeout(reconnectTimer);
    reconnectTimer = setTimeout(() => {
      if (listeners.size > 0 || statusListeners.size > 0) openConnection();
    }, delay);
  };
}

function closeConnection() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  source?.close();
  source = null;
  reconnectAttempts = 0;
  notifyStatus("closed");
}

export function useSse(options: UseSseOptions = {}) {
  const { onEvent, enabled = true } = options;
  const [status, setStatus] = useState<SseStatus>(currentStatus);
  const cbRef = useRef(onEvent);

  useEffect(() => {
    cbRef.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    if (!enabled) return;
    const eventListener: Listener = (event) => cbRef.current?.(event);
    const statusListener: StatusListener = (s) => setStatus(s);
    listeners.add(eventListener);
    statusListeners.add(statusListener);
    setStatus(currentStatus);
    if (!source) openConnection();
    return () => {
      listeners.delete(eventListener);
      statusListeners.delete(statusListener);
      if (listeners.size === 0 && statusListeners.size === 0) {
        closeConnection();
      }
    };
  }, [enabled]);

  return { status };
}
