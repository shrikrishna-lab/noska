"use client"

import * as React from "react"
import {
  ArrowUpIcon,
  AudioLinesIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ChevronLeftIcon,
  GlobeIcon,
  Loader2Icon,
  MicIcon,
  PencilIcon,
  PlusIcon,
  PuzzleIcon,
  SquareIcon,
  TelescopeIcon,
  UnplugIcon,
  UploadIcon,
  XIcon,
  Key,
  Laptop,
  Cloud,
  Sparkles,
  Search,
  SlidersHorizontal,
} from "lucide-react"
import {
  AnimatePresence,
  LayoutGroup,
  motion,
  type HTMLMotionProps,
} from "framer-motion"
import { createPortal } from "react-dom"
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { aiManager } from "../../ai/AIManager"
import { getAllProviders } from "../../ai/providers"

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const EASE = [0.2, 0, 0, 1] as const
const SPRING_SOFT = { type: "spring" as const, stiffness: 420, damping: 32 }
const SPRING_HEIGHT = { type: "spring" as const, stiffness: 380, damping: 34 }
const SPRING_PRESS = { type: "spring" as const, stiffness: 500, damping: 28 }
const SPRING_ICON = { type: "spring" as const, duration: 0.3, bounce: 0 }

const MENU_PANEL_CLASS = cn(
  "bg-[var(--surface-1)] text-[var(--text)] origin-bottom-left overflow-hidden rounded-2xl border border-[var(--border)] p-1.5",
  "shadow-[0_12px_40px_-8px_rgba(0,0,0,0.18),0_2px_12px_-2px_rgba(0,0,0,0.08)]",
  "dark:shadow-[0_16px_48px_-8px_rgba(0,0,0,0.55),0_2px_12px_-2px_rgba(0,0,0,0.4)]",
  "backdrop-blur-xl"
)

const CHIP_SURFACE_CLASS = cn(
  "bg-muted text-foreground inline-flex items-center gap-1.5 rounded-full py-1 pr-1 pl-2 text-xs font-medium",
  "shadow-[inset_0_0_0_1px_rgba(123,123,123,0.12)]"
)

const TOOLBAR_BTN_CLASS = cn(
  "relative flex size-9 cursor-pointer items-center justify-center rounded-xl",
  "transition-[background-color,color,box-shadow,opacity,transform] duration-200 ease-[cubic-bezier(0.2,0,0,1)]",
  "hover:bg-muted hover:text-foreground",
  "focus-visible:ring-0 focus-visible:outline-none focus:outline-none",
  "disabled:pointer-events-none disabled:opacity-40"
)

type PresenceProps = Pick<
  HTMLMotionProps<"span">,
  "initial" | "animate" | "exit" | "transition"
>

const FADE_ONLY: PresenceProps = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
}

const ICON_SWAP: PresenceProps = {
  initial: { opacity: 0, scale: 0.25, filter: "blur(4px)" },
  animate: { opacity: 1, scale: 1, filter: "blur(0px)" },
  exit: { opacity: 0, scale: 0.25, filter: "blur(4px)" },
  transition: SPRING_ICON,
}

function scaleBlurPresence(reduceMotion: boolean): PresenceProps {
  if (reduceMotion) return FADE_ONLY
  return {
    initial: { opacity: 0, scale: 0.9, filter: "blur(4px)" },
    animate: { opacity: 1, scale: 1, filter: "blur(0px)" },
    exit: { opacity: 0, scale: 0.9, filter: "blur(4px)" },
    transition: SPRING_ICON,
  }
}

function menuPresence(reduceMotion: boolean): PresenceProps {
  if (reduceMotion) return FADE_ONLY
  return {
    initial: { opacity: 0, y: 6, scale: 0.96, filter: "blur(4px)" },
    animate: { opacity: 1, y: 0, scale: 1, filter: "blur(0px)" },
    exit: { opacity: 0, y: 4, scale: 0.98, filter: "blur(2px)" },
    transition: { duration: 0.2, ease: EASE },
  }
}

function placeholderPresence(reduceMotion: boolean): PresenceProps {
  if (reduceMotion) return FADE_ONLY
  return {
    initial: { opacity: 0, y: 6, filter: "blur(4px)" },
    animate: { opacity: 1, y: 0, filter: "blur(0px)" },
    exit: { opacity: 0, y: -6, filter: "blur(4px)" },
    transition: { duration: 0.35, ease: EASE },
  }
}

function iconPresence(reduceMotion: boolean): PresenceProps {
  return reduceMotion ? FADE_ONLY : ICON_SWAP
}

function statusPresence(reduceMotion: boolean): PresenceProps {
  if (reduceMotion) return FADE_ONLY
  return {
    initial: { opacity: 0, scale: 0.92, filter: "blur(4px)" },
    animate: { opacity: 1, scale: 1, filter: "blur(0px)" },
    exit: { opacity: 0, scale: 0.94, filter: "blur(4px)" },
    transition: { type: "spring", duration: 0.35, bounce: 0 },
  }
}

function flyoutPresence(reduceMotion: boolean): PresenceProps {
  if (reduceMotion) return FADE_ONLY
  return {
    initial: { opacity: 0, x: -6, scale: 0.98, filter: "blur(4px)" },
    animate: { opacity: 1, x: 0, scale: 1, filter: "blur(0px)" },
    exit: { opacity: 0, x: -4, scale: 0.98, filter: "blur(2px)" },
    transition: { duration: 0.18, ease: EASE },
  }
}

function valuePresence(reduceMotion: boolean): PresenceProps {
  return reduceMotion ? FADE_ONLY : ICON_SWAP
}

const listVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.03 } },
}

const itemVariants = {
  hidden: { opacity: 0, y: 3 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.18, ease: EASE },
  },
}

const itemVariantsReduced = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.12 } },
}

export type AiModelEffort = "high" | "medium" | "low"

export type AiModel = {
  id: string
  label: string
  providerId: string
  providerName: string
  providerType: "cloud" | "local"
  configured: boolean
  requiresKey: boolean
  description?: string
  efforts?: AiModelEffort[]
  contexts?: Array<string | number>
  supportsFast?: boolean
  supportsThinking?: boolean
  defaultEffort?: AiModelEffort
  defaultContext?: string | number
  defaultFast?: boolean
  defaultThinking?: boolean
  disabled?: boolean
}

export type AiModelSelection = {
  id: string
  effort?: AiModelEffort
  context?: string
  fast?: boolean
  thinking?: boolean
}

export function formatContext(
  context: string | number | undefined
): string | null {
  if (context === undefined || context === "") return null
  if (typeof context === "number") {
    if (context >= 1_000_000) return `${(context / 1_000_000).toFixed(0)}M`
    if (context >= 1_000) return `${Math.round(context / 1_000)}K`
    return String(context)
  }
  return String(context)
}

/** Fallback local models for Ollama / LM Studio if no local daemon is currently reporting */
const DEFAULT_LOCAL_MODELS = {
  ollama: [
    { id: "llama3.3:latest", name: "Llama 3.3 70B (Local)", context: 131072 },
    { id: "deepseek-r1:8b", name: "DeepSeek R1 8B (Local)", context: 65536 },
    { id: "qwen2.5-coder:7b", name: "Qwen 2.5 Coder 7B (Local)", context: 32768 },
    { id: "mistral:latest", name: "Mistral 7B (Local)", context: 32768 },
  ],
  lmstudio: [
    { id: "local-model", name: "LM Studio Active Model", context: 8192 },
  ]
}

/** Generates real models populated from the configured AI provider registry */
export function getRealAiModels(): AiModel[] {
  try {
    const statuses = aiManager.getProviderStatuses()
    const list: AiModel[] = []

    for (const p of statuses) {
      let models = p.models || []
      if (models.length === 0 && DEFAULT_LOCAL_MODELS[p.id as keyof typeof DEFAULT_LOCAL_MODELS]) {
        models = DEFAULT_LOCAL_MODELS[p.id as keyof typeof DEFAULT_LOCAL_MODELS]
      }

      for (const m of models) {
        const ctxStr = formatContext(m.context) || "128K"
        const isLocal = p.type === "local"
        const isDeepThink = m.id.toLowerCase().includes("r1") || m.id.toLowerCase().includes("pro") || m.id.toLowerCase().includes("opus") || m.id.toLowerCase().includes("o1") || m.id.toLowerCase().includes("o3")

        list.push({
          id: m.id,
          label: m.name || m.id,
          providerId: p.id,
          providerName: p.name,
          providerType: isLocal ? "local" : "cloud",
          configured: p.configured || isLocal,
          requiresKey: !isLocal,
          description: isLocal
            ? `Runs locally on your device via ${p.name} (100% private, offline).`
            : `${p.name} · ${p.configured ? "Key configured" : "API key required"} (${ctxStr} context limit).`,
          efforts: ["high", "medium", "low"],
          contexts: [ctxStr],
          supportsFast: !isDeepThink,
          supportsThinking: isDeepThink,
          defaultEffort: "high",
          defaultContext: ctxStr,
          defaultFast: true,
        })
      }
    }
    if (list.length > 0) return list
  } catch {
    // fallback
  }

  return DEFAULT_AI_MODELS
}

export const DEFAULT_AI_MODELS: AiModel[] = [
  {
    id: "anthropic/claude-sonnet-4-20250514",
    label: "Claude Sonnet 4",
    providerId: "openrouter",
    providerName: "OpenRouter",
    providerType: "cloud",
    configured: false,
    requiresKey: true,
    description: "State-of-the-art workspace reasoning.",
    efforts: ["high", "medium", "low"],
    contexts: ["200K"],
    supportsFast: true,
    supportsThinking: true,
    defaultEffort: "high",
    defaultContext: "200K",
    defaultFast: true,
  },
  {
    id: "google/gemini-2.5-flash-preview",
    label: "Gemini 2.5 Flash",
    providerId: "openrouter",
    providerName: "OpenRouter",
    providerType: "cloud",
    configured: false,
    requiresKey: true,
    description: "Ultra-fast long context reasoning for docs.",
    efforts: ["high", "medium", "low"],
    contexts: ["1M"],
    supportsFast: true,
    supportsThinking: false,
    defaultEffort: "medium",
    defaultContext: "1M",
    defaultFast: true,
  },
  {
    id: "openai/gpt-4o",
    label: "GPT-4o",
    providerId: "openrouter",
    providerName: "OpenRouter",
    providerType: "cloud",
    configured: false,
    requiresKey: true,
    description: "Multimodal reasoning and writing.",
    efforts: ["high", "medium", "low"],
    contexts: ["128K"],
    supportsFast: true,
    supportsThinking: true,
    defaultEffort: "high",
    defaultContext: "128K",
    defaultFast: true,
  },
  {
    id: "llama3.3:latest",
    label: "Llama 3.3 70B (Local)",
    providerId: "ollama",
    providerName: "Ollama",
    providerType: "local",
    configured: true,
    requiresKey: false,
    description: "Runs locally on device via Ollama (100% private, free).",
    efforts: ["high", "medium", "low"],
    contexts: ["131K"],
    supportsFast: true,
    supportsThinking: false,
    defaultEffort: "high",
    defaultContext: "131K",
    defaultFast: true,
  },
]

const EFFORT_LABEL: Record<AiModelEffort, string> = {
  high: "High",
  medium: "Medium",
  low: "Low",
}

export interface ModelSelectorProps {
  children: React.ReactNode
  models?: AiModel[]
  value?: AiModelSelection
  defaultValue?: AiModelSelection
  onValueChange?: (value: AiModelSelection) => void
  onOpenKeySetup?: (providerId?: string) => void
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  disabled?: boolean
  className?: string
  "aria-label"?: string
}

export interface ModelSelectorTriggerProps extends Omit<
  HTMLMotionProps<"button">,
  "children"
> {
  children?: React.ReactNode
}

export type ModelSelectorValueProps = React.HTMLAttributes<HTMLSpanElement>

export interface ModelSelectorContentProps extends Omit<
  HTMLMotionProps<"div">,
  "children"
> {
  children?: React.ReactNode
  side?: "top" | "bottom"
}

interface ModelSelectorContextValue {
  open: boolean
  setOpen: (open: boolean) => void
  selection: AiModelSelection
  selectModel: (id: string) => void
  patchSelection: (patch: Partial<AiModelSelection>) => void
  models: AiModel[]
  selectedModel: AiModel | undefined
  disabled: boolean
  reduceMotion: boolean
  triggerRef: React.RefObject<HTMLButtonElement | null>
  contentRef: React.RefObject<HTMLDivElement | null>
  contentId: string
  layoutGroupId: string
  activeIndex: number
  setActiveIndex: (index: number) => void
  optionIds: string[]
  ariaLabel: string
  side: "top" | "bottom"
  setSide: (side: "top" | "bottom") => void
  editingId: string | null
  setEditingId: (id: string | null) => void
  previewId: string | null
  setPreviewId: (id: string | null) => void
  getConfigFor: (model: AiModel) => AiModelSelection
  onOpenKeySetup?: (providerId?: string) => void
}

function optionDomId(contentId: string, modelId: string) {
  return `${contentId}-option-${modelId}`
}

function firstEnabledIndex(models: AiModel[], optionIds: string[]) {
  for (let i = 0; i < optionIds.length; i++) {
    const model = models.find((m) => m.id === optionIds[i])
    if (model && !model.disabled) return i
  }
  return 0
}

function lastEnabledIndex(models: AiModel[], optionIds: string[]) {
  for (let i = optionIds.length - 1; i >= 0; i--) {
    const model = models.find((m) => m.id === optionIds[i])
    if (model && !model.disabled) return i
  }
  return Math.max(0, optionIds.length - 1)
}

const ModelSelectorContext =
  React.createContext<ModelSelectorContextValue | null>(null)

function useModelSelectorContext(component: string): ModelSelectorContextValue {
  const ctx = React.useContext(ModelSelectorContext)
  if (!ctx) {
    throw new Error(`${component} must be used within <ModelSelector>`)
  }
  return ctx
}

function defaultSelectionFor(model: AiModel): AiModelSelection {
  return {
    id: model.id,
    effort: model.defaultEffort ?? model.efforts?.[0],
    context:
      formatContext(model.defaultContext ?? model.contexts?.[0]) ?? undefined,
    fast: model.defaultFast ?? false,
    thinking: model.defaultThinking ?? false,
  }
}

function resolveSelection(
  models: AiModel[],
  value?: AiModelSelection
): AiModelSelection {
  const model = models.find((m) => m.id === value?.id) ?? models[0]
  if (!model) {
    return { id: value?.id ?? "" }
  }
  const base = defaultSelectionFor(model)
  if (!value || value.id !== model.id) return base
  return {
    id: model.id,
    effort: value.effort ?? base.effort,
    context: value.context ?? base.context,
    fast: value.fast ?? base.fast,
    thinking: value.thinking ?? base.thinking,
  }
}

function ModelLabelParts({
  model,
  selection,
  className,
}: {
  model: AiModel | undefined
  selection: AiModelSelection
  className?: string
}) {
  if (!model) {
    return (
      <span className={cn("text-muted-foreground flex items-center gap-1.5", className)}>
        <Key size={11} className="text-accent" />
        <span>Setup API Key</span>
      </span>
    )
  }

  const mods: string[] = []
  if (selection.effort) mods.push(EFFORT_LABEL[selection.effort])
  if (selection.fast) mods.push("Fast")
  if (selection.thinking) mods.push("Thinking")

  return (
    <span className={cn("flex min-w-0 items-baseline gap-1.5", className)}>
      <span className="text-foreground truncate font-medium">{model.label}</span>
      {model.providerName && (
        <span className="text-muted-foreground/60 text-[10px] hidden sm:inline truncate">
          · {model.providerName}
        </span>
      )}
      {mods.map((mod) => (
        <span
          key={mod}
          className="text-muted-foreground/70 shrink-0 font-medium tabular-nums text-xs"
        >
          {mod}
        </span>
      ))}
    </span>
  )
}

function OptionChip({
  selected,
  onClick,
  children,
  disabled,
  reduceMotion,
}: {
  selected: boolean
  onClick: () => void
  children: React.ReactNode
  disabled?: boolean
  reduceMotion: boolean
}) {
  return (
    <motion.button
      type="button"
      disabled={disabled}
      onClick={onClick}
      whileTap={disabled ? undefined : { scale: 0.96 }}
      transition={SPRING_PRESS}
      className={cn(
        "flex w-full items-center justify-between gap-3 rounded-lg px-2.5 py-1.5 text-left text-xs font-medium",
        "transition-colors duration-150",
        "focus:outline-none focus-visible:outline-none",
        selected
          ? "bg-muted text-foreground"
          : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
        disabled && "pointer-events-none opacity-40"
      )}
    >
      <span>{children}</span>
      <span className="flex size-3.5 shrink-0 items-center justify-center">
        <MenuCheckmark
          visible={selected}
          reduceMotion={reduceMotion}
          className="text-foreground"
        />
      </span>
    </motion.button>
  )
}

function ToggleChip({
  selected,
  onClick,
  children,
  reduceMotion,
}: {
  selected: boolean
  onClick: () => void
  children: React.ReactNode
  reduceMotion: boolean
}) {
  return (
    <motion.button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      whileTap={{ scale: 0.96 }}
      transition={SPRING_PRESS}
      className={cn(
        "flex w-full items-center justify-between gap-3 rounded-lg px-2.5 py-1.5 text-left text-xs font-medium",
        "transition-colors duration-150",
        "focus:outline-none focus-visible:outline-none",
        selected
          ? "bg-muted text-foreground"
          : "text-muted-foreground/70 hover:bg-muted/70 hover:text-muted-foreground"
      )}
    >
      <span>{children}</span>
      <span className="flex size-3.5 shrink-0 items-center justify-center">
        <MenuCheckmark
          visible={selected}
          reduceMotion={reduceMotion}
          className="text-foreground"
        />
      </span>
    </motion.button>
  )
}

function ModelSelector({
  children,
  models = DEFAULT_AI_MODELS,
  value: valueProp,
  defaultValue,
  onValueChange,
  onOpenKeySetup,
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  disabled = false,
  className,
  "aria-label": ariaLabel = "AI models",
}: ModelSelectorProps) {
  const reduceMotion = usePrefersReducedMotion()
  const layoutGroupId = React.useId()
  const contentId = React.useId()
  const triggerRef = React.useRef<HTMLButtonElement | null>(null)
  const contentRef = React.useRef<HTMLDivElement | null>(null)

  const initial =
    defaultValue ?? (models[0] ? defaultSelectionFor(models[0]) : { id: "" })

  const [selection, setSelection] = useControllableState({
    value: valueProp,
    defaultValue: initial,
    onChange: onValueChange,
  })

  const [open, setOpenState] = useControllableState({
    value: openProp,
    defaultValue: defaultOpen,
    onChange: onOpenChange,
  })

  const [activeIndex, setActiveIndex] = React.useState(0)
  const [side, setSide] = React.useState<"top" | "bottom">("top")
  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [previewId, setPreviewId] = React.useState<string | null>(null)

  const optionIds = React.useMemo(() => models.map((m) => m.id), [models])
  const configCacheRef = React.useRef<Record<string, AiModelSelection>>({})
  const resolved = resolveSelection(models, selection)

  React.useEffect(() => {
    if (resolved.id) configCacheRef.current[resolved.id] = resolved
  }, [resolved])

  const selectedModel = models.find((m) => m.id === resolved.id) ?? models[0]

  const getConfigFor = React.useCallback(
    (model: AiModel): AiModelSelection => {
      if (resolved.id === model.id) return resolved
      return configCacheRef.current[model.id] ?? defaultSelectionFor(model)
    },
    [resolved]
  )

  const setOpen = React.useCallback(
    (next: boolean) => {
      if (disabled && next) return
      setOpenState(next)
      if (!next) {
        setEditingId(null)
        setPreviewId(null)
      }
    },
    [disabled, setOpenState]
  )

  const selectModel = React.useCallback(
    (id: string) => {
      const model = models.find((m) => m.id === id)
      if (!model || model.disabled) return
      const next = resolveSelection(models, { ...getConfigFor(model), id })
      setSelection(next)
      setEditingId(null)
      setOpen(false)
      triggerRef.current?.focus()
    },
    [models, getConfigFor, setSelection, setOpen]
  )

  const patchSelection = React.useCallback(
    (patch: Partial<AiModelSelection>) => {
      setSelection((prev) => {
        const id = patch.id ?? prev.id
        const model = models.find((m) => m.id === id)
        const base = model
          ? id === prev.id
            ? resolveSelection(models, prev)
            : (configCacheRef.current[id] ?? defaultSelectionFor(model))
          : prev
        const next = resolveSelection(models, { ...base, ...patch, id })
        configCacheRef.current[id] = next
        return next
      })
    },
    [models, setSelection]
  )

  React.useEffect(() => {
    if (!open) return
    const idx = optionIds.indexOf(resolved.id)
    setActiveIndex(idx >= 0 ? idx : firstEnabledIndex(models, optionIds))
  }, [open, optionIds, resolved.id, models])

  React.useEffect(() => {
    if (!open) return

    const onPointer = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null
      if (!target) return
      const inTrigger = triggerRef.current?.contains(target)
      const inContent = contentRef.current?.contains(target)
      if (!inTrigger && !inContent) setOpen(false)
    }

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault()
        if (editingId) {
          setEditingId(null)
          return
        }
        setOpen(false)
        triggerRef.current?.focus()
        return
      }

      if (editingId || optionIds.length === 0) return

      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault()
        const delta = event.key === "ArrowDown" ? 1 : -1
        setActiveIndex((prev) => {
          let next = prev
          for (let i = 0; i < optionIds.length; i++) {
            next = (next + delta + optionIds.length) % optionIds.length
            const model = models.find((m) => m.id === optionIds[next])
            if (!model?.disabled) break
          }
          return next
        })
        return
      }

      if (event.key === "Enter" || event.key === " ") {
        const target = event.target as HTMLElement | null
        if (target?.closest("[data-slot='model-selector-item']")) return
        if (target?.closest("[data-slot='model-selector-edit']")) return
        event.preventDefault()
        const id = optionIds[activeIndex]
        if (id) selectModel(id)
        return
      }

      if (event.key === "Home") {
        event.preventDefault()
        setActiveIndex(firstEnabledIndex(models, optionIds))
        return
      }
      if (event.key === "End") {
        event.preventDefault()
        setActiveIndex(lastEnabledIndex(models, optionIds))
      }
    }

    document.addEventListener("mousedown", onPointer)
    document.addEventListener("touchstart", onPointer)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("mousedown", onPointer)
      document.removeEventListener("touchstart", onPointer)
      document.removeEventListener("keydown", onKey)
    }
  }, [open, setOpen, optionIds, activeIndex, models, selectModel, editingId])

  return (
    <ModelSelectorContext.Provider
      value={{
        open,
        setOpen,
        selection: resolved,
        selectModel,
        patchSelection,
        models,
        selectedModel,
        disabled,
        reduceMotion,
        triggerRef,
        contentRef,
        contentId,
        layoutGroupId,
        activeIndex,
        setActiveIndex,
        optionIds,
        ariaLabel,
        side,
        setSide,
        editingId,
        setEditingId,
        previewId,
        setPreviewId,
        getConfigFor,
        onOpenKeySetup,
      }}
    >
      <div
        data-slot="model-selector"
        data-state={open ? "open" : "closed"}
        className={cn("relative inline-flex", className)}
      >
        {children}
      </div>
    </ModelSelectorContext.Provider>
  )
}

const ModelSelectorTrigger = React.forwardRef<
  HTMLButtonElement,
  ModelSelectorTriggerProps
>(({ className, children, disabled, onClick, ...props }, ref) => {
  const {
    open,
    setOpen,
    triggerRef,
    contentId,
    disabled: rootDisabled,
    selectedModel,
    selection,
  } = useModelSelectorContext("ModelSelectorTrigger")

  const isDisabled = disabled || rootDisabled
  const label = selectedModel
    ? [
        selectedModel.label,
        selection.effort ? EFFORT_LABEL[selection.effort] : null,
        selection.fast ? "Fast" : null,
        selection.thinking ? "Thinking" : null,
      ]
        .filter(Boolean)
        .join(" ")
    : "Select model"

  return (
    <motion.button
      ref={(node) => assignRef(node, ref, triggerRef)}
      type="button"
      disabled={isDisabled}
      aria-haspopup="listbox"
      aria-expanded={open}
      aria-controls={contentId}
      aria-label={`Model: ${label}`}
      data-slot="model-selector-trigger"
      data-state={open ? "open" : "closed"}
      onClick={(event) => {
        onClick?.(event)
        if (event.defaultPrevented || isDisabled) return
        setOpen(!open)
      }}
      whileHover={isDisabled ? undefined : { scale: 1.01 }}
      whileTap={isDisabled ? undefined : { scale: 0.97 }}
      transition={SPRING_PRESS}
      className={cn(
        "text-muted-foreground flex min-h-8 cursor-pointer items-center gap-1.5 rounded-xl px-2 py-1 text-xs font-medium",
        "transition-colors duration-150",
        "hover:bg-muted hover:text-foreground",
        "focus:outline-none focus-visible:outline-none",
        "disabled:pointer-events-none disabled:opacity-40",
        open && "bg-muted text-foreground",
        className
      )}
      {...props}
    >
      {children ?? <ModelSelectorValue />}
      <motion.span
        animate={{ rotate: open ? 180 : 0 }}
        transition={{ duration: 0.2, ease: EASE }}
        className="flex shrink-0"
      >
        <ChevronDownIcon className="size-3 opacity-60" aria-hidden />
      </motion.span>
    </motion.button>
  )
})
ModelSelectorTrigger.displayName = "ModelSelectorTrigger"

function ModelSelectorValue({ className, ...props }: ModelSelectorValueProps) {
  const { selectedModel, selection, reduceMotion } =
    useModelSelectorContext("ModelSelectorValue")

  return (
    <span
      data-slot="model-selector-value"
      className={cn("relative flex min-w-0 items-center", className)}
      {...props}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={`${selection.id}-${selection.effort}-${selection.fast}-${selection.thinking}`}
          {...valuePresence(reduceMotion)}
          className="flex min-w-0"
        >
          <ModelLabelParts
            model={selectedModel}
            selection={selection}
            className="text-xs"
          />
        </motion.span>
      </AnimatePresence>
    </span>
  )
}
ModelSelectorValue.displayName = "ModelSelectorValue"

const ModelSelectorContent = React.forwardRef<
  HTMLDivElement,
  ModelSelectorContentProps
>(({ className, children, side: sideProp = "top", style, ...props }, ref) => {
  const {
    open,
    contentId,
    triggerRef,
    contentRef,
    reduceMotion,
    ariaLabel,
    setSide,
    editingId,
    previewId,
    models,
    activeIndex,
    optionIds,
  } = useModelSelectorContext("ModelSelectorContent")

  const [mounted, setMounted] = React.useState(false)
  const [coords, setCoords] = React.useState<{
    bottom: number
    left: number
    maxHeight?: number
  } | null>(null)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  React.useEffect(() => {
    setSide(sideProp)
  }, [sideProp, setSide])

  React.useLayoutEffect(() => {
    if (!open) return

    const update = () => {
      const trigger = triggerRef.current
      if (!trigger) return
      const rect = trigger.getBoundingClientRect()
      const viewportWidth = window.innerWidth
      const viewportHeight = window.innerHeight

      // Anchor right above the trigger button to always open upward
      const popupWidth = Math.min(340, viewportWidth - 24)
      const left = Math.max(12, Math.min(rect.left, viewportWidth - popupWidth - 12))
      const bottom = Math.max(12, viewportHeight - rect.top + 8)
      const maxH = Math.min(500, Math.max(260, rect.top - 16))

      setCoords({
        bottom,
        left,
        maxHeight: maxH,
      })
    }

    update()
    window.addEventListener("resize", update)
    window.addEventListener("scroll", update, true)
    return () => {
      window.removeEventListener("resize", update)
      window.removeEventListener("scroll", update, true)
    }
  }, [open, triggerRef, sideProp])

  if (!mounted) return null

  const list = children ?? <ModelSelectorDefaultItems />
  const editingModel = models.find((m) => m.id === editingId)
  const previewModel = models.find((m) => m.id === previewId)
  const panelModel = editingModel ?? previewModel
  const activeModelId = optionIds[activeIndex]
  const activeOptionId = activeModelId
    ? optionDomId(contentId, activeModelId)
    : undefined

  return createPortal(
    <AnimatePresence>
      {open && coords ? (
        <motion.div
          key={contentId}
          ref={(node) => assignRef(node, ref, contentRef)}
          data-slot="model-selector-content"
          data-editing={editingId ? "" : undefined}
          {...menuPresence(reduceMotion)}
          style={{
            position: "fixed",
            bottom: `${coords.bottom}px`,
            left: `${coords.left}px`,
            maxHeight: `${coords.maxHeight}px`,
            zIndex: 50,
            ...style,
          }}
          className={cn("flex origin-bottom-left items-end gap-3", className)}
          {...props}
        >
          <div
            id={contentId}
            role="listbox"
            aria-label={ariaLabel}
            aria-activedescendant={activeOptionId}
            data-slot="model-selector-listbox"
            className="min-w-0"
          >
            {list}
          </div>

          <AnimatePresence initial={false}>
            {panelModel ? (
              <ModelSidePanel
                key="model-side-panel"
                model={panelModel}
                editing={!!editingModel}
              />
            ) : null}
          </AnimatePresence>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body
  )
})
ModelSelectorContent.displayName = "ModelSelectorContent"

function ProviderIcon({ providerId, className }: { providerId: string; className?: string }) {
  const id = providerId.toLowerCase()
  if (id.includes("gemini") || id.includes("google")) {
    return (
      <div className={cn("size-7 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center font-bold text-[10px]", className)}>
        ✦
      </div>
    )
  }
  if (id.includes("openai")) {
    return (
      <div className={cn("size-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-[11px]", className)}>
        ✳
      </div>
    )
  }
  if (id.includes("anthropic")) {
    return (
      <div className={cn("size-7 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold text-[10px]", className)}>
        ✤
      </div>
    )
  }
  if (id.includes("deepseek")) {
    return (
      <div className={cn("size-7 rounded-lg bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center font-bold text-[11px]", className)}>
        🐋
      </div>
    )
  }
  if (id.includes("ollama")) {
    return (
      <div className={cn("size-7 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-mono font-bold text-[10px]", className)}>
        &gt;_
      </div>
    )
  }
  if (id.includes("groq")) {
    return (
      <div className={cn("size-7 rounded-lg bg-orange-500/10 text-orange-500 flex items-center justify-center font-bold text-[11px]", className)}>
        ⚡
      </div>
    )
  }
  if (id.includes("mistral")) {
    return (
      <div className={cn("size-7 rounded-lg bg-amber-600/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold text-[11px]", className)}>
        ≋
      </div>
    )
  }
  if (id.includes("lmstudio")) {
    return (
      <div className={cn("size-7 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center font-bold text-[11px]", className)}>
        💻
      </div>
    )
  }
  return (
    <div className={cn("size-7 rounded-lg bg-[var(--accent)]/10 text-[var(--accent)] flex items-center justify-center", className)}>
      <Cloud size={13} />
    </div>
  )
}

function ModelSelectorDefaultItems() {
  const { models, layoutGroupId, reduceMotion, editingId, setPreviewId, onOpenKeySetup, setOpen, selection } =
    useModelSelectorContext("ModelSelectorDefaultItems")

  const [activeTab, setActiveTab] = React.useState<"providers" | "models">("providers")
  const [selectedProviderId, setSelectedProviderId] = React.useState<string | null>(null)
  const [search, setSearch] = React.useState("")

  // Group models by provider
  const providersMap = React.useMemo(() => {
    const map = new Map<string, { id: string; name: string; type: "cloud" | "local"; configured: boolean; models: AiModel[] }>()
    for (const m of models) {
      if (!map.has(m.providerId)) {
        map.set(m.providerId, {
          id: m.providerId,
          name: m.providerName,
          type: m.providerType,
          configured: m.configured,
          models: [],
        })
      }
      map.get(m.providerId)!.models.push(m)
    }
    return Array.from(map.values())
  }, [models])

  // Filtered providers
  const filteredProviders = React.useMemo(() => {
    return providersMap.filter((p) => {
      const matchSearch =
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.models.some((m) => m.label.toLowerCase().includes(search.toLowerCase()))
      return matchSearch
    })
  }, [providersMap, search])

  // Filtered flat models for "All Models" tab
  const filteredFlatModels = React.useMemo(() => {
    return models.filter((m) => {
      const matchSearch =
        m.label.toLowerCase().includes(search.toLowerCase()) ||
        m.providerName.toLowerCase().includes(search.toLowerCase()) ||
        m.id.toLowerCase().includes(search.toLowerCase())
      return matchSearch
    })
  }, [models, search])

  const selectedProvider = providersMap.find((p) => p.id === selectedProviderId)
  const activeProviderModels = selectedProvider ? selectedProvider.models : []

  return (
    <LayoutGroup id={layoutGroupId}>
      <motion.div
        variants={listVariants}
        initial={reduceMotion ? false : "hidden"}
        animate="show"
        className={cn(
          MENU_PANEL_CLASS,
          "flex w-[320px] sm:w-[340px] flex-col overflow-hidden shadow-2xl border border-[var(--border)]"
        )}
        onMouseLeave={() => {
          if (!editingId) setPreviewId(null)
        }}
      >
        {/* Streamlined Minimal Header */}
        <div className="p-2.5 space-y-2 border-b border-[var(--border)] bg-[var(--surface-1)]">
          <div className="flex items-center justify-between gap-1.5">
            <div className="relative flex-1 flex items-center">
              <Search size={12} className="absolute left-2.5 text-[var(--muted)]" />
              <input
                type="text"
                placeholder={
                  selectedProvider
                    ? `Search ${selectedProvider.name}...`
                    : activeTab === "providers"
                    ? "Search providers..."
                    : "Search models..."
                }
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-[var(--surface-2)] text-[var(--text)] text-xs pl-7 pr-6 py-1.5 rounded-lg border border-[var(--border)] outline-none focus:border-[var(--accent)]/50 transition-colors placeholder:text-[var(--muted)]"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-2 text-[var(--muted)] hover:text-[var(--text)] cursor-pointer"
                >
                  <XIcon size={11} />
                </button>
              )}
            </div>

            {/* Compact Mode Pill Switcher */}
            {!selectedProvider && (
              <div className="flex items-center p-0.5 bg-[var(--surface-2)] rounded-lg border border-[var(--border)] shrink-0 text-[11px]">
                <button
                  type="button"
                  onClick={() => setActiveTab("providers")}
                  className={cn(
                    "px-2 py-1 rounded-md transition-all font-medium cursor-pointer",
                    activeTab === "providers"
                      ? "bg-[var(--surface-1)] text-[var(--text)] shadow-xs font-semibold"
                      : "text-[var(--muted)] hover:text-[var(--text)]"
                  )}
                >
                  Providers
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("models")}
                  className={cn(
                    "px-2 py-1 rounded-md transition-all font-medium cursor-pointer",
                    activeTab === "models"
                      ? "bg-[var(--surface-1)] text-[var(--text)] shadow-xs font-semibold"
                      : "text-[var(--muted)] hover:text-[var(--text)]"
                  )}
                >
                  Models
                </button>
              </div>
            )}
          </div>
        </div>

        {/* View 1: Drilled-Down Provider Models */}
        {selectedProvider ? (
          <div className="flex flex-col">
            <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--border)] bg-[var(--surface-2)]/30">
              <button
                type="button"
                onClick={() => setSelectedProviderId(null)}
                className="flex items-center gap-1 text-xs text-[var(--muted)] hover:text-[var(--text)] font-medium transition-colors cursor-pointer"
              >
                <ChevronLeftIcon size={14} />
                <span>All Providers</span>
              </button>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-[var(--text)]">{selectedProvider.name}</span>
                {selectedProvider.configured || selectedProvider.type === "local" ? (
                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium">Ready</span>
                ) : (
                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-sky-500/10 text-sky-600 dark:text-sky-400 font-medium">Connect</span>
                )}
              </div>
            </div>

            <ul role="presentation" className="flex max-h-60 overflow-y-auto flex-col gap-0.5 p-1.5 scrollbar-thin">
              {activeProviderModels.map((model) => (
                <li key={model.id} role="none">
                  <ModelSelectorItem model={model} />
                </li>
              ))}
            </ul>

            {!selectedProvider.configured && selectedProvider.type !== "local" && onOpenKeySetup && (
              <div className="p-2 border-t border-[var(--border)] bg-sky-500/5">
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false)
                    onOpenKeySetup(selectedProvider.id)
                  }}
                  className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 text-[var(--text)] text-xs font-medium transition-colors cursor-pointer"
                >
                  <Key size={12} className="text-sky-500" />
                  <span>Connect {selectedProvider.name} API Key</span>
                </button>
              </div>
            )}
          </div>
        ) : activeTab === "providers" ? (
          /* View 2: Providers List matching Image 2 style */
          <ul role="presentation" className="flex max-h-64 overflow-y-auto flex-col gap-0.5 p-1.5 scrollbar-thin">
            {filteredProviders.length === 0 ? (
              <div className="py-6 text-center text-xs text-[var(--muted)]">
                No matching providers found.
              </div>
            ) : (
              filteredProviders.map((provider) => {
                const isLocal = provider.type === "local"
                const hasSelectedModel = provider.models.some((m) => m.id === selection.id)

                return (
                  <li key={provider.id} role="none">
                    <motion.div
                      variants={reduceMotion ? itemVariantsReduced : itemVariants}
                      onClick={() => setSelectedProviderId(provider.id)}
                      className={cn(
                        "group/item relative flex w-full items-center justify-between gap-2.5 rounded-xl px-2.5 py-2 cursor-pointer",
                        "transition-all duration-150 text-xs",
                        hasSelectedModel
                          ? "bg-[var(--surface-2)] text-[var(--text)] font-semibold border border-[var(--border)]"
                          : "text-[var(--text-secondary)] hover:bg-[var(--surface-2)]/70 hover:text-[var(--text)]"
                      )}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <ProviderIcon providerId={provider.id} />
                        <div className="flex flex-col min-w-0">
                          <span className="truncate font-semibold text-[var(--text)]">{provider.name}</span>
                          <span className="text-[10px] text-[var(--muted)] truncate">
                            {provider.models.length} model{provider.models.length !== 1 ? "s" : ""}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {isLocal ? (
                          <span className="text-[10px] px-2 py-0.5 rounded-md bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 font-medium">
                            Local
                          </span>
                        ) : provider.configured ? (
                          <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium">
                            Ready
                          </span>
                        ) : (
                          <span className="text-[10px] px-2 py-0.5 rounded-md bg-sky-500/10 text-sky-600 dark:text-sky-400 font-medium hover:bg-sky-500/20 transition-colors">
                            Connect
                          </span>
                        )}
                        <ChevronRightIcon size={13} className="text-[var(--muted)] opacity-50 group-hover/item:opacity-100 transition-opacity" />
                      </div>
                    </motion.div>
                  </li>
                )
              })
            )}
          </ul>
        ) : (
          /* View 3: All Models (Direct Flat Model Selection) */
          <ul role="presentation" className="flex max-h-64 overflow-y-auto flex-col gap-0.5 p-1.5 scrollbar-thin">
            {filteredFlatModels.length === 0 ? (
              <div className="py-6 text-center text-xs text-[var(--muted)]">
                No matching models found.
              </div>
            ) : (
              filteredFlatModels.map((model) => (
                <li key={model.id} role="none">
                  <ModelSelectorItem model={model} />
                </li>
              ))
            )}
          </ul>
        )}

        {/* Footer: Manage Providers / API Keys (Matching Image 2 footer) */}
        {onOpenKeySetup && !selectedProvider && (
          <div className="p-2 border-t border-[var(--border)] bg-[var(--surface-2)]/30">
            <button
              type="button"
              onClick={() => {
                setOpen(false)
                onOpenKeySetup()
              }}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-[var(--text)] hover:bg-[var(--surface-2)] transition-colors text-left font-medium cursor-pointer"
            >
              <Key size={13} className="text-[var(--accent)]" />
              <span>Manage connectors & API keys</span>
            </button>
          </div>
        )}
      </motion.div>
    </LayoutGroup>
  )
}

function ModelSidePanel({
  model,
  editing,
}: {
  model: AiModel
  editing: boolean
}) {
  const { reduceMotion } = useModelSelectorContext("ModelSidePanel")

  return (
    <motion.aside
      data-slot="model-selector-side-panel"
      aria-label={
        editing ? `${model.label} settings` : `${model.label} details`
      }
      {...flyoutPresence(reduceMotion)}
      className={cn(MENU_PANEL_CLASS, "flex w-60 shrink-0 flex-col gap-2.5 p-3.5")}
    >
      {editing ? (
        <ModelEditPanelContent model={model} />
      ) : (
        <ModelInfoPanelContent model={model} />
      )}
    </motion.aside>
  )
}

function ModelInfoPanelContent({ model }: { model: AiModel }) {
  const { onOpenKeySetup, setOpen } = useModelSelectorContext("ModelInfoPanelContent")
  const contexts = model.contexts
    ?.map((context) => formatContext(context))
    .filter(Boolean)
    .join(" · ")

  const isLocal = model.providerType === "local"

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[var(--text)] text-xs font-semibold">{model.label}</div>
          <div className="text-[10px] text-[var(--muted)] flex items-center gap-1 mt-0.5">
            {isLocal ? <Laptop size={10} /> : <Cloud size={10} />}
            <span>{model.providerName}</span>
          </div>
        </div>
        {model.configured || isLocal ? (
          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium">
            {isLocal ? "Local AI" : "Ready"}
          </span>
        ) : (
          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 font-medium">
            Key needed
          </span>
        )}
      </div>

      {model.description ? (
        <p className="text-[var(--muted)] text-[11px] leading-relaxed">
          {model.description}
        </p>
      ) : null}

      {contexts ? (
        <div className="mt-1 flex flex-col gap-0.5">
          <span className="text-[var(--muted)] text-[9px] font-semibold uppercase">
            Context Limit
          </span>
          <span className="text-[var(--text)] text-xs font-mono">
            {contexts}
          </span>
        </div>
      ) : null}

      {!model.configured && !isLocal && onOpenKeySetup && (
        <button
          type="button"
          onClick={() => {
            setOpen(false)
            onOpenKeySetup(model.providerId)
          }}
          className="mt-2 w-full flex items-center justify-center gap-1.5 py-1.5 rounded-xl bg-[var(--accent)]/15 hover:bg-[var(--accent)]/25 text-[var(--text)] text-xs font-medium transition-colors"
        >
          <Key size={12} />
          <span>Connect {model.providerName} Key</span>
        </button>
      )}

      {isLocal && onOpenKeySetup && (
        <button
          type="button"
          onClick={() => {
            setOpen(false)
            onOpenKeySetup(model.providerId)
          }}
          className="mt-2 w-full flex items-center justify-center gap-1.5 py-1.5 rounded-xl bg-[var(--surface-2)] hover:bg-[var(--surface-1)] text-[var(--text)] text-xs font-medium border border-[var(--border)] transition-colors"
        >
          <Laptop size={12} />
          <span>Configure {model.providerName} URL</span>
        </button>
      )}
    </>
  )
}

function ModelEditPanelContent({ model }: { model: AiModel }) {
  const { getConfigFor, patchSelection, reduceMotion } =
    useModelSelectorContext("ModelEditPanelContent")

  const config = getConfigFor(model)
  const efforts = model.efforts ?? []

  return (
    <>
      {efforts.length > 0 ? (
        <div className="flex flex-col gap-1">
          <div className="text-[var(--muted)] px-0.5 text-[9px] font-semibold uppercase">
            Reasoning Effort
          </div>
          <div className="flex flex-col gap-0.5">
            {efforts.map((effort) => (
              <OptionChip
                key={effort}
                selected={config.effort === effort}
                reduceMotion={reduceMotion}
                onClick={() => patchSelection({ id: model.id, effort })}
              >
                {EFFORT_LABEL[effort]}
              </OptionChip>
            ))}
          </div>
        </div>
      ) : null}

      {(model.supportsFast || model.supportsThinking) && (
        <div className="flex flex-col gap-1 mt-1">
          <div className="text-[var(--muted)] px-0.5 text-[9px] font-semibold uppercase">
            Mode
          </div>
          <div className="flex flex-col gap-0.5">
            {model.supportsFast ? (
              <ToggleChip
                selected={!!config.fast}
                reduceMotion={reduceMotion}
                onClick={() =>
                  patchSelection({ id: model.id, fast: !config.fast })
                }
              >
                Fast Mode
              </ToggleChip>
            ) : null}
            {model.supportsThinking ? (
              <ToggleChip
                selected={!!config.thinking}
                reduceMotion={reduceMotion}
                onClick={() =>
                  patchSelection({
                    id: model.id,
                    thinking: !config.thinking,
                  })
                }
              >
                Deep Thinking
              </ToggleChip>
            ) : null}
          </div>
        </div>
      )}
    </>
  )
}

function ModelSelectorItem({ model }: { model: AiModel }) {
  const {
    selection,
    selectModel,
    reduceMotion,
    layoutGroupId,
    contentId,
    activeIndex,
    setActiveIndex,
    optionIds,
    editingId,
    setEditingId,
    setPreviewId,
    getConfigFor,
    patchSelection,
    onOpenKeySetup,
    setOpen,
  } = useModelSelectorContext("ModelSelectorItem")

  const isActive = model.id === selection.id
  const isEditing = editingId === model.id
  const optionIndex = optionIds.indexOf(model.id)
  const isHighlighted = optionIndex === activeIndex && optionIndex >= 0
  const isDisabled = !!model.disabled
  const config = getConfigFor(model)
  const optionId = optionDomId(contentId, model.id)
  const isLocal = model.providerType === "local"

  const optionRef = React.useRef<HTMLDivElement | null>(null)

  React.useEffect(() => {
    if (isHighlighted) {
      optionRef.current?.scrollIntoView({ block: "nearest" })
    }
  }, [isHighlighted])

  const handleItemClick = () => {
    if (isDisabled) return
    if (!model.configured && model.requiresKey && onOpenKeySetup) {
      setOpen(false)
      onOpenKeySetup(model.providerId)
      return
    }
    selectModel(model.id)
  }

  return (
    <motion.div
      variants={reduceMotion ? itemVariantsReduced : itemVariants}
      className={cn(
        "group/item relative flex w-full items-center gap-1 rounded-xl",
        "transition-colors duration-150",
        isActive ? "text-[var(--text)] font-medium" : "text-[var(--text-secondary)]",
        isHighlighted && !isActive && "bg-[var(--surface-2)]",
        isEditing && "bg-[var(--surface-2)]",
        isDisabled && "pointer-events-none opacity-40"
      )}
      onMouseEnter={() => {
        if (!isDisabled && optionIndex >= 0) {
          setActiveIndex(optionIndex)
          if (!editingId) setPreviewId(model.id)
        }
      }}
    >
      {isActive ? (
        <motion.span
          layoutId={`${layoutGroupId}-active`}
          className="bg-[var(--surface-2)] absolute inset-0 rounded-xl"
          transition={SPRING_SOFT}
        />
      ) : null}

      <div
        ref={optionRef}
        id={optionId}
        role="option"
        aria-selected={isActive}
        aria-disabled={isDisabled || undefined}
        data-slot="model-selector-item"
        onClick={handleItemClick}
        className={cn(
          "relative z-10 flex min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-xl px-2.5 py-1.5 text-left text-xs",
          !isDisabled && "active:scale-[0.98]"
        )}
      >
        <div className="min-w-0 flex-1 flex items-center justify-between gap-1.5">
          <div className="flex flex-col min-w-0">
            <span className="text-[var(--text)] truncate font-medium">{model.label}</span>
            <span className="text-[10px] text-[var(--muted)] truncate flex items-center gap-1">
              {isLocal ? <Laptop size={9} /> : <Cloud size={9} />}
              <span>{model.providerName}</span>
            </span>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {isLocal ? (
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium">
                Local
              </span>
            ) : model.configured ? (
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium">
                Ready
              </span>
            ) : (
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center gap-0.5 font-medium">
                <Key size={9} /> Add Key
              </span>
            )}
          </div>
        </div>

        {isActive ? (
          <MenuCheckmark
            visible
            reduceMotion={reduceMotion}
            className="text-[var(--text)]"
          />
        ) : (
          <span className="size-3.5 shrink-0" aria-hidden />
        )}
      </div>

      <button
        type="button"
        data-slot="model-selector-edit"
        aria-label={`Edit ${model.label} settings`}
        disabled={isDisabled}
        onClick={(event) => {
          event.stopPropagation()
          if (isEditing) {
            setEditingId(null)
            return
          }
          patchSelection({ ...config, id: model.id })
          setEditingId(model.id)
        }}
        className={cn(
          "relative z-10 mr-1 flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-lg",
          "text-[var(--muted)] opacity-0 transition-opacity",
          "hover:bg-[var(--surface-3)] hover:text-[var(--text)]",
          "focus:outline-none group-hover/item:opacity-100",
          (isEditing || isHighlighted) && "opacity-100",
          isEditing && "bg-[var(--surface-3)] text-[var(--text)]"
        )}
      >
        <PencilIcon className="size-3" aria-hidden />
      </button>
    </motion.div>
  )
}

export type AiPromptModel = AiModel
export type AiPromptSendStatus = "idle" | "loading" | "success"
export type DictationPhase = "idle" | "recording" | "processing"

export const DEFAULT_PLACEHOLDERS = [
  "Ask anything about your workspace...",
  "Summarize this document...",
  "Extract action items and todo tasks...",
  "Draft a response or new page section...",
  "Brainstorm ideas or analyze structure...",
] as const

export const DEFAULT_MODELS: AiModel[] = DEFAULT_AI_MODELS

export interface AiPromptInputProps {
  value?: string
  defaultValue?: string
  onChange?: (value: string) => void
  onSubmit?: (value: string, selection: AiModelSelection) => void
  onOpenKeySetup?: (providerId?: string) => void
  placeholders?: readonly string[]
  placeholderInterval?: number
  models?: AiModel[]
  modelSelection?: AiModelSelection
  defaultModelSelection?: AiModelSelection
  onModelSelectionChange?: (selection: AiModelSelection) => void
  disabled?: boolean
  status?: AiPromptSendStatus
  maxLength?: number
  minRows?: number
  maxRows?: number
  showToolbar?: boolean
  showActions?: boolean
  showModelSelector?: boolean
  deepResearch?: boolean
  defaultDeepResearch?: boolean
  onDeepResearchChange?: (active: boolean) => void
  webSearch?: boolean
  defaultWebSearch?: boolean
  onWebSearchChange?: (active: boolean) => void
  onUploadFile?: () => void
  onSkills?: () => void
  onConnectors?: () => void
  getDictationTranscript?: () => string
  onDictationChange?: (listening: boolean) => void
  onVoiceChange?: (active: boolean) => void
  className?: string
  textareaClassName?: string
  "aria-label"?: string
  "data-testid"?: string
}

function assignRef<T>(
  node: T | null,
  ...refs: Array<React.Ref<T> | undefined>
) {
  for (const ref of refs) {
    if (typeof ref === "function") ref(node)
    else if (ref) (ref as React.MutableRefObject<T | null>).current = node
  }
}

function usePrefersReducedMotion() {
  const [reduceMotion, setReduceMotion] = React.useState(false)

  React.useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
    const sync = () => setReduceMotion(mq.matches)
    sync()
    mq.addEventListener("change", sync)
    return () => mq.removeEventListener("change", sync)
  }, [])

  return reduceMotion
}

function useControllableState<T>({
  value,
  defaultValue,
  onChange,
}: {
  value: T | undefined
  defaultValue: T
  onChange?: (value: T) => void
}): [T, (next: T | ((prev: T) => T)) => void] {
  const [uncontrolled, setUncontrolled] = React.useState(defaultValue)
  const isControlled = value !== undefined
  const current = isControlled ? value : uncontrolled

  const setValue = React.useCallback(
    (next: T | ((prev: T) => T)) => {
      const resolved =
        typeof next === "function" ? (next as (prev: T) => T)(current) : next
      if (!isControlled) setUncontrolled(resolved)
      onChange?.(resolved)
    },
    [isControlled, onChange, current]
  )

  return [current, setValue]
}

type MenuCoords = { top: number; left: number }

function useAnchoredMenu(disabled = false) {
  const [open, setOpen] = React.useState(false)
  const [mounted, setMounted] = React.useState(false)
  const [coords, setCoords] = React.useState<MenuCoords | null>(null)
  const triggerRef = React.useRef<HTMLButtonElement>(null)
  const contentRef = React.useRef<HTMLDivElement>(null)
  const menuId = React.useId()

  React.useEffect(() => {
    setMounted(true)
  }, [])

  React.useLayoutEffect(() => {
    if (!open) return

    const update = () => {
      const trigger = triggerRef.current
      if (!trigger) return
      const rect = trigger.getBoundingClientRect()
      setCoords({
        top: rect.top + window.scrollY - 8,
        left: rect.left + window.scrollX,
      })
    }

    update()
    window.addEventListener("resize", update)
    window.addEventListener("scroll", update, true)
    return () => {
      window.removeEventListener("resize", update)
      window.removeEventListener("scroll", update, true)
    }
  }, [open])

  React.useEffect(() => {
    if (!open) return

    const onPointer = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null
      if (!target) return
      const inTrigger = triggerRef.current?.contains(target)
      const inContent = contentRef.current?.contains(target)
      if (!inTrigger && !inContent) setOpen(false)
    }

    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return
      event.preventDefault()
      setOpen(false)
      triggerRef.current?.focus()
    }

    document.addEventListener("mousedown", onPointer)
    document.addEventListener("touchstart", onPointer)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("mousedown", onPointer)
      document.removeEventListener("touchstart", onPointer)
      document.removeEventListener("keydown", onKey)
    }
  }, [open])

  return { open, setOpen, mounted, coords, triggerRef, contentRef, menuId }
}

function AnchoredMenuPortal({
  mounted,
  open,
  coords,
  contentRef,
  id,
  role,
  "aria-label": ariaLabel,
  reduceMotion,
  className,
  children,
}: {
  mounted: boolean
  open: boolean
  coords: MenuCoords | null
  contentRef: React.RefObject<HTMLDivElement | null>
  id: string
  role: "menu" | "listbox"
  "aria-label": string
  reduceMotion: boolean
  className?: string
  children: React.ReactNode
}) {
  if (!mounted) return null

  return createPortal(
    <AnimatePresence>
      {open && coords ? (
        <motion.div
          key={id}
          ref={contentRef}
          id={id}
          role={role}
          aria-label={ariaLabel}
          {...menuPresence(reduceMotion)}
          style={{
            position: "absolute",
            top: coords.top,
            left: coords.left,
            transform: "translateY(-100%)",
            zIndex: 50,
          }}
          className={cn(MENU_PANEL_CLASS, className)}
        >
          {children}
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body
  )
}

function MenuCheckmark({
  visible,
  reduceMotion,
  className,
}: {
  visible: boolean
  reduceMotion: boolean
  className?: string
}) {
  return (
    <AnimatePresence initial={false}>
      {visible ? (
        <motion.span
          key="check"
          {...scaleBlurPresence(reduceMotion)}
          className={cn("flex shrink-0", className)}
        >
          <CheckIcon className="size-3.5" aria-hidden />
        </motion.span>
      ) : null}
    </AnimatePresence>
  )
}

function IconSwapFrame({
  swapKey,
  reduceMotion,
  children,
}: {
  swapKey: string
  reduceMotion: boolean
  children: React.ReactNode
}) {
  return (
    <motion.span
      key={swapKey}
      {...iconPresence(reduceMotion)}
      className="relative z-10 flex"
    >
      {children}
    </motion.span>
  )
}

function RotatingPlaceholder({
  phrases,
  interval,
  active,
  reduceMotion,
}: {
  phrases: readonly string[]
  interval: number
  active: boolean
  reduceMotion: boolean
}) {
  const [index, setIndex] = React.useState(0)
  const safePhrases = phrases.length > 0 ? phrases : DEFAULT_PLACEHOLDERS
  const phraseCount = safePhrases.length

  React.useEffect(() => {
    if (!active || reduceMotion || phraseCount <= 1) return
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % phraseCount)
    }, interval)
    return () => window.clearInterval(id)
  }, [active, interval, reduceMotion, phraseCount])

  const current = safePhrases[index % phraseCount] ?? safePhrases[0]

  if (!active) return null

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-x-0 top-0 px-1"
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={current}
          className="text-muted-foreground/60 block truncate text-[15px] leading-7 sm:text-base"
          {...placeholderPresence(reduceMotion)}
        >
          {current}
        </motion.span>
      </AnimatePresence>
    </div>
  )
}

function ActiveToolChip({
  label,
  icon,
  onRemove,
  reduceMotion,
}: {
  label: string
  icon: React.ReactNode
  onRemove: () => void
  reduceMotion: boolean
}) {
  return (
    <motion.span
      layout
      {...scaleBlurPresence(reduceMotion)}
      className={CHIP_SURFACE_CLASS}
    >
      <span className="flex shrink-0 [&_svg]:size-3.5">{icon}</span>
      <span>{label}</span>
      <button
        type="button"
        aria-label={`Disable ${label}`}
        onClick={onRemove}
        className="text-muted-foreground hover:text-foreground flex size-4 cursor-pointer items-center justify-center rounded-full transition-colors focus:outline-none"
      >
        <XIcon className="size-3" aria-hidden />
      </button>
    </motion.span>
  )
}

function PlusActionsMenu({
  disabled,
  reduceMotion,
  deepResearch,
  webSearch,
  onUploadFile,
  onToggleDeepResearch,
  onToggleWebSearch,
  onSkills,
  onConnectors,
}: {
  disabled?: boolean
  reduceMotion: boolean
  deepResearch: boolean
  webSearch: boolean
  onUploadFile?: () => void
  onToggleDeepResearch: () => void
  onToggleWebSearch: () => void
  onSkills?: () => void
  onConnectors?: () => void
}) {
  const { open, setOpen, mounted, coords, triggerRef, contentRef, menuId } =
    useAnchoredMenu(disabled)

  const runAndClose = (action?: () => void) => {
    action?.()
    setOpen(false)
  }

  return (
    <div className="relative">
      <motion.button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label="Open actions"
        onClick={() => setOpen((v) => !v)}
        whileHover={disabled ? undefined : { scale: 1.05 }}
        whileTap={disabled ? undefined : { scale: 0.96 }}
        transition={SPRING_PRESS}
        className={cn(
          TOOLBAR_BTN_CLASS,
          "text-muted-foreground",
          open && "bg-muted text-foreground"
        )}
      >
        <motion.span
          animate={{ rotate: open ? 45 : 0 }}
          transition={{ duration: 0.2, ease: EASE }}
          className="flex [&_svg]:size-4"
        >
          <PlusIcon aria-hidden />
        </motion.span>
      </motion.button>

      <AnchoredMenuPortal
        mounted={mounted}
        open={open}
        coords={coords}
        contentRef={contentRef}
        id={menuId}
        role="menu"
        aria-label="Actions"
        reduceMotion={reduceMotion}
        className="min-w-52"
      >
        <div className="flex flex-col gap-0.5">
          <button
            type="button"
            className="flex items-center gap-2.5 px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground rounded-lg transition-colors text-left"
            onClick={() => runAndClose(onUploadFile)}
          >
            <UploadIcon className="size-3.5 opacity-70" aria-hidden />
            <span>Upload file</span>
          </button>

          <button
            type="button"
            className={cn(
              "flex items-center justify-between gap-2.5 px-2.5 py-1.5 text-xs rounded-lg transition-colors text-left",
              deepResearch ? "bg-muted text-foreground font-medium" : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
            onClick={() => runAndClose(onToggleDeepResearch)}
          >
            <div className="flex items-center gap-2.5">
              <TelescopeIcon className="size-3.5 opacity-70" aria-hidden />
              <span>Deep research</span>
            </div>
            <MenuCheckmark visible={deepResearch} reduceMotion={reduceMotion} />
          </button>

          <button
            type="button"
            className={cn(
              "flex items-center justify-between gap-2.5 px-2.5 py-1.5 text-xs rounded-lg transition-colors text-left",
              webSearch ? "bg-muted text-foreground font-medium" : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
            onClick={() => runAndClose(onToggleWebSearch)}
          >
            <div className="flex items-center gap-2.5">
              <GlobeIcon className="size-3.5 opacity-70" aria-hidden />
              <span>Web search</span>
            </div>
            <MenuCheckmark visible={webSearch} reduceMotion={reduceMotion} />
          </button>

          <div role="separator" className="bg-border my-1 h-px" />

          <button
            type="button"
            className="flex items-center gap-2.5 px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground rounded-lg transition-colors text-left"
            onClick={() => runAndClose(onSkills)}
          >
            <PuzzleIcon className="size-3.5 opacity-70" aria-hidden />
            <span>Skills</span>
          </button>

          <button
            type="button"
            className="flex items-center gap-2.5 px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground rounded-lg transition-colors text-left"
            onClick={() => runAndClose(onConnectors)}
          >
            <UnplugIcon className="size-3.5 opacity-70" aria-hidden />
            <span>Connectors</span>
          </button>
        </div>
      </AnchoredMenuPortal>
    </div>
  )
}

const WAVE_BARS = [0.35, 0.7, 0.45, 0.9, 0.55, 0.8, 0.4] as const

function DictationWaveform({
  processing,
  reduceMotion,
}: {
  processing: boolean
  reduceMotion: boolean
}) {
  return (
    <motion.div
      layout
      {...statusPresence(reduceMotion)}
      className="bg-muted text-foreground flex h-9 items-center gap-2 rounded-xl px-2.5 shadow-2xs"
      aria-hidden
    >
      {processing ? (
        <span className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium">
          <Loader2Icon className="size-3.5 animate-spin" />
          Processing
        </span>
      ) : (
        <div className="flex h-4 items-end gap-[3px]">
          {WAVE_BARS.map((base, index) => (
            <motion.span
              key={index}
              className="bg-foreground w-[3px] origin-bottom rounded-full"
              initial={{ height: 4 }}
              animate={
                reduceMotion
                  ? { height: Math.max(4, base * 14) }
                  : {
                      height: [
                        Math.max(3, base * 6),
                        Math.max(8, base * 16),
                        Math.max(4, base * 9),
                        Math.max(10, base * 14),
                      ],
                    }
              }
              transition={
                reduceMotion
                  ? { duration: 0 }
                  : {
                      duration: 0.7 + index * 0.08,
                      repeat: Infinity,
                      ease: "easeInOut",
                      delay: index * 0.05,
                    }
              }
            />
          ))}
        </div>
      )}
    </motion.div>
  )
}

function VoiceModeBadge({ reduceMotion }: { reduceMotion: boolean }) {
  return (
    <motion.div
      layout
      {...statusPresence(reduceMotion)}
      className="bg-muted text-foreground flex h-9 items-center gap-2 rounded-xl px-2.5 shadow-2xs"
      role="status"
    >
      <motion.span
        className="flex"
        animate={reduceMotion ? undefined : { opacity: [0.55, 1, 0.55] }}
        transition={{ duration: 1.4, ease: EASE, repeat: Infinity }}
      >
        <AudioLinesIcon className="size-3.5" aria-hidden />
      </motion.span>
      <span className="text-xs font-medium tracking-tight">Voice mode</span>
    </motion.div>
  )
}

function MicButton({
  disabled,
  phase,
  onToggle,
  reduceMotion,
}: {
  disabled?: boolean
  phase: DictationPhase
  onToggle: () => void
  reduceMotion: boolean
}) {
  const active = phase === "recording"
  const processing = phase === "processing"
  const label =
    phase === "recording"
      ? "Stop recording"
      : phase === "processing"
        ? "Processing voice"
        : "Start dictation"

  return (
    <motion.button
      type="button"
      aria-label={label}
      disabled={disabled || processing}
      onClick={onToggle}
      whileHover={disabled || processing ? undefined : { scale: 1.05 }}
      whileTap={disabled || processing ? undefined : { scale: 0.96 }}
      transition={SPRING_PRESS}
      className={cn(
        TOOLBAR_BTN_CLASS,
        active || processing ? "bg-muted text-foreground" : "text-muted-foreground"
      )}
    >
      <AnimatePresence mode="wait" initial={false}>
        {processing ? (
          <IconSwapFrame swapKey="processing" reduceMotion={reduceMotion}>
            <Loader2Icon className="size-4 animate-spin" aria-hidden />
          </IconSwapFrame>
        ) : active ? (
          <IconSwapFrame swapKey="stop" reduceMotion={reduceMotion}>
            <SquareIcon className="size-3.5 fill-current" aria-hidden />
          </IconSwapFrame>
        ) : (
          <IconSwapFrame swapKey="mic" reduceMotion={reduceMotion}>
            <MicIcon className="size-4" aria-hidden />
          </IconSwapFrame>
        )}
      </AnimatePresence>
    </motion.button>
  )
}

function ActionButton({
  disabled,
  status,
  hasText,
  talking,
  onSend,
  onTalkToggle,
  reduceMotion,
}: {
  disabled?: boolean
  status: AiPromptSendStatus
  hasText: boolean
  talking: boolean
  onSend: () => void
  onTalkToggle: () => void
  reduceMotion: boolean
}) {
  const isLoading = status === "loading"
  const isSuccess = status === "success"
  const showSend = !talking && (hasText || isLoading || isSuccess)
  const isDisabled = talking ? false : disabled || isLoading

  const label = talking
    ? "Stop voice conversation"
    : isLoading
      ? "Sending"
      : isSuccess
        ? "Sent"
        : showSend
          ? "Send message"
          : "Talk with AI"

  return (
    <motion.button
      type="button"
      aria-label={label}
      disabled={isDisabled}
      onClick={() => {
        if (talking || !showSend) onTalkToggle()
        else onSend()
      }}
      whileHover={isDisabled ? undefined : { scale: 1.05 }}
      whileTap={isDisabled ? undefined : { scale: 0.94 }}
      transition={SPRING_PRESS}
      className={cn(
        "relative flex size-9 cursor-pointer items-center justify-center overflow-hidden rounded-full transition-all duration-200",
        "focus:outline-none focus-visible:outline-none",
        "disabled:pointer-events-none",
        showSend || talking
          ? "bg-foreground text-background shadow-sm hover:opacity-90"
          : "bg-muted text-muted-foreground hover:text-foreground"
      )}
    >
      <AnimatePresence mode="wait" initial={false}>
        {talking ? (
          <IconSwapFrame swapKey="stop" reduceMotion={reduceMotion}>
            <SquareIcon className="size-3.5 fill-current" aria-hidden />
          </IconSwapFrame>
        ) : isLoading ? (
          <IconSwapFrame swapKey="loader" reduceMotion={reduceMotion}>
            <Loader2Icon className="size-4 animate-spin" aria-hidden />
          </IconSwapFrame>
        ) : isSuccess ? (
          <IconSwapFrame swapKey="check" reduceMotion={reduceMotion}>
            <CheckIcon className="size-4" aria-hidden />
          </IconSwapFrame>
        ) : showSend ? (
          <IconSwapFrame swapKey="arrow" reduceMotion={reduceMotion}>
            <ArrowUpIcon className="size-4" aria-hidden />
          </IconSwapFrame>
        ) : (
          <IconSwapFrame swapKey="waves" reduceMotion={reduceMotion}>
            <AudioLinesIcon className="size-4" aria-hidden />
          </IconSwapFrame>
        )}
      </AnimatePresence>
    </motion.button>
  )
}

const AiPromptInput = React.forwardRef<HTMLTextAreaElement, AiPromptInputProps>(
  (
    {
      value: valueProp,
      defaultValue = "",
      onChange,
      onSubmit,
      onOpenKeySetup,
      placeholders = DEFAULT_PLACEHOLDERS,
      placeholderInterval = 3200,
      models = getRealAiModels(),
      modelSelection: modelSelectionProp,
      defaultModelSelection,
      onModelSelectionChange,
      disabled = false,
      status = "idle",
      maxLength = 4000,
      minRows = 1,
      maxRows = 8,
      showToolbar = true,
      showActions = true,
      showModelSelector = true,
      deepResearch: deepResearchProp,
      defaultDeepResearch = false,
      onDeepResearchChange,
      webSearch: webSearchProp,
      defaultWebSearch = false,
      onWebSearchChange,
      onUploadFile,
      onSkills,
      onConnectors,
      getDictationTranscript,
      onDictationChange,
      onVoiceChange,
      className,
      textareaClassName,
      "aria-label": ariaLabel = "AI prompt",
      "data-testid": dataTestId,
    },
    ref
  ) => {
    const [value, setValue] = useControllableState({
      value: valueProp,
      defaultValue,
      onChange,
    })

    const initialSelection =
      defaultModelSelection ??
      (models[0] ? defaultSelectionFor(models[0]) : { id: "" })
    const [modelSelection, setModelSelection] = useControllableState({
      value: modelSelectionProp,
      defaultValue: initialSelection,
      onChange: onModelSelectionChange,
    })

    const [deepResearch, setDeepResearch] = useControllableState({
      value: deepResearchProp,
      defaultValue: defaultDeepResearch,
      onChange: onDeepResearchChange,
    })

    const [webSearch, setWebSearch] = useControllableState({
      value: webSearchProp,
      defaultValue: defaultWebSearch,
      onChange: onWebSearchChange,
    })

    const [focused, setFocused] = React.useState(false)
    const [height, setHeight] = React.useState<number | "auto">("auto")
    const reduceMotion = usePrefersReducedMotion()
    const [dictationPhase, setDictationPhase] =
      React.useState<DictationPhase>("idle")
    const [talking, setTalking] = React.useState(false)

    const valueRef = React.useRef(value)
    valueRef.current = value
    const textareaRef = React.useRef<HTMLTextAreaElement | null>(null)
    const mirrorRef = React.useRef<HTMLDivElement | null>(null)
    const fieldId = React.useId()

    const trimmed = value.trim()
    const hasText = trimmed.length > 0
    const showPlaceholder = value.length === 0 && !focused
    const hasActiveTools = deepResearch || webSearch
    const dictating = dictationPhase !== "idle"
    const sessionLocked = dictating || talking

    React.useEffect(() => {
      if (!hasText || !talking) return
      setTalking(false)
      onVoiceChange?.(false)
    }, [hasText, talking, onVoiceChange])

    const resize = React.useCallback(() => {
      const el = textareaRef.current
      const mirror = mirrorRef.current
      if (!el) return

      const styles = window.getComputedStyle(el)
      const lineHeight = Number.parseFloat(styles.lineHeight) || 28
      const paddingY =
        Number.parseFloat(styles.paddingTop) +
        Number.parseFloat(styles.paddingBottom)
      const minH = lineHeight * minRows + paddingY
      const maxH = lineHeight * maxRows + paddingY

      if (mirror) {
        mirror.style.width = `${el.clientWidth}px`
        mirror.textContent = value.endsWith("\n") ? `${value} ` : value || " "
        const next = Math.min(Math.max(mirror.scrollHeight, minH), maxH)
        setHeight(next)
        el.style.overflowY = mirror.scrollHeight > maxH ? "auto" : "hidden"
      } else {
        el.style.height = "auto"
        const next = Math.min(Math.max(el.scrollHeight, minH), maxH)
        setHeight(next)
        el.style.overflowY = el.scrollHeight > maxH ? "auto" : "hidden"
      }
    }, [value, minRows, maxRows])

    React.useLayoutEffect(() => {
      resize()
    }, [resize])

    const submit = React.useCallback(() => {
      if (disabled || status === "loading" || !trimmed) return
      onSubmit?.(trimmed, modelSelection)
    }, [disabled, status, trimmed, onSubmit, modelSelection])

    const toggleDictation = React.useCallback(() => {
      if (disabled) return
      const next = dictationPhase === "idle" ? "recording" : "idle"
      setDictationPhase(next)
      onDictationChange?.(next === "recording")
    }, [disabled, dictationPhase, onDictationChange])

    const toggleTalk = React.useCallback(() => {
      if (disabled) return
      const next = !talking
      setTalking(next)
      onVoiceChange?.(next)
    }, [disabled, talking, onVoiceChange])

    const onKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (
        event.key === "Enter" &&
        !event.shiftKey &&
        !event.nativeEvent.isComposing
      ) {
        event.preventDefault()
        submit()
      }
    }

    return (
      <div
        data-slot="ai-prompt-input"
        data-focused={focused || undefined}
        data-disabled={disabled || undefined}
        className={cn(
          "bg-popover relative w-full overflow-visible rounded-[1.75rem] border border-border/80 p-3.5 sm:p-4",
          "shadow-[0_8px_30px_rgb(0,0,0,0.06)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.35)]",
          "transition-[box-shadow,border-color] duration-200",
          focused && "border-border shadow-[0_12px_36px_rgb(0,0,0,0.09)] dark:shadow-[0_12px_36px_rgba(0,0,0,0.45)]",
          disabled && "pointer-events-none opacity-55",
          className
        )}
        data-testid={dataTestId}
      >
        <div
          ref={mirrorRef}
          aria-hidden
          className="invisible absolute top-0 left-0 -z-10 px-1 text-[15px] leading-7 break-words whitespace-pre-wrap sm:text-base"
        />

        <AnimatePresence initial={false}>
          {hasActiveTools ? (
            <motion.div
              key="active-tools"
              initial={false}
              className="mb-2.5 flex flex-wrap items-center gap-1.5 px-0.5"
            >
              <AnimatePresence initial={false} mode="popLayout">
                {deepResearch ? (
                  <ActiveToolChip
                    key="deep-research"
                    label="Deep research"
                    icon={<TelescopeIcon aria-hidden />}
                    reduceMotion={reduceMotion}
                    onRemove={() => setDeepResearch(false)}
                  />
                ) : null}
                {webSearch ? (
                  <ActiveToolChip
                    key="web-search"
                    label="Web search"
                    icon={<GlobeIcon aria-hidden />}
                    reduceMotion={reduceMotion}
                    onRemove={() => setWebSearch(false)}
                  />
                ) : null}
              </AnimatePresence>
            </motion.div>
          ) : null}
        </AnimatePresence>

        <div
          className={cn(
            "relative min-h-7 transition-opacity duration-200",
            talking && "pointer-events-none opacity-40"
          )}
        >
          <RotatingPlaceholder
            phrases={placeholders}
            interval={placeholderInterval}
            active={showPlaceholder && !talking}
            reduceMotion={reduceMotion}
          />

          <motion.textarea
            id={fieldId}
            ref={(node) => assignRef(node, ref, textareaRef)}
            value={value}
            disabled={disabled || sessionLocked}
            rows={minRows}
            maxLength={maxLength}
            aria-label={ariaLabel}
            aria-multiline="true"
            onChange={(event) => setValue(event.target.value)}
            onKeyDown={onKeyDown}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            animate={
              reduceMotion
                ? undefined
                : { height: typeof height === "number" ? height : undefined }
            }
            transition={SPRING_HEIGHT}
            className={cn(
              "text-foreground relative z-10 block w-full resize-none bg-transparent px-1",
              "text-[15px] leading-7 sm:text-base",
              "placeholder:text-transparent",
              "border-0 outline-none ring-0 shadow-none",
              "focus:border-0 focus:outline-none focus:ring-0 focus:shadow-none",
              "focus-visible:border-0 focus-visible:outline-none focus-visible:ring-0 focus-visible:shadow-none",
              "disabled:cursor-not-allowed",
              "caret-foreground",
              textareaClassName
            )}
            style={{
              border: "none",
              outline: "none",
              boxShadow: "none",
              ...(reduceMotion && typeof height === "number" ? { height } : {})
            }}
          />
        </div>

        <AnimatePresence initial={false}>
          {showToolbar ? (
            <motion.div
              key="toolbar"
              initial={false}
              className="border-border mt-3 flex items-center justify-between gap-2 border-t pt-3"
            >
              <div
                className={cn(
                  "flex min-w-0 items-center gap-0.5 sm:gap-1",
                  sessionLocked && "pointer-events-none opacity-40"
                )}
              >
                {showActions ? (
                  <PlusActionsMenu
                    disabled={disabled || sessionLocked}
                    reduceMotion={reduceMotion}
                    deepResearch={deepResearch}
                    webSearch={webSearch}
                    onUploadFile={onUploadFile}
                    onToggleDeepResearch={() => setDeepResearch(!deepResearch)}
                    onToggleWebSearch={() => setWebSearch(!webSearch)}
                    onSkills={onSkills}
                    onConnectors={onConnectors}
                  />
                ) : null}

                {showModelSelector && models.length > 0 ? (
                  <ModelSelector
                    models={models}
                    value={modelSelection}
                    onValueChange={setModelSelection}
                    onOpenKeySetup={onOpenKeySetup}
                    disabled={disabled || sessionLocked}
                  >
                    <ModelSelectorTrigger className="h-8">
                      <ModelSelectorValue className="max-w-44 sm:max-w-64" />
                    </ModelSelectorTrigger>
                    <ModelSelectorContent side="top" />
                  </ModelSelector>
                ) : null}
              </div>

              <div className="flex shrink-0 items-center gap-1.5">
                <AnimatePresence initial={false}>
                  {dictating ? (
                    <DictationWaveform
                      key="dictation-wave"
                      processing={dictationPhase === "processing"}
                      reduceMotion={reduceMotion}
                    />
                  ) : null}
                  {talking ? (
                    <VoiceModeBadge
                      key="voice-mode"
                      reduceMotion={reduceMotion}
                    />
                  ) : null}
                </AnimatePresence>

                <MicButton
                  disabled={disabled || status === "loading" || talking}
                  phase={dictationPhase}
                  onToggle={toggleDictation}
                  reduceMotion={reduceMotion}
                />
                <ActionButton
                  disabled={disabled || dictationPhase !== "idle"}
                  status={status}
                  hasText={hasText}
                  talking={talking}
                  onSend={submit}
                  onTalkToggle={toggleTalk}
                  reduceMotion={reduceMotion}
                />
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    )
  }
)

AiPromptInput.displayName = "AiPromptInput"

export { AiPromptInput }
export default AiPromptInput
