import { useState, useEffect, useCallback, useRef } from "react";
import { realtimeCollab } from "../lib/realtimeCollab";
import type { CollaborationStatus } from "../../types/enums";

interface PresenceUser {
  id?: string;
  userId?: string;
  [key: string]: unknown;
}

export function usePresence(pageId: string | null | undefined) {
  const [users, setUsers] = useState<PresenceUser[]>([]);
  const [ownStatus, setOwnStatus] = useState<CollaborationStatus | string>("viewing");
  const pageRef = useRef(pageId);
  pageRef.current = pageId;

  useEffect(() => {
    if (!pageId || !realtimeCollab.isJoined()) return;

    const unsubs = [
      realtimeCollab.on("presence:sync", ({ pageId: pid, users: u }) => {
        if (pid === pageRef.current) {
          setUsers(u.filter((us) => us.userId !== realtimeCollab.getUser().userId && (us.userId || us.id)));
        }
      }),
      realtimeCollab.on("presence:join", ({ pageId: pid, user }) => {
        if (pid === pageRef.current && user.userId !== realtimeCollab.getUser().userId && (user.userId || user.id)) {
          setUsers((prev) => {
            if (prev.some((u) => u.id === user.id || u.userId === user.userId)) return prev;
            return [...prev, user];
          });
        }
      }),
      realtimeCollab.on("presence:leave", ({ pageId: pid, userId }) => {
        if (pid === pageRef.current) {
          setUsers((prev) => prev.filter((u) => u.userId !== userId && u.id !== userId));
        }
      }),
    ];

    realtimeCollab.joinPage(pageId);

    return () => {
      unsubs.forEach((fn) => fn());
      realtimeCollab.leavePage(pageId);
    };
  }, [pageId]);

  const setStatus = useCallback((status: string) => {
    setOwnStatus(status);
    realtimeCollab.updateStatus(pageRef.current as string, status);
  }, []);

  return { users, ownStatus, setStatus, onlineCount: users.length + 1 };
}
