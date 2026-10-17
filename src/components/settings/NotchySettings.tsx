import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  getNotchyPrefs,
  setNotchyPrefs,
  NOTCHY_GLOW_OPTIONS,
  NOTCHY_MOTION_OPTIONS,
  NOTCHY_SHAPE_OPTIONS,
  NOTCHY_SURFACE_OPTIONS,
  NOTCHY_TEXTURE_OPTIONS,
  NOTCHY_VISIBILITY_OPTIONS,
  type NotchyPrefs,
  type NotchySurface,
  type NotchyTexture,
  type NotchyShape,
  type NotchyGlow,
  type NotchyVisibility,
} from "../../lib/prefs/notchy";
import { notchyLook } from "../../lib/prefs/notchyLook";

/**
 * Live preview. Not a mock-up: it draws from the same look module the real
 * handle uses and mirrors the same decision buttons, so nothing shown here can
 * drift from what appears on the page.
 */
function NotchyPreview({ prefs }: { prefs: NotchyPrefs }) {
  const [open, setOpen] = useState(false);
  const look = notchyLook(prefs);
  const bothActions = prefs.allowApprove || prefs.allowReject;

  return (
    <div className="relative flex min-h-[188px] items-center justify-center overflow-hidden rounded-2xl border border-[#e8e4db] bg-[#faf8f3] px-4 dark:border-white/10 dark:bg-white/[0.02]">
      <div className="absolute inset-0 bg-[radial-gradient(60%_60%_at_50%_0%,rgba(0,0,0,0.05),transparent)] dark:bg-[radial-gradient(60%_60%_at_50%_0%,rgba(255,255,255,0.06),transparent)]" />

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94 }}
            transition={{ type: "spring", stiffness: 420, damping: 34 }}
            className={`absolute z-10 w-[300px] max-w-full overflow-hidden text-white ring-1 ${look.card} ${look.cardRadius}`}
          >
            {prefs.showTitle && (
              <div className="px-4 pb-1 pt-3.5 text-[12.5px] font-semibold tracking-tight">Needs your approval</div>
            )}
            {prefs.showStatus && (
              <div className="flex items-center gap-1.5 px-4 pb-2 text-[11px] text-white/45">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                Approval gate
                {prefs.showTimestamp && <span className="text-white/30">· today</span>}
              </div>
            )}
            {prefs.showDetail && (
              <div className="px-4 pb-3 text-[12px] leading-relaxed text-white/65">
                Approve before this page can be published, re-shared or locked.
              </div>
            )}
            {prefs.showReviewers && (
              <div className="flex flex-wrap gap-1.5 px-4 pb-3">
                {["Bob", "Cara"].map((n) => (
                  <span
                    key={n}
                    className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.07] px-2 py-1 text-[10.5px] text-white/55 ring-1 ring-inset ring-white/10"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-current" />
                    {n}
                  </span>
                ))}
              </div>
            )}
            {bothActions && (
              <div className={`flex items-center justify-end gap-2 border-t border-white/[0.08] px-4 py-3 ${look.footer}`}>
                {prefs.allowReject && (
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-white/10 text-white/80 ring-1 ring-inset ring-white/15">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
                      <path d="M18 6 6 18M6 6l12 12" />
                    </svg>
                  </span>
                )}
                {prefs.allowApprove && (
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-white text-black">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                  </span>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* The bar itself */}
      <motion.button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Collapse preview" : "Expand preview"}
        animate={{ opacity: 1, scale: 1 }}
        className={`relative flex cursor-pointer items-center gap-2.5 px-3 text-white ring-1 ${look.bar} ${look.barRadius} ${open ? "h-[52px] w-[168px]" : "h-[46px] w-[46px] justify-center"}`}
      >
        <span className={`grid shrink-0 place-items-center rounded-full ${look.icon} ${open ? "h-8 w-8" : "h-7 w-7"}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${prefs.visibility === "needed" ? "bg-white/40" : "bg-amber-400"}`} />
        </span>
        {open && (
          <span className="min-w-0 flex-1 text-left">
            <span className="block truncate text-[12px] font-medium">Review</span>
          </span>
        )}
      </motion.button>
    </div>
  );
}

function SurfaceSwatch({ value, active }: { value: NotchySurface; active: boolean }) {
  const look: Record<NotchySurface, string> = {
    glass: "bg-black/60 backdrop-blur-sm",
    solid: "bg-black",
    matte: "bg-[#1a1a1d]",
    outline: "bg-black/25 ring-1 ring-white/30",
  };
  return (
    <span
      className={[
        "h-9 w-9 shrink-0 rounded-[11px] ring-1 transition",
        look[value],
        active ? "ring-2 ring-[#1c1b18] dark:ring-white" : "ring-black/10 dark:ring-white/15",
      ].join(" ")}
    />
  );
}

function OptionRow<T extends string>({
  options,
  value,
  onChange,
}: {
  options: Array<{ value: T; label: string; hint: string }>;
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(opt.value)}
            className={[
              "rounded-2xl border p-3 text-left transition",
              active
                ? "border-[#1c1b18] bg-[#f6f3ec] dark:border-white/70 dark:bg-white/[0.08]"
                : "border-[#e8e4db] bg-white hover:bg-[#faf8f3] dark:border-white/10 dark:bg-white/[0.02] dark:hover:bg-white/[0.05]",
            ].join(" ")}
          >
            <span className="block text-[12.5px] font-semibold text-[#1c1b18] dark:text-white">{opt.label}</span>
            <span className="mt-0.5 block text-[10.5px] leading-snug text-[#8a857c] dark:text-white/45">{opt.hint}</span>
          </button>
        );
      })}
    </div>
  );
}

function Toggle({
  label,
  hint,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={[
        "flex w-full items-center justify-between gap-4 rounded-xl px-3.5 py-2.5 text-left transition",
        "hover:bg-[#faf8f3] dark:hover:bg-white/[0.04]",
        disabled ? "opacity-40" : "",
      ].join(" ")}
    >
      <span className="min-w-0">
        <span className="block text-[13px] font-medium text-[#1c1b18] dark:text-white">{label}</span>
        {hint && <span className="mt-0.5 block text-[11px] text-[#8a857c] dark:text-white/45">{hint}</span>}
      </span>
      <span
        className={[
          "relative h-[26px] w-[44px] shrink-0 rounded-full transition-colors duration-200",
          checked ? "bg-[#1c1b18] dark:bg-white" : "bg-black/15 dark:bg-white/15",
        ].join(" ")}
      >
        <motion.span
          className="absolute top-[3px] h-5 w-5 rounded-full bg-white shadow-sm dark:bg-[#1c1b18]"
          animate={{ left: checked ? 21 : 3 }}
          transition={{ type: "spring", stiffness: 500, damping: 34 }}
        />
      </span>
    </button>
  );
}

const section = "space-y-3";
const heading = "text-[15px] font-semibold text-[#1c1b18] dark:text-white";
const sub = "mt-0.5 text-[11.5px] text-[#8a857c] dark:text-white/50";
const card = "rounded-2xl border border-[#e8e4db] bg-white p-1.5 dark:border-white/10 dark:bg-white/[0.02]";

/**
 * Settings for the Notchy — the dockable approval handle on the frame.
 *
 * Its own panel because everything here is about one widget: when it appears,
 * what it says, what it can do and how it is finished. The preview above is
 * interactive and shares the real handle's styling, and the handle itself stays
 * on screen above this modal, so every change is visible where it matters.
 */
export default function NotchySettings() {
  const [prefs, setPrefs] = useState<NotchyPrefs>(() => getNotchyPrefs());
  useEffect(() => setPrefs(getNotchyPrefs()), []);

  const update = (patch: Partial<NotchyPrefs>) => setPrefs(setNotchyPrefs(patch));
  const noDecisions = !prefs.allowApprove && !prefs.allowReject;

  return (
    <div className="max-w-2xl space-y-7 pb-16 font-sans">
      <div className="pt-1">
        <h1 className="text-[28px] font-normal tracking-tight font-serif text-[#1c1b18] dark:text-white">Notchy</h1>
        <p className="mt-1 text-xs text-[#706c64] dark:text-white/60">
          The approval handle docked to the edge of your workspace. Drag it to any corner or edge, hover
          to reveal it, click to review.
        </p>
      </div>

      <NotchyPreview prefs={prefs} />

      {/* Visibility — presented as switches but behaving as a single choice.
          Three independent checkboxes would be nonsense (you cannot be "only
          when needed" and "always" at once), so the group carries radiogroup
          semantics and exactly one row is ever on. */}
      <section className={section}>
        <div>
          <h2 className={heading}>When it appears</h2>
          <p className={sub}>One of these is always active — they are different modes, not separate switches.</p>
        </div>
        <div className={card} role="radiogroup" aria-label="When the notch bar appears">
          {NOTCHY_VISIBILITY_OPTIONS.map((opt) => (
            <div
              key={opt.value}
              className="relative border-b border-[#e8e4db] last:border-0 dark:border-white/10"
            >
              <Toggle
                label={opt.label}
                hint={opt.hint}
                checked={prefs.visibility === opt.value}
                onChange={() => update({ visibility: opt.value as NotchyVisibility })}
              />
              {opt.value === "always" && (
                <span className="pointer-events-none absolute right-[74px] top-3 rounded-full bg-[#ede8df] px-2 py-0.5 text-[10px] font-semibold text-[#78716c] dark:bg-white/10 dark:text-white/70">
                  Recommended
                </span>
              )}
            </div>
          ))}
        </div>
        <p className="px-1 text-[11.5px] leading-relaxed text-[#8a857c] dark:text-white/50">
          The bar only appears on a page that has an approval request —{" "}
          <span className="font-medium text-[#706c64] dark:text-white/65">Always</span> shows it in any state,{" "}
          <span className="font-medium text-[#706c64] dark:text-white/65">Only when needed</span> waits for a decision
          that is yours, and{" "}
          <span className="font-medium text-[#706c64] dark:text-white/65">Permanent</span> keeps it on pages with no
          approval at all.
        </p>
      </section>

      {/* Actions */}
      <section className="space-y-2">
        <div>
          <h2 className={heading}>Actions</h2>
          <p className={sub}>Which decisions the card offers. Turning both off makes the handle read-only.</p>
        </div>
        <div className={card}>
          <Toggle
            label="Allow approving"
            hint="Reviewers can sign off from the handle"
            checked={prefs.allowApprove}
            onChange={(v) => update({ allowApprove: v })}
          />
          <Toggle
            label="Allow requesting changes"
            hint="Reviewers can send a page back with a note"
            checked={prefs.allowReject}
            onChange={(v) => update({ allowReject: v })}
          />
        </div>
        {noDecisions && (
          <p className="px-1 text-[11.5px] leading-relaxed text-amber-600 dark:text-amber-400/80">
            With both actions off, decisions can only be made by opening the page's share settings.
          </p>
        )}
      </section>

      {/* Info */}
      <section className="space-y-2">
        <div>
          <h2 className={heading}>Information shown</h2>
          <p className={sub}>Trim the card down to just what you need.</p>
        </div>
        <div className={card}>
          <Toggle label="Title" checked={prefs.showTitle} onChange={(v) => update({ showTitle: v })} />
          <Toggle
            label="Status line"
            hint="The small state indicator"
            checked={prefs.showStatus}
            onChange={(v) => update({ showStatus: v })}
          />
          <Toggle
            label="Detail"
            hint="What is blocked and who it is waiting on"
            checked={prefs.showDetail}
            onChange={(v) => update({ showDetail: v })}
          />
          <Toggle
            label="Reviewers"
            hint="Who has responded, as chips"
            checked={prefs.showReviewers}
            onChange={(v) => update({ showReviewers: v })}
          />
          <Toggle label="Requested date" checked={prefs.showTimestamp} onChange={(v) => update({ showTimestamp: v })} />
        </div>
      </section>

      {/* Graphics */}
      <section className={section}>
        <div>
          <h2 className={heading}>Graphics</h2>
          <p className={sub}>The finish, the texture over it, and the shape of the handle.</p>
        </div>

        <div className="grid grid-cols-4 gap-2">
          {NOTCHY_SURFACE_OPTIONS.map((opt) => {
            const active = prefs.surface === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => update({ surface: opt.value as NotchySurface })}
                className={[
                  "rounded-2xl border p-2.5 text-left transition",
                  active
                    ? "border-[#1c1b18] bg-[#f6f3ec] dark:border-white/70 dark:bg-white/[0.08]"
                    : "border-[#e8e4db] bg-white hover:bg-[#faf8f3] dark:border-white/10 dark:bg-white/[0.02] dark:hover:bg-white/[0.05]",
                ].join(" ")}
              >
                <SurfaceSwatch value={opt.value} active={active} />
                <span className="mt-2 block text-[12px] font-semibold text-[#1c1b18] dark:text-white">{opt.label}</span>
              </button>
            );
          })}
        </div>

        <div className="pt-1">
          <h3 className="text-[12.5px] font-semibold text-[#706c64] dark:text-white/70">Texture</h3>
          <div className="mt-2">
            <OptionRow
              options={NOTCHY_TEXTURE_OPTIONS}
              value={prefs.texture}
              onChange={(v: NotchyTexture) => update({ texture: v })}
            />
          </div>
        </div>

        <div className="pt-1">
          <h3 className="text-[12.5px] font-semibold text-[#706c64] dark:text-white/70">Shape</h3>
          <div className="mt-2">
            <OptionRow
              options={NOTCHY_SHAPE_OPTIONS}
              value={prefs.shape}
              onChange={(v: NotchyShape) => update({ shape: v })}
            />
          </div>
        </div>

        <div className="pt-1">
          <h3 className="text-[12.5px] font-semibold text-[#706c64] dark:text-white/70">Glow while pending</h3>
          <div className="mt-2">
            <OptionRow
              options={NOTCHY_GLOW_OPTIONS}
              value={prefs.glow}
              onChange={(v: NotchyGlow) => update({ glow: v })}
            />
          </div>
        </div>

        <div className={card}>
          <Toggle
            label="Compact"
            hint="Shorter card with tighter spacing"
            checked={prefs.density === "compact"}
            onChange={(v) => update({ density: v ? "compact" : "regular" })}
          />
        </div>
      </section>

      {/* Motion */}
      <section className={section}>
        <div>
          <h2 className={heading}>Motion</h2>
          <p className={sub}>How the handle opens, snaps and settles.</p>
        </div>
        <OptionRow options={NOTCHY_MOTION_OPTIONS} value={prefs.motion} onChange={(v) => update({ motion: v })} />
      </section>

      {/* Position */}
      <section className={section}>
        <div>
          <h2 className={heading}>Position</h2>
          <p className={sub}>
            You can also just drag the handle — it snaps to the nearest corner or edge and remembers where
            you put it.
          </p>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {(["top-left", "top-center", "top-right", "middle-left", "middle-right", "bottom-left", "bottom-center", "bottom-right"] as const).map((s) => {
            const active = prefs.slot === s;
            return (
              <button
                key={s}
                type="button"
                aria-pressed={active}
                onClick={() => update({ slot: s })}
                className={[
                  "rounded-xl border px-2 py-2 text-[11px] font-medium capitalize transition",
                  active
                    ? "border-[#1c1b18] bg-[#f6f3ec] text-[#1c1b18] dark:border-white/70 dark:bg-white/[0.08] dark:text-white"
                    : "border-[#e8e4db] bg-white text-[#706c64] hover:bg-[#faf8f3] dark:border-white/10 dark:bg-white/[0.02] dark:text-white/55 dark:hover:bg-white/[0.05]",
                ].join(" ")}
              >
                {s.replace("-", " ")}
              </button>
            );
          })}
        </div>
      </section>

      {/* Hiding the bar is deliberately here rather than on the card: closing a card
          you are reading should minimise it, not make the whole handle vanish
          and leave no obvious way back. */}
      <section className="space-y-2">
        <div className={card}>
          <Toggle
            label="Hide the notch bar"
            hint="Removes the handle completely, across reloads"
            checked={prefs.hidden}
            onChange={(v) => update({ hidden: v })}
          />
        </div>
      </section>
    </div>
  );
}