import { motion, AnimatePresence } from "framer-motion";
import { Info, Sparkles, AlertTriangle, Rocket, Wrench, Gift, Star, X, ArrowUpRight } from "lucide-react";
import { useInfoCards } from "@/hooks/useInfoCards";
import { renderMarkdownLite } from "@/components/ui/MarkdownLite";
import type { InfoCard } from "@/hooks/useInfoCards";

const ICONS: Record<string, typeof Info> = {
  info: Info,
  sparkles: Sparkles,
  alert: AlertTriangle,
  rocket: Rocket,
  maintenance: Wrench,
  gift: Gift,
  star: Star,
};

const ACCENTS: Record<string, { border: string; icon: string }> = {
  blue: { border: "border-blue-500/30", icon: "text-blue-500 bg-blue-500/10" },
  green: { border: "border-emerald-500/30", icon: "text-emerald-500 bg-emerald-500/10" },
  amber: { border: "border-amber-500/30", icon: "text-amber-500 bg-amber-500/10" },
  red: { border: "border-red-500/30", icon: "text-red-500 bg-red-500/10" },
  purple: { border: "border-violet-500/30", icon: "text-violet-500 bg-violet-500/10" },
};

function CardRow({ card, onDismiss }: { card: InfoCard; onDismiss: (id: string) => void }) {
  const Icon = ICONS[card.icon] ?? Info;
  const accent = ACCENTS[card.accent] ?? ACCENTS.blue;
  const hasMarkdown = /(^#|^\s*- |^\s*>|\*\*|`|\[[^\]]+\]\()/.test(card.body);
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className={`flex w-full items-start gap-3 rounded-xl border bg-card/95 px-4 py-3 shadow-sm backdrop-blur ${accent.border}`}
    >
      <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${accent.icon}`}>
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold leading-tight">{card.title}</p>
        {hasMarkdown ? (
          <div className="mt-0.5 max-h-40 space-y-1 overflow-y-auto text-xs leading-snug text-muted-foreground">
            {renderMarkdownLite(card.body)}
          </div>
        ) : (
          <p className="mt-0.5 whitespace-pre-line text-xs leading-snug text-muted-foreground">{card.body}</p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {card.action_url && (
          <a
            href={card.action_url}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/20"
          >
            {card.action_label || "Learn more"}
            <ArrowUpRight className="ml-0.5 inline h-3 w-3" />
          </a>
        )}
        {card.dismissible && (
          <button
            type="button"
            aria-label="Dismiss"
            onClick={() => onDismiss(card.id)}
            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </motion.div>
  );
}

// Announcement banners managed from the admin panel (info_cards table).
// Renders nothing when there are no active, non-dismissed cards.
export function InfoCardBanner() {
  const { cards, dismiss } = useInfoCards();
  if (cards.length === 0) return null;
  return (
    <div className="pointer-events-none absolute inset-x-0 top-2 z-40 flex flex-col items-center gap-2 px-4">
      <AnimatePresence initial={false}>
        {cards.map((card) => (
          <div key={card.id} className="pointer-events-auto w-full max-w-2xl">
            <CardRow card={card} onDismiss={dismiss} />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
}
