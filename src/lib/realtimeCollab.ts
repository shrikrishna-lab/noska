import { supabase } from "./supabase";
import type { RealtimeChannel } from "@supabase/supabase-js";
import type { CollaborationStatus } from "../../types/enums";

export interface CollabUser {
  userId: string;
  userName: string;
  userAvatar: string;
  userColor: string;
}

interface PresenceTrackPayload extends CollabUser {
  pageId: string;
  status: CollaborationStatus | string;
  currentBlockId?: string | null;
  onlineAt: number;
}

interface PresenceUser extends Partial<CollabUser> {
  id: string;
  [key: string]: unknown;
}

/** Payload shapes broadcast/emitted per event name — kept as a lookup
 * record rather than a strict discriminated union, since `_emit`/`on` are
 * called generically by event-name string throughout this file and the
 * event name itself is what selects the shape (not a `type` field on the
 * payload, as a discriminated union would expect). */
interface CollabEventMap {
  "workspace:join": Record<string, never>;
  "workspace:leave": Record<string, never>;
  "presence:sync": { pageId: string; users: PresenceUser[] };
  "presence:join": { pageId: string; user: PresenceUser };
  "presence:leave": { pageId: string; userId: string };
  "cursor:remove": { pageId: string; userId: string };
  "cursor:move": { pageId: string; userId: string; x: number; y: number; targetBlockId?: string | null; [key: string]: unknown };
  "selection:change": { pageId: string; userId: string; blockId?: string; start?: number; end?: number; [key: string]: unknown };
  "block:edit": { pageId: string; userId: string; blockId: string; [key: string]: unknown };
  "block:edit-stop": { pageId: string; userId: string; blockId: string; [key: string]: unknown };
  "canvas:node-move": { pageId: string; userId: string; nodeId: string; x: number; y: number; [key: string]: unknown };
  "canvas:transform": { pageId: string; userId: string; z: number; x: number; y: number; [key: string]: unknown };
  "typing": { pageId: string; userId: string; [key: string]: unknown };
}

type CollabEventName = keyof CollabEventMap;
type CollabListener<E extends CollabEventName> = (data: CollabEventMap[E]) => void;

interface SelectionRange {
  blockId?: string;
  startOffset?: number;
  endOffset?: number;
  text?: string;
}

class RealtimeCollab {
  private channels = new Map<string, RealtimeChannel>();
  private userId: string | null = null;
  private userName: string | null = null;
  private userAvatar: string | null = null;
  private userColor: string | null = null;
  private listeners = new Map<string, Set<(data: unknown) => void>>();
  private _joinedWorkspace = false;

  // Throttle state for高频 events (cursor, typing)
  private _lastCursorSend = 0;
  private _lastTypingSend = 0;
  private static readonly CURSOR_THROTTLE_MS = 50; // 20fps max
  private static readonly TYPING_THROTTLE_MS = 1000; // 1 per second

  private static _getColor(id: string): string {
    const colors = [
      "#7c3aed", "#ec4899", "#06b6d4", "#f59e0b", "#10b981",
      "#ef4444", "#8b5cf6", "#14b8a6", "#f97316", "#6366f1",
    ];
    let hash = 0;
    for (let i = 0; i < id.length; i++) hash = (hash << 5) - hash + id.charCodeAt(i);
    return colors[Math.abs(hash) % colors.length];
  }

  initUser(userId: string | null, userName: string | null, userAvatar: string | null): void {
    this.userId = userId || `anon-${Math.random().toString(36).slice(2, 11)}`;
    this.userName = userName || "Anonymous";
    this.userAvatar = userAvatar || "👤";
    this.userColor = RealtimeCollab._getColor(this.userId);
    const stored = localStorage.getItem("noska_workspace_joined");
    this._joinedWorkspace = stored === "true";
  }

  getUser(): CollabUser {
    return {
      userId: this.userId as string,
      userName: this.userName as string,
      userAvatar: this.userAvatar as string,
      userColor: this.userColor as string,
    };
  }

  isJoined(): boolean {
    return this._joinedWorkspace;
  }

  joinWorkspace(): void {
    this._joinedWorkspace = true;
    localStorage.setItem("noska_workspace_joined", "true");
    this._emit("workspace:join", {});
  }

  leaveWorkspace(): void {
    this._joinedWorkspace = false;
    localStorage.setItem("noska_workspace_joined", "false");
    this.destroy();
    this._emit("workspace:leave", {});
  }

  private _channel(key: string): RealtimeChannel | undefined {
    return this.channels.get(key);
  }
  private _setChannel(key: string, ch: RealtimeChannel): void {
    this.channels.set(key, ch);
  }
  private _delChannel(key: string): void {
    const ch = this.channels.get(key);
    if (ch) supabase.removeChannel(ch);
    this.channels.delete(key);
  }

  on<E extends CollabEventName>(event: E, cb: CollabListener<E>): () => void {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(cb as (data: unknown) => void);
    return () => this.listeners.get(event)?.delete(cb as (data: unknown) => void);
  }

  private _emit<E extends CollabEventName>(event: E, data: CollabEventMap[E]): void {
    this.listeners.get(event)?.forEach((cb) => {
      try {
        cb(data);
      } catch (e) {
        console.warn("realtimeCollab: listener error", e);
      }
    });
  }

  joinPage(pageId: string): void {
    if (!this._joinedWorkspace) return;
    if (this._channel(`presence:${pageId}`) || this._channel(`broadcast:${pageId}`)) return;

    const pres = supabase.channel(`presence:${pageId}`, {
      config: { presence: { key: this.userId as string } },
    });

    pres.on("presence", { event: "sync" }, () => {
      const state = pres.presenceState<PresenceUser>();
      const users = Object.entries(state).map(([id, sessions]) => ({ id, ...sessions[0] }));
      this._emit("presence:sync", { pageId, users });
    });

    pres.on("presence", { event: "join" }, ({ key, newPresences }) => {
      this._emit("presence:join", { pageId, user: { id: key, ...(newPresences[0] as object) } });
    });

    pres.on("presence", { event: "leave" }, ({ key }) => {
      this._emit("presence:leave", { pageId, userId: key });
      this._emit("cursor:remove", { pageId, userId: key });
    });

    pres.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        try {
          // Minimal presence payload - only essential fields
          const payload = {
            userId: this.userId as string,
            name: this.userName as string, // Shortened
            color: this.userColor as string, // Shortened
            pageId,
            status: "viewing",
          };
          await pres.track(payload);
        } catch (e) {
          console.warn("realtimeCollab: track failed", e);
        }
      }
    });

    this._setChannel(`presence:${pageId}`, pres);

    const bc = supabase.channel(`broadcast:${pageId}`);

    bc.on("broadcast", { event: "cursor" }, ({ payload }) => {
      if (payload.userId !== this.userId) this._emit("cursor:move", { pageId, ...payload });
    });

    bc.on("broadcast", { event: "selection" }, ({ payload }) => {
      if (payload.userId !== this.userId) this._emit("selection:change", { pageId, ...payload });
    });

    bc.on("broadcast", { event: "block:edit" }, ({ payload }) => {
      if (payload.userId !== this.userId) this._emit("block:edit", { pageId, ...payload });
    });

    bc.on("broadcast", { event: "block:edit-stop" }, ({ payload }) => {
      if (payload.userId !== this.userId) this._emit("block:edit-stop", { pageId, ...payload });
    });

    bc.on("broadcast", { event: "canvas:node-move" }, ({ payload }) => {
      if (payload.userId !== this.userId) this._emit("canvas:node-move", { pageId, ...payload });
    });

    bc.on("broadcast", { event: "canvas:transform" }, ({ payload }) => {
      if (payload.userId !== this.userId) this._emit("canvas:transform", { pageId, ...payload });
    });

    bc.on("broadcast", { event: "typing" }, ({ payload }) => {
      if (payload.userId !== this.userId) this._emit("typing", { pageId, ...payload });
    });

    bc.subscribe((status) => {
      if (status === "SUBSCRIBED") return;
      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        console.warn(`realtimeCollab: broadcast channel ${pageId} subscription failed: ${status}`);
      }
    });
    this._setChannel(`broadcast:${pageId}`, bc);
  }

  leavePage(pageId: string): void {
    this._delChannel(`presence:${pageId}`);
    this._delChannel(`broadcast:${pageId}`);
  }

  async updateStatus(pageId: string, status: string, blockId: string | null = null): Promise<void> {
    const ch = this._channel(`presence:${pageId}`);
    if (!ch) return;
    try {
      const payload: PresenceTrackPayload = {
        userId: this.userId as string,
        userName: this.userName as string,
        userAvatar: this.userAvatar as string,
        userColor: this.userColor as string,
        pageId,
        status,
        currentBlockId: blockId,
        onlineAt: Date.now(),
      };
      await ch.track(payload);
    } catch (e) {
      console.warn("realtimeCollab: status track failed", e);
    }
  }

  sendCursor(pageId: string, x: number, y: number, targetBlockId: string | null = null): void {
    // Throttle cursor updates to reduce egress (20fps max)
    const now = Date.now();
    if (now - this._lastCursorSend < RealtimeCollab.CURSOR_THROTTLE_MS) return;
    this._lastCursorSend = now;

    const ch = this._channel(`broadcast:${pageId}`);
    if (!ch) return;
    // Minimal payload - only essential fields
    ch.send({
      type: "broadcast",
      event: "cursor",
      payload: {
        userId: this.userId,
        x,
        y,
        targetBlockId, // Keep full name for compatibility
      },
    }).catch((e) => {
      console.warn("realtimeCollab: sendCursor failed", e);
    });
  }

  sendSelection(pageId: string, range?: SelectionRange | null): void {
    const ch = this._channel(`broadcast:${pageId}`);
    if (!ch) return;
    // Minimal payload - only essential fields
    ch.send({
      type: "broadcast",
      event: "selection",
      payload: {
        userId: this.userId,
        blockId: range?.blockId,
        start: range?.startOffset, // Shortened
        end: range?.endOffset, // Shortened
      },
    }).catch((e) => {
      console.warn("realtimeCollab: sendSelection failed", e);
    });
  }

  sendBlockEdit(pageId: string, blockId: string): void {
    const ch = this._channel(`broadcast:${pageId}`);
    if (!ch) return;
    // Minimal payload
    ch.send({
      type: "broadcast",
      event: "block:edit",
      payload: { userId: this.userId, blockId },
    }).catch((e) => {
      console.warn("realtimeCollab: sendBlockEdit failed", e);
    });
  }

  sendBlockEditStop(pageId: string, blockId: string): void {
    const ch = this._channel(`broadcast:${pageId}`);
    if (!ch) return;
    // Minimal payload
    ch.send({
      type: "broadcast",
      event: "block:edit-stop",
      payload: { userId: this.userId, blockId },
    }).catch((e) => {
      console.warn("realtimeCollab: sendBlockEditStop failed", e);
    });
  }

  sendCanvasNodeMove(pageId: string, nodeId: string, x: number, y: number): void {
    const ch = this._channel(`broadcast:${pageId}`);
    if (!ch) return;
    // Minimal payload
    ch.send({
      type: "broadcast",
      event: "canvas:node-move",
      payload: { userId: this.userId, nodeId, x, y },
    }).catch((e) => {
      console.warn("realtimeCollab: sendCanvasNodeMove failed", e);
    });
  }

  sendCanvasTransform(pageId: string, zoom: number, panX: number, panY: number): void {
    const ch = this._channel(`broadcast:${pageId}`);
    if (!ch) return;
    // Minimal payload
    ch.send({
      type: "broadcast",
      event: "canvas:transform",
      payload: { userId: this.userId, z: zoom, x: panX, y: panY }, // Shortened
    }).catch((e) => {
      console.warn("realtimeCollab: sendCanvasTransform failed", e);
    });
  }

  sendTyping(pageId: string): void {
    // Throttle typing indicators to 1 per second
    const now = Date.now();
    if (now - this._lastTypingSend < RealtimeCollab.TYPING_THROTTLE_MS) return;
    this._lastTypingSend = now;

    const ch = this._channel(`broadcast:${pageId}`);
    if (!ch) return;
    // Minimal payload
    ch.send({
      type: "broadcast",
      event: "typing",
      payload: { userId: this.userId, p: pageId }, // Shortened field names
    }).catch((e) => {
      console.warn("realtimeCollab: sendTyping failed", e);
    });
  }

  destroy(): void {
    for (const key of this.channels.keys()) this._delChannel(key);
    this.channels.clear();
    this.listeners.clear();
  }
}

const realtimeInstance = new RealtimeCollab();

export const realtimeCollab = realtimeInstance;
