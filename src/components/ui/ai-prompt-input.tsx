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
  CircleHelp,
  Check,
  RotateCw,
  AlertTriangle,
  Brain,
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
import { modelCatalogService, KNOWN_DEPRECATIONS, type ModelDeprecationInfo } from "../../ai/ModelCatalogService"
import { modelRegistry } from "../../ai/models/ModelRegistry"
import { formatDefaultDisplayName } from "../../ai/models/ModelMetadataOverrides"
import { VoiceInput } from "./voice-input"
import { globalVoiceController } from "../../lib/voice/voice-controller"
import { AdaptiveSlider, AdaptiveReasoningSlider } from "./adaptive-slider"
import { liquidMetalFragmentShader, ShaderMount } from "@paper-design/shaders"

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const EASE = [0.16, 1, 0.3, 1] as const
const SPRING_APPLE = { type: "spring" as const, stiffness: 440, damping: 30, mass: 0.8 }
const SPRING_SOFT = { type: "spring" as const, stiffness: 420, damping: 32 }
const SPRING_HEIGHT = { type: "spring" as const, stiffness: 380, damping: 34 }
const SPRING_PRESS = { type: "spring" as const, stiffness: 500, damping: 28 }
const SPRING_ICON = { type: "spring" as const, duration: 0.28, bounce: 0 }

const MENU_PANEL_CLASS = cn(
  "bg-[#fdfcfb]/95 dark:bg-[#16171a]/95 text-[#1c1b18] dark:text-[#ececec] origin-bottom-left overflow-hidden rounded-2xl border border-black/[0.08] dark:border-white/[0.09] p-1",
  "shadow-[0_20px_50px_-12px_rgba(0,0,0,0.18),0_0_1px_1px_rgba(0,0,0,0.04),inset_0_1px_0_0_rgba(255,255,255,0.8)] dark:shadow-[0_24px_60px_-12px_rgba(0,0,0,0.7),0_0_1px_1px_rgba(255,255,255,0.06),inset_0_1px_0_0_rgba(255,255,255,0.1)]",
  "backdrop-blur-2xl backdrop-saturate-150"
)

const CHIP_SURFACE_CLASS = cn(
  "bg-muted text-foreground inline-flex items-center gap-1.5 rounded-full py-1 pr-1 pl-2 text-xs font-medium",
  "shadow-[inset_0_0_0_1px_rgba(123,123,123,0.12)]"
)

const TOOLBAR_BTN_CLASS = cn(
  "relative flex size-9 cursor-pointer items-center justify-center rounded-xl",
  "transition-[background-color,color,box-shadow,opacity,transform] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]",
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
    initial: { opacity: 0, scale: 0.88, y: 8, filter: "blur(10px)" },
    animate: { opacity: 1, scale: 1, y: 0, filter: "blur(0px)" },
    exit: {
      opacity: 0,
      scale: 0.88,
      y: 6,
      filter: "blur(6px)",
      transition: { duration: 0.15, ease: [0.32, 0, 0.67, 0] },
    },
    transition: SPRING_APPLE,
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
    initial: { opacity: 0, x: -10, scale: 0.92, filter: "blur(8px)" },
    animate: { opacity: 1, x: 0, scale: 1, filter: "blur(0px)" },
    exit: {
      opacity: 0,
      x: -6,
      scale: 0.94,
      filter: "blur(4px)",
      transition: { duration: 0.14, ease: [0.32, 0, 0.67, 0] },
    },
    transition: SPRING_APPLE,
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

export type AiModelEffort = "low" | "medium" | "high"

export type AiModel = {
  id: string
  label: string
  providerId: string
  providerName: string
  providerType: "cloud" | "local"
  configured: boolean
  requiresKey: boolean
  description?: string
  status?: "active" | "deprecating" | "discontinued"
  sunsetDate?: string
  deprecationReason?: string
  suggestedReplacement?: string
  efforts?: AiModelEffort[]
  contexts?: Array<string | number>
  supportsFast?: boolean
  supportsThinking?: boolean
  defaultEffort?: AiModelEffort
  defaultContext?: string | number
  defaultFast?: boolean
  defaultThinking?: boolean
  disabled?: boolean
  freeBadge?: string
  freeAccessConditions?: string[]
}

export type AiModelSelection = {
  id: string
  providerId?: string
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

export function getAccurateContextForModel(modelId: string, reportedContext?: number | string): string {
  const id = modelId.toLowerCase()
  if (id.includes("gemini-2.5-pro") || id.includes("gemini-3.1-pro") || id.includes("gemini-1.5-pro")) return "2M"
  if (id.includes("gemini-2.5-flash") || id.includes("gemini-3.7-flash") || id.includes("gemini-3.6-flash") || id.includes("gemini-3.5-flash") || id.includes("gemini-2.0") || id.includes("gemini-1.5-flash")) return "1M"
  if (id.includes("claude-3-7") || id.includes("claude-sonnet-4") || id.includes("claude-opus-4") || id.includes("claude-3-5") || id.includes("claude-3-opus") || id.includes("claude-3-haiku")) return "200K"
  if (id.includes("o1") || id.includes("o3") || id.includes("o4-mini")) return "200K"
  if (id.includes("gpt-4o") || id.includes("gpt-4-turbo") || id.includes("gpt-4o-mini")) return "128K"
  if (id.includes("llama-3.3") || id.includes("llama-3.1") || id.includes("llama3.3") || id.includes("llama3.1")) return "128K"
  if (id.includes("qwen-2.5") || id.includes("qwen2.5")) return "128K"
  if (id.includes("deepseek-r1") || id.includes("deepseek-v3") || id.includes("deepseek")) return "64K"
  if (id.includes("mistral-large") || id.includes("codestral")) return "128K"
  
  if (reportedContext) {
    const formatted = formatContext(reportedContext)
    if (formatted) return formatted
  }
  return "128K"
}

export function isModelFast(modelId: string): boolean {
  const id = modelId.toLowerCase()
  if (
    id.includes("flash-lite") ||
    id.includes("gemini-2.5-flash") ||
    id.includes("gemini-2.0-flash") ||
    id.includes("gemini-1.5-flash") ||
    id.includes("haiku") ||
    id.includes("gpt-4o-mini") ||
    id.includes("llama-3.1-8b") ||
    id.includes("llama-3.2") ||
    id.includes("qwen-2.5-coder:7b") ||
    id.includes("qwen-2.5-coder-7b") ||
    id.includes("mistral-small") ||
    id.includes("groq")
  ) {
    if (id.includes("pro") || id.includes("opus") || id.includes("o1") || id.includes("o3") || id.includes("70b") || id.includes("r1") || id.includes("sonnet")) {
      return false
    }
    return true
  }
  return false
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

/** Generates real models populated from the dynamic ModelRegistry & live catalog */
export function getRealAiModels(): AiModel[] {
  try {
    const registryModels = modelRegistry.getAllModels()
    const statuses = aiManager.getProviderStatuses()
    const list: AiModel[] = []
    const seenIds = new Set<string>()

    // 1. Convert dynamic ModelRegistry models
    if (registryModels.length > 0) {
      for (const m of registryModels) {
        if (seenIds.has(m.id)) continue
        seenIds.add(m.id)

        const statusEntry = statuses.find(p => p.id === m.provider)
        const isLocal = m.provider === "ollama" || m.provider === "lmstudio" || m.source === "local" || m.localState?.available
        const isConfigured = statusEntry ? statusEntry.configured : false
        const ctxStr = getAccurateContextForModel(m.apiModelId, m.contextWindow)

        let freeBadge: string | undefined = undefined
        if (isLocal) {
          freeBadge = "[Local]"
        } else if (m.freeAccess?.isFree) {
          freeBadge = m.freeAccess.conditions?.some(c => c.toLowerCase().includes("rate limit"))
            ? "[Free • Limited]"
            : "[Free]"
        }

        list.push({
          id: m.id,
          label: m.displayName,
          providerId: m.provider,
          providerName: statusEntry?.name || formatDefaultDisplayName(m.provider),
          providerType: isLocal ? "local" : "cloud",
          configured: isConfigured,
          requiresKey: !isLocal,
          freeBadge,
          freeAccessConditions: m.freeAccess?.conditions,
          status: m.status === "shutdown" ? "discontinued" : m.status === "deprecated" ? "deprecating" : "active",
          description: m.description || (isLocal
            ? `Runs locally on your device via ${formatDefaultDisplayName(m.provider)} (100% private, offline).`
            : `${statusEntry?.name || m.provider} · ${isConfigured ? "Key configured" : "API key required"} (${ctxStr} token context window).`),
          efforts: ["high", "medium", "low"],
          contexts: [ctxStr],
          supportsFast: m.capabilities.streaming,
          supportsThinking: m.capabilities.reasoning,
          defaultEffort: m.capabilities.reasoning ? "high" : "medium",
          defaultContext: ctxStr,
          defaultFast: true,
          defaultThinking: m.capabilities.reasoning,
        })
      }
    }

    // 2. Add any configured provider models not yet discovered
    for (const p of statuses) {
      let pModels = p.models || []
      if (pModels.length === 0 && DEFAULT_LOCAL_MODELS[p.id as keyof typeof DEFAULT_LOCAL_MODELS]) {
        pModels = DEFAULT_LOCAL_MODELS[p.id as keyof typeof DEFAULT_LOCAL_MODELS]
      }

      for (const m of pModels) {
        if (seenIds.has(m.id)) continue
        seenIds.add(m.id)

        const ctxStr = getAccurateContextForModel(m.id, m.context)
        const isLocal = p.type === "local"
        const isDeepThink = m.id.toLowerCase().includes("r1") || m.id.toLowerCase().includes("pro") || m.id.toLowerCase().includes("opus") || m.id.toLowerCase().includes("o1") || m.id.toLowerCase().includes("o3") || m.id.toLowerCase().includes("thinking")
        const isFast = isModelFast(m.id)
        const dep = modelCatalogService.getDeprecationInfo(m.id)

        list.push({
          id: m.id,
          label: m.name || m.id,
          providerId: p.id,
          providerName: p.name,
          providerType: isLocal ? "local" : "cloud",
          configured: p.configured,
          requiresKey: !isLocal,
          status: dep?.isDiscontinued ? "discontinued" : dep?.isDeprecating ? "deprecating" : "active",
          sunsetDate: dep?.sunsetDate,
          deprecationReason: dep?.reason,
          suggestedReplacement: dep?.suggestedReplacement,
          description: isLocal
            ? `Runs locally on your device via ${p.name} (100% private, offline).`
            : `${p.name} · ${p.configured ? "Key configured" : "API key required"} (${ctxStr} token context window).`,
          efforts: ["high", "medium", "low"],
          contexts: [ctxStr],
          supportsFast: isFast,
          supportsThinking: isDeepThink,
          defaultEffort: "high",
          defaultContext: ctxStr,
          defaultFast: isFast,
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
    id: "google/gemini-2.5-flash",
    label: "Gemini 3.7 Flash Medium",
    providerId: "openrouter",
    providerName: "OpenRouter",
    providerType: "cloud",
    configured: false,
    requiresKey: true,
    description: "Ultra-fast multimodal reasoning with hybrid thinking.",
    efforts: ["high", "medium", "low"],
    contexts: ["1M"],
    supportsFast: true,
    supportsThinking: true,
    defaultEffort: "medium",
    defaultContext: "1M",
    defaultFast: true,
  },
  {
    id: "anthropic/claude-sonnet-4-20250514",
    label: "Claude Sonnet 4.6 (Thinking)",
    providerId: "openrouter",
    providerName: "OpenRouter",
    providerType: "cloud",
    configured: false,
    requiresKey: true,
    description: "State-of-the-art reasoning, code architecture, and deep analysis.",
    efforts: ["high", "medium", "low"],
    contexts: ["200K"],
    supportsFast: true,
    supportsThinking: true,
    defaultEffort: "high",
    defaultContext: "200K",
    defaultFast: true,
  },
  {
    id: "anthropic/claude-opus-4-20250514",
    label: "Claude Opus 4.6 (Thinking)",
    providerId: "openrouter",
    providerName: "OpenRouter",
    providerType: "cloud",
    configured: false,
    requiresKey: true,
    description: "Maximum intelligence and creative synthesis.",
    efforts: ["high", "medium", "low"],
    contexts: ["200K"],
    supportsFast: false,
    supportsThinking: true,
    defaultEffort: "high",
    defaultContext: "200K",
    defaultFast: false,
  },
  {
    id: "google/gemini-2.5-pro",
    label: "Gemini 3.1 Pro Low",
    providerId: "openrouter",
    providerName: "OpenRouter",
    providerType: "cloud",
    configured: false,
    requiresKey: true,
    description: "Deep reasoning across millions of document tokens.",
    efforts: ["high", "medium", "low"],
    contexts: ["2M"],
    supportsFast: true,
    supportsThinking: true,
    defaultEffort: "low",
    defaultContext: "2M",
    defaultFast: true,
  },
  {
    id: "openai/gpt-4o",
    label: "GPT-4o (Omni)",
    providerId: "openrouter",
    providerName: "OpenRouter",
    providerType: "cloud",
    configured: false,
    requiresKey: true,
    description: "Versatile reasoning, writing, and instruction execution.",
    efforts: ["high", "medium", "low"],
    contexts: ["128K"],
    supportsFast: true,
    supportsThinking: false,
    defaultEffort: "high",
    defaultContext: "128K",
    defaultFast: true,
  },
  {
    id: "deepseek/deepseek-r1",
    label: "DeepSeek R1 (Thinking)",
    providerId: "openrouter",
    providerName: "OpenRouter",
    providerType: "cloud",
    configured: false,
    requiresKey: true,
    description: "Open-weight reasoning powerhouse with chain of thought.",
    efforts: ["high", "medium", "low"],
    contexts: ["64K"],
    supportsFast: false,
    supportsThinking: true,
    defaultEffort: "high",
    defaultContext: "64K",
    defaultFast: false,
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
        <Key size={11} className="text-purple-500 shrink-0" />
        <span className="whitespace-nowrap">Setup API Key</span>
      </span>
    )
  }

  const mods: string[] = []
  if (selection.fast && !selection.thinking) mods.push("Fast")
  if (selection.thinking) mods.push("Thinking")

  return (
    <span className={cn("flex min-w-0 items-center gap-1.5", className)}>
      <span className="text-foreground truncate font-medium">{model.label}</span>
      {model.freeBadge && (
        <span
          className={cn(
            "text-[9px] px-1 py-0.2 rounded font-medium shrink-0",
            model.freeBadge === "[Local]"
              ? "bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20"
              : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
          )}
        >
          {model.freeBadge}
        </span>
      )}
      {mods.map((mod) => (
        <span
          key={mod}
          className="text-muted-foreground/70 shrink-0 font-medium text-xs"
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
    selection,
  } = useModelSelectorContext("ModelSelectorContent")

  const computeCoords = React.useCallback(() => {
    const trigger = triggerRef.current
    if (!trigger) return null
    const rect = trigger.getBoundingClientRect()
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight

    // Anchor right above the trigger button to always open upward
    const popupWidth = Math.min(340, viewportWidth - 24)
    const left = Math.max(12, Math.min(rect.left, viewportWidth - popupWidth - 12))
    const bottom = Math.max(12, viewportHeight - rect.top + 8)
    const maxH = Math.min(500, Math.max(260, rect.top - 16))
    const originX = Math.max(16, Math.min(rect.left - left + rect.width / 2, popupWidth - 16))

    return {
      bottom,
      left,
      maxHeight: maxH,
      originX: `${originX}px`,
    }
  }, [triggerRef])

  const [mounted, setMounted] = React.useState(false)
  const [coords, setCoords] = React.useState<{
    bottom: number
    left: number
    maxHeight?: number
    originX?: string
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
      const calculated = computeCoords()
      if (calculated) setCoords(calculated)
    }

    update()
    window.addEventListener("resize", update)
    window.addEventListener("scroll", update, true)
    return () => {
      window.removeEventListener("resize", update)
      window.removeEventListener("scroll", update, true)
    }
  }, [open, computeCoords])

  if (!mounted) return null

  const activeCoords = coords ?? (open ? computeCoords() : null)
  const list = children ?? <ModelSelectorDefaultItems />
  const editingModel = models.find((m) => m.id === editingId)
  const previewModel = models.find((m) => m.id === previewId)
  const activeModel = models.find((m) => m.id === selection.id) || models[0]
  const panelModel = editingModel ?? previewModel ?? activeModel
  const activeModelId = optionIds[activeIndex]
  const activeOptionId = activeModelId
    ? optionDomId(contentId, activeModelId)
    : undefined

  return createPortal(
    <AnimatePresence>
      {open && activeCoords ? (
        <motion.div
          key={contentId}
          ref={(node) => assignRef(node, ref, contentRef)}
          data-slot="model-selector-content"
          data-editing={editingId ? "" : undefined}
          {...menuPresence(reduceMotion)}
          style={{
            position: "fixed",
            bottom: `${activeCoords.bottom}px`,
            left: `${activeCoords.left}px`,
            maxHeight: `${activeCoords.maxHeight}px`,
            transformOrigin: `${activeCoords.originX || '24px'} bottom`,
            zIndex: 50,
            ...style,
          }}
          className={cn("flex items-end gap-1.5", className)}
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

export function ProviderIcon({ providerId, className }: { providerId: string; className?: string }) {
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
  const { models, layoutGroupId, reduceMotion, editingId, setPreviewId, onOpenKeySetup, setOpen, selection, patchSelection } =
    useModelSelectorContext("ModelSelectorDefaultItems")

  const [activeTab, setActiveTab] = React.useState<"providers" | "models">("models")
  const [modelCategory, setModelCategory] = React.useState<"all" | "ready" | "flagship" | "reasoning" | "local" | "connect" | "sunset">("all")
  const [selectedProviderId, setSelectedProviderId] = React.useState<string | null>(null)
  const [search, setSearch] = React.useState("")

  const handleCategoryClick = (catId: string) => {
    setModelCategory(catId as any)
  }
  const [isRefreshing, setIsRefreshing] = React.useState(false)

  // Listen for live background catalog updates
  const [, setCatalogVersion] = React.useState(0)
  React.useEffect(() => {
    const unsub1 = modelCatalogService.subscribe(() => setCatalogVersion((v) => v + 1))
    const unsub2 = modelRegistry.subscribe(() => setCatalogVersion((v) => v + 1))
    return () => {
      unsub1()
      unsub2()
    }
  }, [])

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

  // Filtered flat models for "All Models" tab with Category filters
  const filteredFlatModels = React.useMemo(() => {
    return models.filter((m) => {
      const matchSearch =
        m.label.toLowerCase().includes(search.toLowerCase()) ||
        m.providerName.toLowerCase().includes(search.toLowerCase()) ||
        m.id.toLowerCase().includes(search.toLowerCase())
      if (!matchSearch) return false

      const isLocal = m.providerType === "local"
      const isReady = m.configured
      const id = m.id.toLowerCase()
      const isDead = m.status === "discontinued"

      // In active tabs, hide models whose sunset has already passed unless explicitly searching or viewing the Sunset tab
      if (modelCategory !== "sunset" && isDead && !search) {
        return false
      }

      if (modelCategory === "ready") return isReady && !isDead
      if (modelCategory === "connect") return !isReady && !isDead
      if (modelCategory === "local") return isLocal
      if (modelCategory === "sunset") return m.status === "discontinued" || m.status === "deprecating"
      if (modelCategory === "flagship") {
        return !isDead && (m.supportsThinking || m.supportsFast || m.providerType === "cloud")
      }
      if (modelCategory === "reasoning") {
        return !isDead && Boolean(m.supportsThinking)
      }
      return true
    })
  }, [models, search, modelCategory])

  const selectedProvider = providersMap.find((p) => p.id === selectedProviderId)
  const activeProviderModels = React.useMemo(() => {
    if (!selectedProvider) return []
    return selectedProvider.models.filter((m) => {
      if (search) {
        return m.label.toLowerCase().includes(search.toLowerCase()) || m.id.toLowerCase().includes(search.toLowerCase())
      }
      return m.status !== "discontinued"
    })
  }, [selectedProvider, search])

  return (
    <div
      className={cn(
        MENU_PANEL_CLASS,
        "flex w-[310px] sm:w-[335px] flex-col overflow-hidden shadow-2xl border border-[#e8e4db] dark:border-[#2e2e33]"
      )}
    >
        {/* Streamlined Noska Header */}
        <div className="p-2 space-y-2 border-b border-[#e8e4db] dark:border-[#2e2e33] bg-[#fcfbf9] dark:bg-[#18181a]">
          <div className="flex items-center justify-between gap-1.5">
            <div className="relative flex-1 flex items-center">
              <Search size={11} className="absolute left-2.5 text-[#706c64] dark:text-[#a09c94]" />
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
                className="w-full bg-[#ede8df]/50 dark:bg-[#232328] text-[#1c1b18] dark:text-[#ececec] text-[11px] pl-7 pr-12 py-1 rounded-lg border border-[#e8e4db] dark:border-[#2e2e33] outline-none focus:border-[#1c1b18]/40 dark:focus:border-white/40 transition-colors placeholder:text-[#a09c94]"
              />
              <div className="absolute right-1.5 flex items-center gap-1">
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    className="text-[#706c64] dark:text-[#a09c94] hover:text-[#1c1b18] dark:hover:text-white cursor-pointer p-0.5"
                  >
                    <XIcon size={10} />
                  </button>
                )}
                {/* Real-time Live Catalog Sync Button */}
                <button
                  type="button"
                  onClick={async () => {
                    setIsRefreshing(true)
                    await modelCatalogService.fetchRealtimeCatalog(true)
                    setIsRefreshing(false)
                  }}
                  className="p-1 rounded-md text-[#706c64] dark:text-[#a09c94] hover:text-[#1c1b18] dark:hover:text-white hover:bg-[#ede8df] dark:hover:bg-[#232328] transition cursor-pointer"
                  title="Refresh live real-time models & sunset announcements across all providers"
                >
                  <RotateCw size={11} className={cn(isRefreshing && "animate-spin text-purple-500")} />
                </button>
              </div>
            </div>

            {/* Noska Mode Pill Switcher */}
            {!selectedProvider && (
              <div className="flex items-center p-0.5 bg-[#ede8df]/60 dark:bg-[#232328] rounded-lg border border-[#e8e4db] dark:border-[#2e2e33] shrink-0 text-[10px]">
                <button
                  type="button"
                  onClick={() => setActiveTab("models")}
                  className={cn(
                    "px-2 py-0.5 rounded-md transition-all font-medium cursor-pointer",
                    activeTab === "models"
                      ? "bg-white dark:bg-[#2f2f36] text-[#1c1b18] dark:text-white shadow-xs font-semibold"
                      : "text-[#706c64] dark:text-[#a09c94] hover:text-[#1c1b18] dark:hover:text-white"
                  )}
                >
                  Models
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("providers")}
                  className={cn(
                    "px-2 py-0.5 rounded-md transition-all font-medium cursor-pointer",
                    activeTab === "providers"
                      ? "bg-white dark:bg-[#2f2f36] text-[#1c1b18] dark:text-white shadow-xs font-semibold"
                      : "text-[#706c64] dark:text-[#a09c94] hover:text-[#1c1b18] dark:hover:text-white"
                  )}
                >
                  Providers
                </button>
              </div>
            )}
          </div>

          {/* Category Filter Chips for Models Tab */}
          {!selectedProvider && activeTab === "models" && (
            <div className="flex items-center gap-1 overflow-x-auto pb-0.5 scrollbar-none text-[10px]">
              {[
                { id: "all", label: "All" },
                { id: "ready", label: "🟢 Ready" },
                { id: "flagship", label: "⭐ Best Models" },
                { id: "reasoning", label: "🧠 Reasoning" },
                { id: "local", label: "💻 Local" },
                { id: "connect", label: "🔌 Connect" },
                { id: "sunset", label: "⚠️ Sunset" },
              ].map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => handleCategoryClick(cat.id)}
                  className={cn(
                    "px-2 py-0.5 rounded-md whitespace-nowrap transition-all cursor-pointer font-medium",
                    modelCategory === cat.id
                      ? "bg-[#1c1b18] text-white dark:bg-white dark:text-[#18181a] font-semibold shadow-xs"
                      : "bg-[#ede8df]/40 dark:bg-[#232328] text-[#706c64] dark:text-[#a09c94] hover:text-[#1c1b18] dark:hover:text-white border border-[#e8e4db] dark:border-[#2e2e33]"
                  )}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* View 1: Drilled-Down Provider Models */}
        {selectedProvider ? (
          <div className="flex flex-col">
            <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-[#e8e4db] dark:border-[#2e2e33] bg-[#ede8df]/30 dark:bg-[#232328]/50">
              <button
                type="button"
                onClick={() => setSelectedProviderId(null)}
                className="flex items-center gap-1 text-[11px] text-[#706c64] dark:text-[#a09c94] hover:text-[#1c1b18] dark:hover:text-white font-medium transition-colors cursor-pointer"
              >
                <ChevronLeftIcon size={13} />
                <span>All</span>
              </button>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-semibold text-[#1c1b18] dark:text-white">{selectedProvider.name}</span>
                {selectedProvider.configured || selectedProvider.type === "local" ? (
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 font-semibold">Ready</span>
                ) : (
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-sky-500/15 text-sky-700 dark:text-sky-400 font-semibold">Connect</span>
                )}
              </div>
            </div>

            <ul role="presentation" className="flex max-h-56 overflow-y-auto flex-col gap-0.5 p-1 scrollbar-thin">
              {activeProviderModels.map((model) => (
                <li key={model.id} role="none">
                  <ModelSelectorItem model={model} />
                </li>
              ))}
            </ul>

            {!selectedProvider.configured && selectedProvider.type !== "local" && onOpenKeySetup && (
              <div className="p-1.5 border-t border-[#e8e4db] dark:border-[#2e2e33] bg-purple-500/5">
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false)
                    onOpenKeySetup(selectedProvider.id)
                  }}
                  className="w-full flex items-center justify-center gap-1.5 py-1 rounded-lg bg-[#1c1b18] hover:bg-black dark:bg-white/10 dark:hover:bg-white/15 text-white text-[11px] font-medium transition-colors cursor-pointer"
                >
                  <Key size={11} className="text-purple-400" />
                  <span>Connect API Key</span>
                </button>
              </div>
            )}
          </div>
        ) : activeTab === "providers" ? (
          /* View 2: Providers List */
          <ul role="presentation" className="flex max-h-56 overflow-y-auto flex-col gap-0.5 p-1 scrollbar-thin">
            {filteredProviders.length === 0 ? (
              <div className="py-5 text-center text-xs text-[#706c64] dark:text-[#a09c94]">
                No matching providers found.
              </div>
            ) : (
              filteredProviders.map((provider) => {
                const isLocal = provider.type === "local"
                const hasSelectedModel = provider.models.some((m) => m.id === selection.id)

                return (
                  <li key={provider.id} role="none">
                    <div
                      onClick={() => setSelectedProviderId(provider.id)}
                      className={cn(
                        "group/item relative flex w-full items-center justify-between gap-2 rounded-xl px-2.5 py-1.5 cursor-pointer text-xs transition-colors duration-100",
                        hasSelectedModel
                          ? "bg-[#ede8df] dark:bg-white/10 text-[#1c1b18] dark:text-white font-semibold border border-[#ded8cb] dark:border-white/15"
                          : "text-[#1c1b18] dark:text-[#ececec] hover:bg-[#ede8df]/60 dark:hover:bg-white/5"
                      )}
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <ProviderIcon providerId={provider.id} className="size-6" />
                        <div className="flex flex-col min-w-0">
                          <span className="truncate font-semibold text-[11px]">{provider.name}</span>
                          <span className="text-[9px] text-[#706c64] dark:text-[#a09c94] truncate">
                            {provider.models.length} model{provider.models.length !== 1 ? "s" : ""}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {isLocal ? (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-500/15 text-cyan-700 dark:text-cyan-400 font-medium">
                            Local
                          </span>
                        ) : provider.configured ? (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 font-medium">
                            Ready
                          </span>
                        ) : (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-sky-500/15 text-sky-700 dark:text-sky-400 font-medium hover:bg-sky-500/25 transition-colors">
                            Connect
                          </span>
                        )}
                        <ChevronRightIcon size={12} className="text-[#706c64] dark:text-[#a09c94] opacity-70 group-hover/item:opacity-100 transition-opacity" />
                      </div>
                    </div>
                  </li>
                )
              })
            )}
          </ul>
        ) : (
          /* View 3: All Models */
          <div className="flex flex-col">
            <div className="px-2.5 pt-1.5 pb-1 text-[10px] font-bold text-[#706c64] dark:text-[#a09c94] uppercase tracking-wider border-b border-[#e8e4db] dark:border-[#2e2e33] mb-0.5 flex items-center justify-between">
              <span>Model</span>
              <span className="text-[9px] text-[#a09c94] font-normal normal-case">Context / Speed</span>
            </div>
            <ul role="presentation" className="flex max-h-56 overflow-y-auto flex-col gap-0.5 p-1 scrollbar-thin">
              {filteredFlatModels.length === 0 ? (
                <div className="py-5 text-center text-xs text-[#706c64] dark:text-[#a09c94]">
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
          </div>
        )}

        {/* Footer: Manage Providers / API Keys */}
        {onOpenKeySetup && !selectedProvider && (
          <div className="p-1.5 border-t border-[#e8e4db] dark:border-[#2e2e33] bg-[#ede8df]/40 dark:bg-[#18181a]/60">
            <button
              type="button"
              onClick={() => {
                setOpen(false)
                onOpenKeySetup()
              }}
              className="w-full flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px] text-[#1c1b18] dark:text-[#ececec] hover:bg-[#ede8df] dark:hover:bg-white/10 transition-colors text-left font-medium cursor-pointer whitespace-nowrap"
            >
              <Key size={12} className="text-purple-600 dark:text-purple-400 shrink-0" />
              <span className="truncate">Manage connectors & API keys</span>
            </button>
          </div>
        )}
      </div>
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

  const [showEffortMenu, setShowEffortMenu] = React.useState(false)
  const isActive = model.id === selection.id
  const optionIndex = optionIds.indexOf(model.id)
  const isHighlighted = optionIndex === activeIndex && optionIndex >= 0
  const isDisabled = !model.disabled
  const config = getConfigFor(model)
  const optionId = optionDomId(contentId, model.id)
  const isLocal = model.providerType === "local"

  const optionRef = React.useRef<HTMLDivElement | null>(null)

  React.useEffect(() => {
    if (isHighlighted) {
      optionRef.current?.scrollIntoView({ block: "nearest" })
    }
  }, [isHighlighted])

  const handleSelectEffort = (eff: "low" | "medium" | "high", e: React.MouseEvent) => {
    e.stopPropagation()
    selectModel(model.id)
    patchSelection({ ...config, id: model.id, effort: eff })
    setShowEffortMenu(false)
    setOpen(false)
  }

  const handleItemClick = () => {
    selectModel(model.id)
    patchSelection({ ...config, id: model.id, effort: selection.id === model.id && selection.effort ? selection.effort : model.defaultEffort || "medium" })
    setOpen(false)
  }

  const currentEffort = isActive ? selection.effort || "medium" : "medium"

  return (
    <div
      className="relative w-full"
      onMouseEnter={() => {
        if (optionIndex >= 0) {
          setActiveIndex(optionIndex)
          if (!editingId) setPreviewId(model.id)
        }
      }}
      onMouseLeave={() => setShowEffortMenu(false)}
    >
      <div
        className={cn(
          "group/item relative flex w-full items-center justify-between gap-1.5 rounded-xl px-2 py-1.5 cursor-pointer text-[11px] transition-colors duration-100",
          isActive
            ? "bg-[#ede8df] dark:bg-white/10 text-[#1c1b18] dark:text-white font-semibold border border-[#ded8cb] dark:border-white/15"
            : "text-[#1c1b18] dark:text-[#ececec] hover:bg-[#ede8df]/60 dark:hover:bg-white/5"
        )}
        onClick={handleItemClick}
      >
        {/* Left: Model Name & Badges */}
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <span className="truncate font-medium">{model.label}</span>
          {model.freeBadge && (
            <span
              className={cn(
                "text-[9px] px-1.5 py-0.2 rounded font-medium shrink-0 tracking-tight",
                model.freeBadge === "[Local]"
                  ? "bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20"
                  : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
              )}
              title={model.freeAccessConditions?.join(", ") || (model.freeBadge === "[Local]" ? "Local execution on your device" : "Free API access")}
            >
              {model.freeBadge}
            </span>
          )}
        </div>

        {/* Right: Ready/Connect/Sunset Badge, Context Window, Fast, Info, Effort Chevron */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Discontinued / Sunset Notice Badges */}
          {model.status === "discontinued" ? (
            <span
              className="text-[9px] px-1.5 py-0.2 rounded bg-rose-500/15 text-rose-700 dark:text-rose-400 font-semibold shrink-0"
              title={model.sunsetDate ? `Retired on ${model.sunsetDate}. Migration: ${model.suggestedReplacement || "N/A"}` : "Discontinued by provider"}
            >
              Retired
            </span>
          ) : model.status === "deprecating" ? (
            <span
              className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-700 dark:text-amber-400 font-semibold shrink-0"
              title={`Sunset announced: ${model.sunsetDate || "Soon"}. ${model.suggestedReplacement ? `Migrate to ${model.suggestedReplacement}` : ""}`}
            >
              Sunset {model.sunsetDate ? `(${model.sunsetDate})` : ""}
            </span>
          ) : model.configured || isLocal ? (
            <span
              className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 font-semibold shrink-0"
              title={`${model.providerName} is configured and ready`}
            >
              Ready
            </span>
          ) : (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                if (onOpenKeySetup) {
                  setOpen(false)
                  onOpenKeySetup(model.providerId)
                }
              }}
              className="text-[9px] px-1.5 py-0.2 rounded bg-sky-500/15 hover:bg-sky-500/25 text-sky-700 dark:text-sky-400 font-semibold transition-colors cursor-pointer shrink-0"
              title={`Click to connect ${model.providerName} API key`}
            >
              Connect
            </button>
          )}

          {/* Exact Real Context Window Badge */}
          <span
            className="text-[9px] px-1.5 py-0.2 rounded bg-[#ede8df]/80 dark:bg-white/5 text-[#706c64] dark:text-[#a09c94] font-mono font-medium"
            title={`${model.label} context limit: ${model.defaultContext || "128K"} tokens`}
          >
            {model.defaultContext || "128K"}
          </span>

          {model.supportsFast && (
            <span className="text-[9px] px-1 py-0.2 rounded bg-[#ede8df] dark:bg-white/10 text-[#706c64] dark:text-[#a09c94] font-semibold">
              Fast
            </span>
          )}

          {/* Info Icon with Accurate Context Specs */}
          <div
            className="text-[#706c64] dark:text-[#a09c94] hover:text-[#1c1b18] dark:hover:text-white p-0.5 rounded cursor-help"
            title={`${model.label} · ${model.providerName} (${model.configured || isLocal ? "Ready" : "Key required"}) · Context: ${model.defaultContext || "128K"} tokens`}
            onClick={(e) => e.stopPropagation()}
          >
            <CircleHelp size={11} />
          </div>

          {/* Chevron indicator */}
          <div className="text-[#706c64] dark:text-[#a09c94] p-0.5">
            <ChevronRightIcon size={12} />
          </div>
        </div>
      </div>
    </div>
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
      className={cn(MENU_PANEL_CLASS, "flex w-52 shrink-0 flex-col gap-2 p-2.5 shadow-2xl border border-[#e8e4db] dark:border-[#2e2e33]")}
    >
      {editing ? (
        <ModelEditPanelContent model={model} />
      ) : (
        <ModelSidePanelContent model={model} />
      )}
    </motion.aside>
  )
}

function ModelSidePanelContent({ model }: { model: AiModel }) {
  const { onOpenKeySetup, setOpen } =
    useModelSelectorContext("ModelSidePanelContent")

  const isLocal = model.providerType === "local"
  const isReady = model.configured || isLocal
  const contexts = model.contexts?.map((c) => formatContext(c)).filter(Boolean).join(" · ") || model.defaultContext || "128K"

  return (
    <div className="flex flex-col gap-2.5 text-left">
      {/* Model Name & Status Header */}
      <div className="flex items-start justify-between gap-1.5 pb-2 border-b border-[#e8e4db] dark:border-[#2e2e33]">
        <div className="min-w-0 flex-1">
          <div className="text-[12px] font-semibold text-[#1c1b18] dark:text-white leading-tight truncate">
            {model.label}
          </div>
          <div className="text-[10px] text-[#706c64] dark:text-[#a09c94] flex items-center gap-1 mt-0.5">
            {isLocal ? <Laptop size={11} /> : <Cloud size={11} />}
            <span className="truncate font-medium">{model.providerName}</span>
          </div>
        </div>
        {model.status === "discontinued" ? (
          <span className="text-[9px] px-1.5 py-0.2 rounded bg-rose-500/15 text-rose-700 dark:text-rose-400 font-semibold shrink-0">
            Retired
          </span>
        ) : model.status === "deprecating" ? (
          <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-700 dark:text-amber-400 font-semibold shrink-0">
            Sunset
          </span>
        ) : isReady ? (
          <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 font-semibold shrink-0">
            Ready
          </span>
        ) : (
          <span className="text-[9px] px-1.5 py-0.2 rounded bg-sky-500/15 text-sky-700 dark:text-sky-400 font-semibold shrink-0">
            Connect
          </span>
        )}
      </div>

      {/* Model Info Description */}
      {model.description && (
        <p className="text-[10px] text-[#706c64] dark:text-[#a09c94] leading-relaxed line-clamp-3">
          {model.description}
        </p>
      )}

      {/* Capabilities & Provider Specs */}
      <div className="flex flex-col gap-1.5 p-2 rounded-xl bg-black/[0.025] dark:bg-white/[0.035] border border-black/[0.05] dark:border-white/[0.06] text-[10px]">
        <div className="flex items-center justify-between text-[#706c64] dark:text-[#a09c94]">
          <span>Execution</span>
          <span className="font-medium text-[#1c1b18] dark:text-white">
            {isLocal ? "Local Device (GGUF)" : "Cloud API"}
          </span>
        </div>
        <div className="flex items-center justify-between text-[#706c64] dark:text-[#a09c94]">
          <span>Context Window</span>
          <span className="font-mono font-medium text-[#1c1b18] dark:text-white">
            {contexts}
          </span>
        </div>
        {model.supportsThinking && (
          <div className="flex items-center justify-between text-[#706c64] dark:text-[#a09c94]">
            <span>Reasoning</span>
            <span className="font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <Brain size={10} />
              <span>Supported</span>
            </span>
          </div>
        )}
        {model.supportsFast && (
          <div className="flex items-center justify-between text-[#706c64] dark:text-[#a09c94]">
            <span>Fast Mode</span>
            <span className="font-medium text-amber-600 dark:text-amber-400">
              ⚡ Available
            </span>
          </div>
        )}
      </div>

      {/* Deprecation / Sunset Callout Alert */}
      {(model.status === "deprecating" || model.status === "discontinued") && (
        <div className={cn(
          "p-2 rounded-xl border text-[10.5px] space-y-1 text-left mt-0.5",
          model.status === "discontinued"
            ? "bg-rose-500/10 border-rose-500/20 text-rose-800 dark:text-rose-300"
            : "bg-amber-500/10 border-amber-500/20 text-amber-800 dark:text-amber-300"
        )}>
          <div className="flex items-center gap-1.5 font-bold text-[10.5px]">
            <AlertTriangle size={11} className="shrink-0" />
            <span>{model.status === "discontinued" ? "Discontinued" : "Sunset Notice"}</span>
          </div>
          {model.sunsetDate && (
            <div className="text-[10px]">
              Shutdown: <span className="font-semibold">{model.sunsetDate}</span>
            </div>
          )}
          {model.suggestedReplacement && (
            <div className="text-[9.5px] pt-0.5">
              <span>Migrate to: </span>
              <span className="font-mono font-semibold underline">{model.suggestedReplacement}</span>
            </div>
          )}
        </div>
      )}

      {/* Connect API Key button if not configured */}
      {!isReady && onOpenKeySetup && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            setOpen(false)
            onOpenKeySetup(model.providerId)
          }}
          className="mt-0.5 w-full flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl bg-[#1c1b18] hover:bg-black dark:bg-white/10 dark:hover:bg-white/15 text-white text-[10.5px] font-medium transition-colors whitespace-nowrap cursor-pointer shadow-xs"
        >
          <Key size={11} className="text-purple-400 shrink-0" />
          <span className="truncate">Connect {model.providerName} Key</span>
        </button>
      )}
    </div>
  )
}

function ModelEditPanelContent({ model }: { model: AiModel }) {
  const { getConfigFor, patchSelection, reduceMotion } =
    useModelSelectorContext("ModelEditPanelContent")

  const config = getConfigFor(model)

  return (
    <>

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

type MenuCoords = { bottom: number; left: number; originX?: string }

function useAnchoredMenu(disabled = false) {
  const [open, setOpen] = React.useState(false)
  const [mounted, setMounted] = React.useState(false)
  const triggerRef = React.useRef<HTMLButtonElement>(null)
  const contentRef = React.useRef<HTMLDivElement>(null)
  const menuId = React.useId()

  const computeCoords = React.useCallback(() => {
    const trigger = triggerRef.current
    if (!trigger) return null
    const rect = trigger.getBoundingClientRect()
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight
    const popupWidth = 288
    const left = Math.max(12, Math.min(rect.left, viewportWidth - popupWidth - 12))
    const bottom = Math.max(12, viewportHeight - rect.top + 8)
    const originX = Math.max(16, Math.min(rect.left - left + rect.width / 2, popupWidth - 16))
    return {
      bottom,
      left,
      originX: `${originX}px`,
    }
  }, [])

  const [coords, setCoords] = React.useState<MenuCoords | null>(null)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  React.useLayoutEffect(() => {
    if (!open) return

    const update = () => {
      const calculated = computeCoords()
      if (calculated) setCoords(calculated)
    }

    update()
    window.addEventListener("resize", update)
    window.addEventListener("scroll", update, true)
    return () => {
      window.removeEventListener("resize", update)
      window.removeEventListener("scroll", update, true)
    }
  }, [open, computeCoords])

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

  const activeCoords = coords ?? (open ? computeCoords() : null)
  return { open, setOpen, mounted, coords: activeCoords, triggerRef, contentRef, menuId }
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
            position: "fixed",
            bottom: `${coords.bottom}px`,
            left: `${coords.left}px`,
            transformOrigin: `${coords.originX || '24px'} bottom`,
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

function ReasoningEffortButton({
  effort = "medium",
  onEffortChange,
  disabled = false,
  className,
}: {
  effort?: AiModelEffort
  onEffortChange?: (effort: AiModelEffort) => void
  disabled?: boolean
  className?: string
}) {
  const reduceMotion = usePrefersReducedMotion()
  const { open, setOpen, mounted, coords, triggerRef, contentRef, menuId } =
    useAnchoredMenu(disabled)

  const effortDotConfig: Record<AiModelEffort, { dot: string; glow: string; text: string }> = {
    low: {
      dot: "bg-emerald-500",
      glow: "shadow-[0_0_8px_rgba(16,185,129,0.5)]",
      text: "text-emerald-700 dark:text-emerald-300",
    },
    medium: {
      dot: "bg-amber-500",
      glow: "shadow-[0_0_8px_rgba(245,158,11,0.5)]",
      text: "text-amber-700 dark:text-amber-300",
    },
    high: {
      dot: "bg-violet-500",
      glow: "shadow-[0_0_8px_rgba(139,92,246,0.5)]",
      text: "text-violet-700 dark:text-violet-300",
    },
  }

  const currentConfig = effortDotConfig[effort] || effortDotConfig.medium

  return (
    <div className="relative inline-flex items-center">
      <motion.button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={`Reasoning effort is ${effort}. Click to adjust slider.`}
        onClick={() => setOpen((v) => !v)}
        whileHover={disabled ? undefined : { scale: 1.02 }}
        whileTap={disabled ? undefined : { scale: 0.97 }}
        transition={SPRING_PRESS}
        className={cn(
          "inline-flex h-8 items-center gap-1.5 px-2.5 rounded-xl text-xs font-medium cursor-pointer transition-all duration-150 select-none",
          "border border-black/[0.08] dark:border-white/[0.08]",
          "bg-black/[0.025] hover:bg-black/[0.05] dark:bg-white/[0.03] dark:hover:bg-white/[0.07]",
          "text-foreground/90 hover:text-foreground",
          open && "bg-black/[0.06] dark:bg-white/[0.10] border-black/[0.14] dark:border-white/[0.16] shadow-xs text-foreground",
          disabled && "pointer-events-none opacity-40",
          className
        )}
        title="AI Reasoning Effort (Click to adjust)"
      >
        <span
          className={cn(
            "size-1.5 rounded-full shrink-0 transition-all duration-300",
            currentConfig.dot,
            currentConfig.glow
          )}
        />
        <Brain size={12.5} className="shrink-0 text-muted-foreground opacity-75" aria-hidden />
        <span className="capitalize font-medium text-[11.5px] tracking-tight">{effort}</span>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2, ease: EASE }}
          className="flex shrink-0 opacity-50"
        >
          <ChevronDownIcon size={11} aria-hidden />
        </motion.span>
      </motion.button>

      <AnchoredMenuPortal
        mounted={mounted}
        open={open}
        coords={coords}
        contentRef={contentRef}
        id={menuId}
        role="menu"
        aria-label="Reasoning Effort Slider"
        reduceMotion={reduceMotion}
        className="w-72 p-3 shadow-[0_20px_45px_-10px_rgba(0,0,0,0.25)] dark:shadow-[0_24px_50px_-10px_rgba(0,0,0,0.65)] rounded-2xl border border-[#e8e4db] dark:border-[#2e2e33] bg-[#fcfbf9]/95 dark:bg-[#18181a]/95 backdrop-blur-2xl"
      >
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between px-0.5">
            <div className="flex items-center gap-1.5">
              <div className="size-5 rounded-md bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <Brain size={12} />
              </div>
              <span className="text-xs font-semibold text-foreground tracking-tight">Reasoning Effort</span>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="size-5 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/10 rounded-md cursor-pointer transition-colors"
              title="Close"
            >
              <XIcon size={12} />
            </button>
          </div>
          <p className="text-[10px] text-muted-foreground leading-tight px-0.5">
            Adjust the AI's step-by-step thinking depth and compute budget for complex problem solving.
          </p>
          <AdaptiveReasoningSlider
            effort={effort}
            onEffortChange={(nextEffort) => {
              onEffortChange?.(nextEffort)
            }}
          />
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

function SubmitButton({
  talking,
  isLoading,
  isSuccess,
  showSend,
  disabled,
  hasText,
  status,
  onTalkToggle,
  onSend,
  reduceMotion,
}: {
  talking: boolean
  isLoading: boolean
  isSuccess: boolean
  showSend: boolean
  disabled: boolean
  hasText: boolean
  status?: AiPromptSendStatus | string
  onTalkToggle: () => void
  onSend: () => void
  reduceMotion: boolean
}) {
  const [isHovered, setIsHovered] = React.useState(false)
  const [isPressed, setIsPressed] = React.useState(false)
  const shaderRef = React.useRef<HTMLDivElement>(null)
  const shaderMount = React.useRef<any>(null)

  const isLoadingState = status === "loading" || isLoading
  const isSuccessState = status === "success" || isSuccess
  const showSendBtn = !talking && (hasText || isLoadingState || isSuccessState)
  const isDisabled = talking ? false : disabled || isLoadingState

  const label = talking
    ? "Stop voice conversation"
    : isLoadingState
      ? "Sending"
      : isSuccessState
        ? "Sent"
        : showSendBtn
          ? "Send message"
          : "Talk with AI"

  React.useEffect(() => {
    const styleId = "shader-canvas-style-exploded"
    if (!document.getElementById(styleId)) {
      const style = document.createElement("style")
      style.id = styleId
      style.textContent = `
        .shader-container-exploded canvas {
          width: 100% !important;
          height: 100% !important;
          display: block !important;
          position: absolute !important;
          top: 0 !important;
          left: 0 !important;
          border-radius: 100px !important;
        }
      `
      document.head.appendChild(style)
    }

    if (reduceMotion) return

    const loadShader = async () => {
      try {
        if (shaderRef.current) {
          if (shaderMount.current?.dispose) {
            shaderMount.current.dispose()
          }

          shaderMount.current = new ShaderMount(
            shaderRef.current,
            liquidMetalFragmentShader,
            {
              u_repetition: 4,
              u_softness: 0.5,
              u_shiftRed: 0.3,
              u_shiftBlue: 0.3,
              u_distortion: 0,
              u_contour: 0,
              u_angle: 45,
              u_scale: 8,
              u_shape: 1,
              u_offsetX: 0.1,
              u_offsetY: -0.1,
            },
            undefined,
            0.6
          )
        }
      } catch (error) {
        console.error("[LiquidMetal] Shader mount error:", error)
      }
    }

    loadShader()

    return () => {
      if (shaderMount.current?.dispose) {
        shaderMount.current.dispose()
        shaderMount.current = null
      }
    }

  }, [reduceMotion])

  const handleMouseEnter = () => {
    setIsHovered(true)
    shaderMount.current?.setSpeed?.(1.4)
  }

  const handleMouseLeave = () => {
    setIsHovered(false)
    setIsPressed(false)
    shaderMount.current?.setSpeed?.(0.6)
  }

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (shaderMount.current?.setSpeed) {
      shaderMount.current.setSpeed(2.6)
      setTimeout(() => {
        if (isHovered) {
          shaderMount.current?.setSpeed?.(1.4)
        } else {
          shaderMount.current?.setSpeed?.(0.6)
        }
      }, 350)
    }

    if (talking || !showSendBtn) onTalkToggle()
    else onSend()
  }

  return (
    <div className="relative inline-flex items-center justify-center shrink-0">
      <div
        style={{
          perspective: "1000px",
          perspectiveOrigin: "50% 50%",
        }}
      >
        <div
          style={{
            position: "relative",
            width: "38px",
            height: "38px",
            transformStyle: "preserve-3d",
            transition: "all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)",
          }}
        >
          {/* Layer 1: Foreground Icon Content */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "38px",
              height: "38px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transformStyle: "preserve-3d",
              transform: "translateZ(20px)",
              zIndex: 30,
              pointerEvents: "none",
            }}
          >
            <AnimatePresence mode="wait" initial={false}>
              {talking ? (
                <IconSwapFrame swapKey="stop" reduceMotion={reduceMotion}>
                  <SquareIcon className="size-3.5 fill-current text-white" aria-hidden />
                </IconSwapFrame>
              ) : isLoadingState ? (
                <IconSwapFrame swapKey="loader" reduceMotion={reduceMotion}>
                  <Loader2Icon className="size-4 animate-spin text-purple-300" aria-hidden />
                </IconSwapFrame>
              ) : isSuccessState ? (
                <IconSwapFrame swapKey="check" reduceMotion={reduceMotion}>
                  <CheckIcon className="size-4 text-emerald-400" aria-hidden />
                </IconSwapFrame>
              ) : showSendBtn ? (
                <IconSwapFrame swapKey="arrow" reduceMotion={reduceMotion}>
                  <ArrowUpIcon className="size-4 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]" strokeWidth={2.5} aria-hidden />
                </IconSwapFrame>
              ) : (
                <IconSwapFrame swapKey="waves" reduceMotion={reduceMotion}>
                  <AudioLinesIcon className="size-4 text-white/90" aria-hidden />
                </IconSwapFrame>
              )}
            </AnimatePresence>
          </div>

          {/* Layer 2: Dark Metallic Core */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "38px",
              height: "38px",
              transformStyle: "preserve-3d",
              transform: `translateZ(10px) ${isPressed ? "translateY(1px) scale(0.96)" : "translateY(0) scale(1)"}`,
              zIndex: 20,
              transition: "all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
            }}
          >
            <div
              style={{
                width: "34px",
                height: "34px",
                margin: "2px",
                borderRadius: "100px",
                background: "linear-gradient(180deg, #24252a 0%, #000000 100%)",
                boxShadow: isPressed
                  ? "inset 0px 2px 4px rgba(0, 0, 0, 0.6)"
                  : "inset 0px 1px 1.5px rgba(255, 255, 255, 0.4)",
              }}
            />
          </div>

          {/* Layer 3: WebGL Liquid Metal Shader Ring */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "38px",
              height: "38px",
              transformStyle: "preserve-3d",
              transform: `translateZ(0px) ${isPressed ? "translateY(1px) scale(0.96)" : "translateY(0) scale(1)"}`,
              zIndex: 10,
              transition: "all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
            }}
          >
            <div
              style={{
                height: "38px",
                width: "38px",
                borderRadius: "100px",
                boxShadow: isPressed
                  ? "0px 0px 0px 1px rgba(0, 0, 0, 0.5)"
                  : isHovered
                    ? "0px 0px 0px 1px rgba(255, 255, 255, 0.3), 0px 8px 16px rgba(0, 0, 0, 0.4)"
                    : "0px 0px 0px 1px rgba(255, 255, 255, 0.15), 0px 4px 10px rgba(0, 0, 0, 0.3)",
                background: "rgb(0 0 0 / 0)",
              }}
            >
              <div
                ref={shaderRef}
                className="shader-container-exploded"
                style={{
                  borderRadius: "100px",
                  overflow: "hidden",
                  position: "relative",
                  width: "38px",
                  height: "38px",
                }}
              />
            </div>
          </div>

          {/* Layer 4: Interactive Click Surface */}
          <button
            type="button"
            disabled={isDisabled}
            onClick={handleClick}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onMouseDown={() => setIsPressed(true)}
            onMouseUp={() => setIsPressed(false)}
            aria-label={label}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "38px",
              height: "38px",
              background: "transparent",
              border: "none",
              cursor: isDisabled ? "default" : "pointer",
              outline: "none",
              zIndex: 40,
              transformStyle: "preserve-3d",
              transform: "translateZ(25px)",
              borderRadius: "100px",
              opacity: isDisabled ? 0.45 : 1,
            }}
          />
        </div>
      </div>
    </div>
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
    const dictationBaseValueRef = React.useRef<string>("")
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
                  <div className="flex items-center gap-1 min-w-0">
                    <ModelSelector
                      models={models}
                      value={modelSelection}
                      onValueChange={setModelSelection}
                      onOpenKeySetup={onOpenKeySetup}
                      disabled={disabled || sessionLocked}
                    >
                      <ModelSelectorTrigger className="h-8">
                        <ModelSelectorValue className="max-w-[200px] sm:max-w-[320px]" />
                      </ModelSelectorTrigger>
                      <ModelSelectorContent side="top" />
                    </ModelSelector>

                    {/* Interactive Reasoning Effort Button directly on this bar */}
                    <ReasoningEffortButton
                      effort={modelSelection.effort || "medium"}
                      onEffortChange={(effort) => {
                        const updated = { ...modelSelection, effort }
                        setModelSelection(updated)
                        onModelSelectionChange?.(updated)
                      }}
                      disabled={disabled || sessionLocked}
                    />
                  </div>
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
                  onToggle={() => {
                    if (dictating) {
                      globalVoiceController.stop();
                      dictationBaseValueRef.current = "";
                      setDictationPhase("idle");
                      onDictationChange?.(false);
                    } else {
                      dictationBaseValueRef.current = valueRef.current || "";
                      setDictationPhase("recording");
                      onDictationChange?.(true);
                      globalVoiceController.start({
                        onTranscript: (transcript) => {
                          const base = dictationBaseValueRef.current;
                          const separator = base && !base.endsWith(" ") ? " " : "";
                          const combined = `${base}${separator}${transcript}`.slice(0, maxLength);
                          setValue(combined);
                        },
                        onError: () => {
                          setDictationPhase("idle");
                          onDictationChange?.(false);
                        },
                      });
                    }
                  }}
                  reduceMotion={reduceMotion}
                />
                <SubmitButton
                  disabled={disabled}
                  status={status}
                  hasText={hasText}
                  talking={talking}
                  isLoading={status === "loading"}
                  isSuccess={status === "success"}
                  showSend={!talking && (hasText || status === "loading" || status === "success")}
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

export { AiPromptInput, ReasoningEffortButton, AdaptiveSlider, AdaptiveReasoningSlider }
export default AiPromptInput
