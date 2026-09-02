import React, { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Smile, X, Search } from "lucide-react"
import { supabase } from "../../lib/supabase"

const EMOJI_CATEGORIES = {
  "Smileys": ["😀", "😃", "😄", "😁", "😆", "😅", "🤣", "😂", "🙂", "😊", "😇", "🥰", "😍", "🤩", "😘", "😗", "😚", "😙", "🥲", "😋", "😛", "😜", "🤪", "😝", "🤑", "🤗", "🤭", "🤫", "🤔", "🫡", "🤐", "🤨", "😐", "😑", "😶", "🫥", "😏", "😒", "🙄", "😬", "🤥", "😌", "😔", "😪", "🤤", "😴", "😷"],
  "Gestures": ["👋", "🤚", "🖐️", "✋", "🖖", "👌", "🤌", "🤏", "✌️", "🤞", "🫰", "🤟", "🤘", "🤙", "👈", "👉", "👆", "🖕", "👇", "☝️", "🫵", "👍", "👎", "✊", "👊", "🤛", "🤜", "👏", "🙌", "🫶", "👐", "🤲", "🤝", "🙏"],
  "Objects": ["💻", "🖥️", "🖨️", "⌨️", "🖱️", "💾", "💿", "📷", "📹", "🎥", "📞", "📱", "📲", "☎️", "📟", "📠", "📺", "📻", "🎙️", "🎚️", "🎛️", "🧭", "⏱️", "⏰", "📡", "🔋", "💡", "🔦", "🕯️", "📚", "📖", "📝", "✏️", "🖊️", "🖋️", "📂", "📁"],
  "Symbols": ["❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "💔", "❤️‍🔥", "💕", "💞", "💓", "💗", "💖", "💘", "💝", "⭐", "🌟", "💫", "✨", "🔥", "💯", "🎉", "🎊", "✅", "❌", "⚠️", "🚫", "🔴", "🟠", "🟡", "🟢", "🔵", "🟣", "⚫", "⚪"],
  "Nature": ["🌿", "🍀", "🌱", "🌲", "🌳", "🌴", "🌵", "🌾", "🌺", "🌻", "🌹", "🌷", "🌸", "💐", "🍄", "🐶", "🐱", "🐭", "🐰", "🦊", "🐻", "🐼", "🐨", "🐯", "🦁", "🐮", "🐷", "🐸", "🐵", "🐔", "🐧", "🐦", "🦅", "🦆", "🦉", "🦇", "🐺", "🐗"],
}

interface IconPickerProps {
  value?: string | null
  onChange: (icon: string) => void
  size?: "sm" | "md" | "lg"
}

export function IconPicker({ value, onChange, size = "md" }: IconPickerProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [activeCategory, setActiveCategory] = useState("Smileys")
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [open])

  const allEmojis = Object.values(EMOJI_CATEGORIES).flat()
  const filtered = search
    ? allEmojis.filter(() => true) // Simple filter - just show all when searching
    : EMOJI_CATEGORIES[activeCategory as keyof typeof EMOJI_CATEGORIES] || []

  const sizeClasses = {
    sm: "w-7 h-7 text-sm",
    md: "w-9 h-9 text-lg",
    lg: "w-12 h-12 text-2xl",
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className={`${sizeClasses[size]} rounded-xl hover:bg-[var(--surface-2)] flex items-center justify-center transition cursor-pointer ${
          value ? "" : "border border-dashed border-[var(--border)] text-[var(--muted)]"
        }`}
      >
        {value || <Smile size={size === "sm" ? 12 : 16} />}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            className="absolute left-0 top-full mt-1 z-[180] w-72 bg-[var(--surface)] rounded-xl border border-[var(--border)] shadow-2xl overflow-hidden"
          >
            {/* Search */}
            <div className="p-2 border-b border-[var(--border)]/70">
              <div className="flex items-center gap-2 px-2 py-1.5 bg-[var(--surface-2)] rounded-lg">
                <Search size={12} className="text-[var(--muted)]" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search emoji..."
                  className="flex-1 bg-transparent text-[11px] text-[var(--text)] focus:outline-none"
                />
              </div>
            </div>

            {/* Categories */}
            {!search && (
              <div className="flex gap-0.5 px-2 py-1 border-b border-[var(--border)]/70 overflow-x-auto scrollbar-none">
                {Object.keys(EMOJI_CATEGORIES).map(cat => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`px-2 py-1 rounded-md text-[9px] font-semibold whitespace-nowrap transition cursor-pointer ${
                      activeCategory === cat
                        ? "bg-[var(--accent)] text-white"
                        : "text-[var(--muted)] hover:bg-[var(--surface-2)]"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}

            {/* Grid */}
            <div className="p-2 max-h-48 overflow-y-auto">
              <div className="grid grid-cols-8 gap-0.5">
                {filtered.map((emoji, i) => (
                  <button
                    key={i}
                    onClick={() => { onChange(emoji); setOpen(false) }}
                    className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[var(--surface-2)] transition text-base cursor-pointer"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
