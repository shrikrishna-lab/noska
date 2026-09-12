"use client"

import * as React from "react"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

function Grid({
  cellSize = 12,
  strokeWidth = 1,
  patternOffset = [0, 0],
  className,
}: {
  cellSize?: number
  strokeWidth?: number
  patternOffset?: [number, number]
  className?: string
}) {
  const id = React.useId()

  return (
    <svg
      className={cn(
        "pointer-events-none absolute inset-0 text-black/10",
        className,
      )}
      width="100%"
      height="100%"
    >
      <defs>
        <pattern
          id={`grid-${id}`}
          x={patternOffset[0] - 1}
          y={patternOffset[1] - 1}
          width={cellSize}
          height={cellSize}
          patternUnits="userSpaceOnUse"
        >
          <path
            d={`M ${cellSize} 0 L 0 0 0 ${cellSize}`}
            fill="transparent"
            stroke="currentColor"
            strokeWidth={strokeWidth}
          />
        </pattern>
      </defs>
      <rect fill={`url(#grid-${id})`} width="100%" height="100%" />
    </svg>
  )
}

export type BannerTheme = "emerald" | "violet" | "amber" | "blue" | "dark" | "rose" | "custom"

export interface BannerProps {
  show: boolean
  onHide?: () => void
  icon?: React.ReactNode
  title: React.ReactNode
  action?: {
    label: string
    onClick: () => void
  }
  learnMoreUrl?: string
  theme?: BannerTheme
  className?: string
  style?: React.CSSProperties
  customBg?: string
  customTextColor?: string
  showCloseButton?: boolean
}

const THEME_STYLES: Record<BannerTheme, { container: string; border: string; iconBox: string; actionBtn: string; closeBtn: string; text: string; link: string }> = {
  emerald: {
    container: "border-green-600/20 bg-gradient-to-r from-lime-100/90 via-emerald-100/85 to-teal-100/90 text-gray-900",
    border: "border-green-600/20",
    iconBox: "border-green-600/50 bg-white/70 text-green-800 shadow-[inset_0_0_1px_1px_#fff]",
    actionBtn: "border-green-700/40 bg-white/40 text-gray-900 hover:bg-green-600/15 active:bg-green-600/25 shadow-sm",
    closeBtn: "text-green-700 hover:text-green-950",
    text: "text-gray-900",
    link: "text-gray-700 hover:text-black",
  },
  violet: {
    container: "border-purple-500/20 bg-gradient-to-r from-purple-100/90 via-fuchsia-100/85 to-pink-100/90 text-gray-900",
    border: "border-purple-500/20",
    iconBox: "border-purple-500/50 bg-white/70 text-purple-800 shadow-[inset_0_0_1px_1px_#fff]",
    actionBtn: "border-purple-700/40 bg-white/40 text-gray-900 hover:bg-purple-600/15 active:bg-purple-600/25 shadow-sm",
    closeBtn: "text-purple-700 hover:text-purple-950",
    text: "text-gray-900",
    link: "text-purple-900 hover:text-black",
  },
  amber: {
    container: "border-amber-500/20 bg-gradient-to-r from-amber-100/90 via-orange-100/85 to-yellow-100/90 text-gray-900",
    border: "border-amber-500/20",
    iconBox: "border-amber-500/50 bg-white/70 text-amber-800 shadow-[inset_0_0_1px_1px_#fff]",
    actionBtn: "border-amber-700/40 bg-white/40 text-gray-900 hover:bg-amber-600/15 active:bg-amber-600/25 shadow-sm",
    closeBtn: "text-amber-700 hover:text-amber-950",
    text: "text-gray-900",
    link: "text-amber-900 hover:text-black",
  },
  blue: {
    container: "border-sky-500/20 bg-gradient-to-r from-sky-100/90 via-blue-100/85 to-indigo-100/90 text-gray-900",
    border: "border-sky-500/20",
    iconBox: "border-sky-500/50 bg-white/70 text-sky-800 shadow-[inset_0_0_1px_1px_#fff]",
    actionBtn: "border-sky-700/40 bg-white/40 text-gray-900 hover:bg-sky-600/15 active:bg-sky-600/25 shadow-sm",
    closeBtn: "text-sky-700 hover:text-sky-950",
    text: "text-gray-900",
    link: "text-sky-900 hover:text-black",
  },
  rose: {
    container: "border-rose-500/20 bg-gradient-to-r from-rose-100/90 via-pink-100/85 to-red-100/90 text-gray-900",
    border: "border-rose-500/20",
    iconBox: "border-rose-500/50 bg-white/70 text-rose-800 shadow-[inset_0_0_1px_1px_#fff]",
    actionBtn: "border-rose-700/40 bg-white/40 text-gray-900 hover:bg-rose-600/15 active:bg-rose-600/25 shadow-sm",
    closeBtn: "text-rose-700 hover:text-rose-950",
    text: "text-gray-900",
    link: "text-rose-900 hover:text-black",
  },
  dark: {
    container: "border-white/10 bg-gradient-to-r from-zinc-950 via-zinc-900 to-zinc-950 text-white shadow-lg",
    border: "border-white/10",
    iconBox: "border-white/20 bg-white/10 text-white shadow-[inset_0_0_1px_1px_rgba(255,255,255,0.1)]",
    actionBtn: "border-white/20 bg-white/10 text-white hover:bg-white/20 active:bg-white/30 shadow-sm",
    closeBtn: "text-zinc-400 hover:text-white",
    text: "text-white",
    link: "text-zinc-300 hover:text-white",
  },
  custom: {
    container: "border-black/10 text-gray-900",
    border: "border-black/10",
    iconBox: "border-black/20 bg-white/50 text-gray-900 shadow-[inset_0_0_1px_1px_#fff]",
    actionBtn: "border-black/20 bg-white/40 text-gray-900 hover:bg-black/5 shadow-sm",
    closeBtn: "text-gray-700 hover:text-black",
    text: "text-gray-900",
    link: "text-gray-700 hover:text-black",
  },
}

export function Banner({
  show,
  onHide,
  icon,
  title,
  action,
  learnMoreUrl,
  theme = "emerald",
  className,
  style,
  customBg,
  customTextColor,
  showCloseButton = true,
}: BannerProps) {
  if (!show) return null

  const selectedTheme = THEME_STYLES[theme] || THEME_STYLES.emerald
  const isDark = theme === "dark"

  const customStyle: React.CSSProperties = {
    ...style,
    ...(customBg ? { background: customBg } : {}),
    ...(customTextColor ? { color: customTextColor } : {}),
  }

  return (
    <div
      style={customStyle}
      className={cn(
        "relative isolate flex flex-col justify-between gap-3 overflow-hidden rounded-xl border py-2.5 pl-4 pr-12 transition-all duration-300 sm:flex-row sm:items-center sm:py-2",
        selectedTheme.container,
        className,
      )}
    >
      <Grid
        cellSize={13}
        patternOffset={[0, -1]}
        className={cn(
          "mix-blend-overlay [mask-image:linear-gradient(to_right,black,transparent)] md:[mask-image:linear-gradient(to_right,black_60%,transparent)]",
          isDark ? "text-white/20" : "text-black/30",
        )}
      />

      <div className="flex items-center gap-3 z-10 min-w-0">
        {icon && (
          <div
            className={cn(
              "hidden rounded-full border p-1 sm:flex items-center justify-center shrink-0",
              selectedTheme.iconBox,
            )}
          >
            {icon}
          </div>
        )}
        <div className={cn("text-sm leading-relaxed", selectedTheme.text)}>
          {title}
          {learnMoreUrl && (
            <>
              {" "}
              <a
                href={learnMoreUrl}
                target={learnMoreUrl.startsWith("http") ? "_blank" : undefined}
                rel={learnMoreUrl.startsWith("http") ? "noopener noreferrer" : undefined}
                className={cn(
                  "underline underline-offset-2 transition-colors font-medium ml-1 inline-flex items-center gap-0.5",
                  selectedTheme.link,
                )}
              >
                Learn more
              </a>
            </>
          )}
        </div>
      </div>

      {action && action.label && (
        <div className="flex items-center z-10 shrink-0 sm:-my-1">
          <button
            type="button"
            className={cn(
              "whitespace-nowrap rounded-lg border px-3 py-1 text-xs font-semibold tracking-wide transition-all cursor-pointer backdrop-blur-xs",
              selectedTheme.actionBtn,
            )}
            onClick={action.onClick}
          >
            {action.label}
          </button>
        </div>
      )}

      {showCloseButton && onHide && (
        <button
          type="button"
          aria-label="Dismiss banner"
          className={cn(
            "absolute inset-y-0 right-2.5 my-auto h-7 w-7 rounded-md p-1 flex items-center justify-center transition-colors cursor-pointer z-20",
            selectedTheme.closeBtn,
          )}
          onClick={onHide}
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}
