import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, ChevronLeft, Clock, ShieldAlert, X } from "lucide-react";
import {
  cancelPageApproval,
  fetchPageApproval,
  respondToApproval,
  type PageApprovalInfo,
  type ApprovalState,
} from "../../lib/share/approval";
import {
  getNotchyPrefs,
  notchyShouldRender,
  setNotchyPrefs,
  subscribeNotchyPrefs,
  type NotchyPrefs,
} from "../../lib/prefs/notchy";
import { notchGlow, notchyLook } from "../../lib/prefs/notchyLook";

interface ApprovalBarProps {
  pageId: string;
  /** Drives which actions are offered; the server enforces them regardless. */
  isOwner: boolean;
  /** Only the focused pane renders it, so the handle can never double up. */
  active?: boolean;
  onToast?: (message: string) => void;
}

const SPRING = { type: "spring" as const, stiffness: 420, damping: 34, mass: 0.85 };
const SOFT = { type: "spring" as const, stiffness: 300, damping: 30, mass: 0.7 };

/**
 * Eight dockable positions. Deliberately not free-floating: a handle parked
 * mid-screen is furniture nobody can predict, so it snaps to the frame instead
 * and reads as part of the window rather than the page.
 */
const SLOTS = [
  "top-left", "top-center", "top-right",
  "middle-left", "middle-right",
  "bottom-left", "bottom-center", "bottom-right",
] as const;

type Slot = (typeof SLOTS)[number];

const isSlot = (v: unknown): v is Slot => typeof v === "string" && (SLOTS as readonly string[]).includes(v);

/** Which screen edge the handle clings to, used for rounding and card side. */
const SLOT_SIDE: Record<Slot, "left" | "right" | "top" | "bottom"> = {
  "top-left": "left",
  "top-center": "top",
  "top-right": "right",
  "middle-left": "left",
  "middle-right": "right",
  "bottom-left": "left",
  "bottom-center": "bottom",
  "bottom-right": "right",
};

/**
 * How far the handle is pulled back from its anchor, per axis. Expressed as a
 * CSS transform and applied via inline style rather than framer's `x`/`y`:
 * framer owns `transform` on an animated element, so it silently overwrote a
 * `style.transform` set alongside it, and animating between percentage strings
 * left the `*-left` slots stuck at `translateX(-50%)`.
 */
const SHIFT: Record<Slot, string> = {
  "top-left": "translate(0, 0)",
  "top-center": "translate(-50%, 0)",
  "top-right": "translate(-100%, 0)",
  "middle-left": "translate(0, -50%)",
  "middle-right": "translate(-100%, -50%)",
  "bottom-left": "translate(0, -100%)",
  "bottom-center": "translate(-50%, -100%)",
  "bottom-right": "translate(-100%, -100%)",
};

/**
 * Where the card sits relative to the handle's anchor. Every value keeps the
 * card fully on-screen and clear of the handle itself — an earlier version
 * opened the card on top of the bar it belonged to, which read as a broken
 * overlay rather than something connected to the handle.
 */
const CARD_SHIFT: Record<Slot, string> = {
  "top-left": "translate(0, 14px)",
  "top-center": "translate(-50%, 14px)",
  "top-right": "translate(-100%, 14px)",
  "middle-left": "translate(14px, -50%)",
  "middle-right": "translate(-100% - 14px, -50%)",
  "bottom-left": "translate(0, calc(-100% - 14px))",
  "bottom-center": "translate(-50%, calc(-100% - 14px))",
  "bottom-right": "translate(-100% - 14px, calc(-100% - 14px))",
};

/**
 * Left boundary of the page content area — i.e. just clear of the sidebar.
 *
 * Left-hand slots dock here rather than to the window edge, because parking a
 * handle on the viewport's left edge drops it straight on top of the page tree,
 * where it covers navigation and reads as part of it.
 *
 * Measured from the live element rather than a prop so it follows the sidebar
 * collapsing. Returns 0 when there is no left rail, so the handle simply falls
 * back to the window edge.
 */
function measureRail(w = window.innerWidth): number {
  if (typeof document === "undefined") return 0;
  // Take the leftmost real rail: pages can contain other, narrower asides that
  // must not be mistaken for the workspace sidebar.
  const rails = [...document.querySelectorAll("aside")]
    .map((el) => el.getBoundingClientRect())
    .filter((r) => r.width >= 40 && r.width <= w * 0.45 && r.left <= 40)
    .sort((a, b) => a.left - b.left);
  return rails.length ? Math.round(rails[0].right) : 0;
}

/**
 * The viewport point a slot pins the handle to. Both axes come from the slot
 * name: the horizontal axis from the suffix and the vertical from the prefix,
 * because the names are `<vertical>-<horizontal>`.
 */
function anchorFor(slot: Slot, rail: number, w = window.innerWidth, h = window.innerHeight): { x: number; y: number } {
  const x = slot.endsWith("left") ? rail : slot.endsWith("right") ? w : (rail + w) / 2;
  const y = slot.startsWith("top") ? 0 : slot.startsWith("bottom") ? h : h / 2;
  return { x, y };
}

function nearestSlot(x: number, y: number, rail: number): Slot {
  const w = window.innerWidth;
  const h = window.innerHeight;
  // Columns are measured across the region the handle may occupy, so dragging
  // to the far left still reads as "left" rather than falling into centre.
  const range = Math.max(1, w - rail);
  const rel = (x - rail) / range;
  const hx = rel < 0.34 ? "left" : rel > 0.66 ? "right" : "center";
  const hy = y / h;
  const row = hy < 0.34 ? "top" : hy > 0.66 ? "bottom" : "middle";
  if (hx === "center") return hy <= 0.5 ? "top-center" : "bottom-center";
  return `${row}-${hx}` as Slot;
}

type Tone = { text: string; dot: string; glow: string };

const TONES: Record<string, Tone> = {
  pending_approval: { text: "text-amber-300", dot: "bg-amber-400", glow: "shadow-amber-500/30" },
  approved: { text: "text-emerald-300", dot: "bg-emerald-400", glow: "shadow-emerald-500/30" },
  rejected: { text: "text-rose-300", dot: "bg-rose-400", glow: "shadow-rose-500/30" },
  draft: { text: "text-white/70", dot: "bg-white/50", glow: "" },
};


/**
 * Publishing gate, presented as a dockable edge handle.
 *
 * It began as an inline banner, then a top notch. Both were wrong for a thing
 * that is usually irrelevant: they either shoved the document around or
 * permanently occupied the strip you read from. So it lives at the frame edge
 * as a thin bar — near zero cost when idle — that widens on hover, springs a
 * card out on tap, and can be dragged to whichever corner suits the reader.
 *
 * Deliberately not role-driven. Whether somebody can approve is a property of
 * the reviewer list, so a co-owner without a reviewer entry sees exactly what an
 * editor sees.
 */
export default function ApprovalBar({ pageId, isOwner, active = true, onToast }: ApprovalBarProps) {
  const reduceMotion = useReducedMotion();
  const [info, setInfo] = useState<PageApprovalInfo | null>(null);
  const [busy, setBusy] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [note, setNote] = useState("");
  const [hovered, setHovered] = useState(false);
  const hoverTimer = useRef<number | null>(null);
  const showHover = () => {
    // Small hover intent: a 11px sliver that widens on contact makes the target
    // move out from under the pointer, so a click can miss the thing it aimed
    // at. Waiting a beat means the bar only grows for someone who meant to
    // engage with it.
    if (hoverTimer.current) window.clearTimeout(hoverTimer.current);
    hoverTimer.current = window.setTimeout(() => setHovered(true), 110);
  };
  const hideHover = () => {
    if (hoverTimer.current) window.clearTimeout(hoverTimer.current);
    setHovered(false);
  };
  useEffect(() => () => { if (hoverTimer.current) window.clearTimeout(hoverTimer.current); }, []);
  const [open, setOpen] = useState(false);
  const [dragging, setDragging] = useState(false);

  // Preferences live outside React state so the Settings panel can change them
  // while this component is mounted; the subscription is what re-renders here.
  const [prefs, setPrefs] = useState<NotchyPrefs>(() => getNotchyPrefs());
  useEffect(() => subscribeNotchyPrefs(setPrefs), []);

  const [slot, setSlot] = useState<Slot>(() => {
    const saved = getNotchyPrefs().slot;
    return isSlot(saved) ? saved : "middle-right";
  });
  // While dragging this follows the pointer freely; on release it springs to
  // the snapped slot, so the two never fight each other.
  const [free, setFree] = useState<{ x: number; y: number } | null>(null);

  const drag = useRef({ active: false, moved: false, sx: 0, sy: 0, ox: 0, oy: 0 });

  const load = useCallback(async () => {
    try {
      setInfo(await fetchPageApproval(pageId));
    } catch {
      // A page with no reviewers and no pending request is the common case;
      // failing to read it must not interrupt editing.
      setInfo(null);
    }
  }, [pageId]);

  useEffect(() => {
    void load();
  }, [load]);

  // Re-read when the tab regains focus. Somebody approving or withdrawing is
  // usually happening in a second window, so without this the handle would
  // offer a decision that no longer exists.
  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === "visible") void load();
    };
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [load]);

  const run = useCallback(
    async (action: () => Promise<void>, success: string, after?: () => void) => {
      setBusy(true);
      try {
        await action();
        await load();
        after?.();
        onToast?.(success);
      } catch (e) {
        onToast?.(e instanceof Error ? e.message : "Couldn't update approval.");
      } finally {
        setBusy(false);
      }
    },
    [load, onToast],
  );

  const state: ApprovalState = info?.approval_state ?? "draft";
  const canRespond =
    !!info?.my_review && info.my_review.status === "pending" && state === "pending_approval";
  const awaiting = info?.reviewers.filter((r) => r.status === "pending" && r.can_respond) ?? [];
  const stranded = info?.reviewers.filter((r) => !r.can_respond) ?? [];
  const approved = info?.reviewers.filter((r) => r.status === "approved") ?? [];
  const rejected = info?.reviewers.filter((r) => r.status === "rejected") ?? [];
  const stuck = state === "pending_approval" && awaiting.length === 0 && stranded.length > 0;

  const waitingOnOwner = isOwner && state === "pending_approval" && !canRespond;
  const needsAction = canRespond || waitingOnOwner;

  // A dismissal belongs to one specific request. `requested_at` is what makes a
  // request a distinct thing: same state, same reviewer response, but a later
  // timestamp means the owner opened a fresh request, and hiding that would
  // quietly swallow work the reader still has to do.
  //
  // The close is stored in preferences rather than local state so it survives a
  // reload and Settings can offer a way back. `open` is deliberately left alone
  // here — this also runs on first load, so resetting it would slam the card
  // shut the instant the data arrives and kill a tap made in that window.
  const fingerprint = `${state}:${info?.my_review?.status ?? "-"}:${info?.requested_at ?? "-"}`;

  // Measured reactively rather than once at mount: the sidebar can mount after
  // this component, collapse, or be resized, and a cached rail width leaves the
  // handle docked inside the page tree.
  const [rail, setRail] = useState(0);
  useEffect(() => {
    const measure = () => setRail(measureRail());
    measure();
    const firstRail = [...document.querySelectorAll("aside")][0];
    const ro = typeof ResizeObserver !== "undefined" && firstRail ? new ResizeObserver(measure) : null;
    if (ro && firstRail) ro.observe(firstRail);
    window.addEventListener("resize", measure);
    return () => {
      ro?.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  const snap = useMemo(() => anchorFor(slot, rail), [slot, rail]);
  const pos = free ?? snap;

  const handlePointerDown = (e: React.PointerEvent) => {
    // Ignore secondary buttons so a right-click never yanks the handle around.
    if (e.button !== 0) return;
    drag.current = { active: true, moved: false, sx: e.clientX, sy: e.clientY, ox: pos.x, oy: pos.y };
    // Capture is essential: the resting handle is ~11px wide, so the cursor
    // leaves it within a few pixels of movement and the element would stop
    // receiving pointermove entirely. Without this the drag silently dies.
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    e.preventDefault();
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!drag.current.active) return;
    const dx = e.clientX - drag.current.sx;
    const dy = e.clientY - drag.current.sy;
    if (!drag.current.moved && Math.hypot(dx, dy) < 4) return;
    if (!drag.current.moved) {
      drag.current.moved = true;
      setDragging(true);
    }
    // Clamp so the handle can never be thrown out of reach.
    setFree({
      x: Math.min(Math.max(drag.current.ox + dx, 0), window.innerWidth),
      y: Math.min(Math.max(drag.current.oy + dy, 0), window.innerHeight),
    });
  };

  const endDrag = (e: React.PointerEvent) => {
    if (!drag.current.active) return;
    const target = e.currentTarget as HTMLElement;
    target.releasePointerCapture?.(e.pointerId);
    const moved = drag.current.moved;
    drag.current.active = false;
    setDragging(false);
    // Released in both cases: on a tap the handle was never free, and on a drag
    // the snapped slot takes over from here.
    setFree(null);
    if (moved) {
      const next = nearestSlot(e.clientX, e.clientY, rail);
      setSlot(next);
      setNotchyPrefs({ slot: next });
      // Moving the handle is not a request to review, so the card stays shut.
      setOpen(false);
      return;
    }
    setOpen((v) => !v);
  };

  if (!active || prefs.hidden) return null;
  // "Only when needed" additionally retires a settled handle; the other modes
  // keep it parked so its position and glanceability are stable.
  const hasWork = canRespond || waitingOnOwner || stuck;
  const hasRequest = state !== "draft" || canRespond;
  if (!notchyShouldRender(prefs.visibility, hasRequest, hasWork)) return null;

  const tone = TONES[state] ?? TONES.draft;
  const look = notchyLook(prefs);
  const side = SLOT_SIDE[slot];

  const motionOff = prefs.motion === "off" || reduceMotion;
  const ease = prefs.motion === "gentle" ? "cubic-bezier(0.32, 0.72, 0, 1)" : "cubic-bezier(0.34, 1.56, 0.64, 1)";

  let title = "No review needed";
  let body = "This page has no approval request.";
  if (state === "pending_approval") {
    if (stuck) {
      title = "Approval stuck";
      body = `${stranded.map((r) => r.user_name || "A reviewer").join(", ")} lost access, so nobody can respond.`;
    } else if (canRespond) {
      title = "Needs your approval";
      body = "Approve before this page can be published, re-shared or locked.";
    } else {
      title = "Approval requested";
      body = `Waiting on ${awaiting.length === 1 ? awaiting[0].user_name || "a reviewer" : `${awaiting.length} reviewers`}.`;
    }
  } else if (state === "approved") {
    title = "Approved";
    body = `Signed off by ${approved.map((r) => r.user_name || "a reviewer").join(", ")}.`;
  } else if (state === "rejected") {
    title = "Changes requested";
    body = rejected[0]?.note || `${rejected[0]?.user_name || "A reviewer"} left a review.`;
  }

  const shortLabel = needsAction ? (canRespond ? "Review" : "Pending") : state === "approved" ? "Approved" : "Review";

  // Resting footprint follows the edge it clings to. A tall sliver reads well
  // on a vertical edge but hangs like a blob off the top of the window, so a
  // horizontal edge gets a wide, short island instead — which is also the
  // shape the reference uses there.
  const resting = side === "left" || side === "right"
    ? "h-[92px] w-[11px]"
    : "h-[40px] w-[132px]";
  const expanded = open || dragging || hovered ? "h-[52px] w-[168px] px-3" : resting;

  // Only the corners facing away from the frame stay rounded, so the bar reads
  // as cut into the edge rather than a loose pill floating on top of it.
  //
  // This has to be a real four-value radius, not Tailwind classes. The handle
  // also needs an inline radius so the morph scales it, and inline styles beat
  // utility classes — so classes here would be silently doing nothing and every
  // corner would stay round. That was invisible on the thin left/right slivers
  // but left the top and bottom bars looking detached from the edge.
  //
  // Derived from the slot rather than SLOT_SIDE, because a corner slot touches
  // *two* edges and must flatten two pairs of corners, not one.
  const flatTop = slot.startsWith("top-");
  const flatBottom = slot.startsWith("bottom-");
  const flatLeft = slot.endsWith("-left");
  const flatRight = slot.endsWith("-right");
  const cornerPx = look.radiusPx;
  const corner = (flat: boolean) => (flat ? "0px" : `${cornerPx}px`);
  const edgeRadius = `${corner(flatTop || flatLeft)} ${corner(flatTop || flatRight)} ${corner(flatBottom || flatRight)} ${corner(flatBottom || flatLeft)}`;

  const sendRejection = () => {
    void run(
      () => respondToApproval(pageId, "rejected", note.trim()),
      "Sent back to the owner.",
      () => { setRejecting(false); setNote(""); setOpen(false); },
    );
  };

  const decide = (label: string, onClick: () => void, primary = false) => (
    <motion.button
      whileTap={motionOff ? undefined : { scale: 0.9 }}
      onClick={onClick}
      disabled={busy}
      aria-label={label}
      title={label}
      className={[
        "grid h-9 w-9 place-items-center rounded-full transition disabled:opacity-40",
        primary
          ? "bg-white text-black hover:bg-white/90"
          : "bg-white/10 text-white/80 ring-1 ring-inset ring-white/15 hover:bg-white/[0.18]",
      ].join(" ")}
    >
      {primary ? <Check size={16} strokeWidth={2.6} /> : <X size={15} strokeWidth={2.6} />}
    </motion.button>
  );

  const card = (
    <motion.div
      role="status"
      aria-live="polite"
      initial={motionOff ? false : { opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={motionOff ? { opacity: 0 } : { opacity: 0, scale: 0.92 }}
      style={{ transformOrigin: side === "left" ? "left center" : side === "right" ? "right center" : "center bottom" }}
      className={[
        "pointer-events-auto overflow-hidden text-white ring-1",
        look.card,
        prefs.density === "compact" ? "w-[300px] max-w-[calc(100vw-32px)]" : "w-[336px] max-w-[calc(100vw-32px)]",
      ].join(" ")}
    >
      <div className={prefs.density === "compact" ? "flex items-center gap-2.5 px-3.5 pb-2.5 pt-3" : "flex items-center gap-3 px-4 pb-3 pt-4"}>
        <span className={`grid shrink-0 place-items-center rounded-full ${look.icon} ${tone.text} ${prefs.density === "compact" ? "h-7 w-7" : "h-8 w-8"}`}>
          {state === "approved" ? <Check size={15} strokeWidth={2.4} />
            : state === "rejected" ? <X size={14} strokeWidth={2.4} />
            : state === "pending_approval" ? <Clock size={15} strokeWidth={2.2} />
            : <ShieldAlert size={15} strokeWidth={2.2} />}
        </span>
        <div className="min-w-0 flex-1">
          {prefs.showTitle && (
            <div className={`truncate font-semibold tracking-[-0.01em] ${prefs.density === "compact" ? "text-[12.5px]" : "text-[13px]"}`}>{title}</div>
          )}
          {prefs.showStatus && (
            <div className="flex items-center gap-1.5 text-[11px] text-white/45">
              <span className={`h-1.5 w-1.5 rounded-full ${tone.dot}`} />
              Approval gate
              {prefs.showTimestamp && info?.requested_at && (
                <span className="text-white/30">· {new Date(info.requested_at).toLocaleDateString()}</span>
              )}
            </div>
          )}
        </div>
        <button
          onClick={() => setOpen(false)}
          aria-label="Minimise the notch card"
          title="Minimise"
          className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-white/40 transition hover:bg-white/10 hover:text-white"
        >
          <X size={14} strokeWidth={2.4} />
        </button>
      </div>

      <div className={prefs.density === "compact" ? "px-3.5 pb-3.5" : "px-4 pb-4"}>
        {prefs.showDetail && <p className="text-[12.5px] leading-relaxed text-white/65">{body}</p>}
        {prefs.showReviewers && info && info.reviewers.length > 0 && (
          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            {info.reviewers.map((r) => (
              <span
                key={r.user_id}
                className={[
                  "inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[10.5px] ring-1 ring-inset",
                  r.status === "approved" ? "bg-emerald-400/12 text-emerald-300 ring-emerald-400/20"
                    : r.status === "rejected" ? "bg-rose-400/12 text-rose-300 ring-rose-400/20"
                      : "bg-white/[0.07] text-white/55 ring-white/10",
                ].join(" ")}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-current" />
                {r.user_name || "Reviewer"}
              </span>
            ))}
          </div>
        )}
        {rejecting && (
          <motion.div
            layout
            initial={motionOff ? false : { opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            transition={motionOff ? { duration: 0 } : SPRING}
            className="overflow-hidden"
          >
            <textarea
              autoFocus
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="What needs changing?"
              className="mt-3 w-full resize-none rounded-[14px] bg-white/[0.07] p-3 text-[12.5px] leading-relaxed text-white outline-none ring-1 ring-inset ring-white/10 placeholder:text-white/35 focus:ring-white/25"
            />
          </motion.div>
        )}
      </div>

      {(canRespond || waitingOnOwner) && (
        <div className={[
          "flex items-center gap-2 border-t border-white/[0.08] px-4 py-3",
          look.footer,
          waitingOnOwner ? "justify-end" : "justify-end",
        ].join(" ")}>
          {waitingOnOwner && (
            <button
              disabled={busy}
              onClick={() => void run(() => cancelPageApproval(pageId), "Approval request withdrawn.", () => setOpen(false))}
              className="mr-auto rounded-full px-2.5 py-1 text-[11.5px] font-medium text-white/50 transition hover:bg-white/10 hover:text-white/80 disabled:opacity-40"
            >
              Withdraw request
            </button>
          )}
          {canRespond &&
            (rejecting ? (
              <>
                <button
                  onClick={() => setRejecting(false)}
                  className="rounded-full px-3 py-1.5 text-[12px] font-medium text-white/55 transition hover:bg-white/10 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  disabled={busy || !note.trim()}
                  onClick={sendRejection}
                  className="rounded-full bg-rose-500 px-4 py-1.5 text-[12px] font-semibold text-white transition hover:bg-rose-400 disabled:opacity-40"
                >
                  Send back
                </button>
              </>
            ) : (
              <>
                {prefs.allowReject && decide("Request changes", () => setRejecting(true))}
                {prefs.allowApprove &&
                  decide("Approve", () => void run(() => respondToApproval(pageId, "approved"), "Approved.", () => setOpen(false)), true)}
              </>
            ))}
        </div>
      )}
    </motion.div>
  );

  return createPortal(
    <div className="pointer-events-none fixed inset-0 z-[140]">
      {/* The card rides the handle's anchor so a drag carries it along. */}
      <AnimatePresence>
        {open && (
          <motion.div
            layout
            transition={motionOff ? { duration: 0 } : SPRING}
            className="absolute"
            style={{
              left: pos.x,
              top: pos.y,
              transform: dragging ? "translate(14px, 0)" : CARD_SHIFT[slot],
              // Topmost layer: the handle must stay visible and adjustable while
              // a modal (Settings) is open, otherwise changing a preference
              // gives no visible confirmation on the real control.
              zIndex: 140,
            }}
          >
            {card}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        transition={motionOff ? { duration: 0 } : SPRING}
        onMouseEnter={showHover}
        onMouseLeave={() => !dragging && hideHover()}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        role="button"
        tabIndex={0}
        data-testid="approval-handle"
        data-slot={slot}
        aria-label={needsAction ? "Approval needed. Open to review, or drag to move." : "Approval status. Open for details, or drag to move."}
        aria-expanded={open}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setOpen((v) => !v); }
        }}
        style={{
          left: pos.x,
          top: pos.y,
          // While dragging, follow the pointer exactly; on release, ease into
          // the snapped slot. The overshoot in this curve reads as a spring.
          transform: dragging ? "translate(0, 0)" : SHIFT[slot],
          transition: motionOff || dragging ? "none" : `left 340ms ${ease}, top 340ms ${ease}, transform 340ms ${ease}`,
        }}
        className="pointer-events-auto absolute flex touch-none select-none"
      >
        {/* The shape itself is a separate, layout-animated element. Keeping
            position on the outer node and the morph on the inner one is what
            lets the island swell and pinch the way a Dynamic Island does —
            animating `left`/`top` on the same node fights the morph and the
            corner radius stops tracking the width. */}
        <motion.div
          layout={!motionOff}
          transition={
            motionOff
              ? { duration: 0 }
              // Low damping is the whole effect. Framer's layout animation
              // scales the box between sizes, so an underdamped spring makes
              // the island visibly overshoot and settle — the liquid stretch —
              // instead of easing politely from one width to the next.
              : { type: "spring", stiffness: 320, damping: 20, mass: 0.9 }
          }
          style={{ borderRadius: edgeRadius }}
          className={[
            "relative flex items-center overflow-hidden text-white outline-none",
            look.bar,
            dragging ? "cursor-grabbing" : "cursor-grab",
            "ring-1 ring-inset ring-white/10 focus-visible:ring-2 focus-visible:ring-white/40",
            // Stable grab target. The bar widens on hover, so a pointer that
            // landed on the resting sliver would end up outside the grown
            // element. The ::before widens the hit region without touching
            // layout, and only exists at rest when the visual box is tiny.
            "before:absolute before:inset-x-[-7px] before:inset-y-[-3px] before:content-[''] before:pointer-events-auto",
            expanded,
          ].join(" ")}
        >
        <AnimatePresence initial={false}>
          {(hovered || open || dragging) && (
            <motion.span
              key="label"
              // Blur and squeeze on the way in, mirror it on the way out: the
              // island grows as one shape while its contents smear into it,
              // rather than a label simply appearing inside a finished pill.
              initial={motionOff ? false : { opacity: 0, x: 10, scaleX: 0.72, filter: "blur(7px)" }}
              animate={{ opacity: 1, x: 0, scaleX: 1, filter: "blur(0px)" }}
              exit={motionOff ? { opacity: 0 } : { opacity: 0, x: 10, scaleX: 0.72, filter: "blur(7px)" }}
              transition={
                motionOff
                  ? { duration: 0 }
                  : { type: "spring", stiffness: 340, damping: 26, mass: 0.7 }
              }
              style={{ transformOrigin: "left center" }}
              className="flex min-w-0 flex-1 items-center gap-2"
            >
              <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${tone.dot} ${needsAction && !motionOff ? "animate-pulse" : ""}`} />
              <span className="truncate text-[12px] font-medium">{shortLabel}</span>
              <ChevronLeft size={13} className="ml-auto shrink-0 text-white/40" />
            </motion.span>
          )}
        </AnimatePresence>
        {notchGlow(prefs.glow, needsAction || stuck) ? (
          <span className={`pointer-events-none absolute inset-0 ${notchGlow(prefs.glow, needsAction || stuck)}`} />
        ) : null}
        </motion.div>
      </motion.div>
    </div>,
    document.body,
  );
}
