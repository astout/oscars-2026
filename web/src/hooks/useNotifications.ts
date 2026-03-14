import { useEffect, useRef, useCallback } from "react";
import { api } from "../api/client.js";

export interface AppNotification {
  notificationId: string;
  type: "category-awarded" | "category-up-next" | "leaderboard-change" | "wager-locked" | "wager-unlocked" | "wager-resolved";
  message: string;
  linkTo?: string;
  createdAt: string;
}

const POLL_INTERVAL = 10_000;
const MAX_AGE_MS = 5 * 60_000; // Ignore notifications older than 5 minutes

export function useNotifications(
  partyId: string | undefined,
  onNotification: (n: AppNotification) => void,
) {
  const seenRef = useRef(new Set<string>());
  const fetchingRef = useRef(false);
  const sinceRef = useRef(new Date().toISOString());
  const callbackRef = useRef(onNotification);
  callbackRef.current = onNotification;

  const poll = useCallback(async () => {
    if (!partyId || fetchingRef.current) return;
    fetchingRef.current = true;
    try {
      const notifications = await api.get<AppNotification[]>(
        `/parties/${partyId}/notifications?since=${encodeURIComponent(sinceRef.current)}`
      );
      const now = Date.now();
      for (const n of notifications) {
        if (seenRef.current.has(n.notificationId)) continue;
        if (now - new Date(n.createdAt).getTime() > MAX_AGE_MS) continue;
        seenRef.current.add(n.notificationId);
        callbackRef.current(n);
      }
      // Move the cursor forward
      if (notifications.length > 0) {
        const latest = notifications[notifications.length - 1];
        sinceRef.current = latest.createdAt;
      }
    } catch {
      // Fail silently — next interval will try again
    } finally {
      fetchingRef.current = false;
    }
  }, [partyId]);

  useEffect(() => {
    if (!partyId) return;
    // Reset on partyId change
    seenRef.current = new Set();
    sinceRef.current = new Date().toISOString();

    const id = setInterval(poll, POLL_INTERVAL);
    return () => clearInterval(id);
  }, [partyId, poll]);
}
