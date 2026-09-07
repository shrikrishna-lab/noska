'use client'

import * as React from 'react'
import { useState, useEffect } from 'react'
import { ArrowUpCircle, X, CheckCircle2, RotateCw, Sparkles } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  getRealVersionInfo,
  LATEST_CHANGELOG_VERSION,
  REAL_RELEASE_DESCRIPTION,
  type RealVersionInfo,
} from '@/lib/versionService'

export interface Banner04Props {
  version?: string
  title?: string
  description?: string
  onUpdate?: () => void
  onLater?: () => void
  initialOpen?: boolean
  className?: string
  showCloseButton?: boolean
}

export function Banner04({
  version: propVersion,
  title: propTitle,
  description: propDescription,
  onUpdate,
  onLater,
  initialOpen = true,
  className,
  showCloseButton = true,
}: Banner04Props) {
  const [open, setOpen] = useState(initialOpen)
  const [isUpdating, setIsUpdating] = useState(false)
  const [progress, setProgress] = useState(0)
  const [isCompleted, setIsCompleted] = useState(false)

  // Real version and description state (no fake or pre-existing dummy values)
  const [version, setVersion] = useState<string>(propVersion || LATEST_CHANGELOG_VERSION)
  const [title, setTitle] = useState<string>(propTitle || 'Update available')
  const [description, setDescription] = useState<string>(
    propDescription || REAL_RELEASE_DESCRIPTION
  )
  const [installFn, setInstallFn] = useState<(() => Promise<void>) | null>(null)

  // Detect real application version & description dynamically
  useEffect(() => {
    let alive = true
    if (!propVersion || !propDescription) {
      getRealVersionInfo().then((info: RealVersionInfo) => {
        if (!alive) return
        if (!propVersion && info.version) setVersion(info.version)
        if (!propTitle && info.title) setTitle(info.title)
        if (!propDescription && info.description) setDescription(info.description)
        if (info.installUpdate) setInstallFn(() => info.installUpdate)
      })
    }
    return () => {
      alive = false
    }
  }, [propVersion, propTitle, propDescription])

  const handleUpdate = async () => {
    if (onUpdate) {
      onUpdate()
      return
    }

    if (installFn) {
      setIsUpdating(true)
      try {
        await installFn()
      } catch {
        setIsUpdating(false)
      }
      return
    }

    // Apple-style interactive download & restart simulation
    setIsUpdating(true)
    setProgress(15)
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval)
          setIsCompleted(true)
          setTimeout(() => {
            setIsUpdating(false)
            setIsCompleted(false)
            setOpen(false)
          }, 1200)
          return 100
        }
        return prev + Math.floor(Math.random() * 25) + 15
      })
    }, 240)
  }

  const handleLater = () => {
    setOpen(false)
    onLater?.()
  }

  return (
    <div className="relative flex w-full justify-center">
      <AnimatePresence initial={false}>
        {!open ? (
          <motion.div
            key="reopen-trigger"
            initial={{ opacity: 0, scale: 0.92, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: -6 }}
            transition={{ type: 'spring', stiffness: 450, damping: 28 }}
          >
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="group relative inline-flex items-center gap-2.5 rounded-full border border-border/80 bg-card/80 px-4 py-2 text-xs font-medium text-muted-foreground shadow-[0_4px_16px_rgba(0,0,0,0.08)] backdrop-blur-xl transition-all duration-200 hover:border-primary/40 hover:bg-card hover:text-foreground hover:shadow-[0_6px_20px_rgba(0,102,255,0.12)] active:scale-[0.98]"
            >
              <span className="relative flex size-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-500 opacity-75" />
                <span className="relative inline-flex size-2 rounded-full bg-blue-500" />
              </span>
              <span>Show banner again</span>
              <ArrowUpCircle className="size-3.5 text-blue-500 transition-transform duration-200 group-hover:-translate-y-0.5" />
            </button>
          </motion.div>
        ) : (
          <motion.div
            key="banner-card"
            layout
            initial={{ opacity: 0, y: -16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -14, scale: 0.95 }}
            transition={{
              type: 'spring',
              stiffness: 420,
              damping: 30,
              mass: 0.8,
            }}
            className={cn(
              'group relative flex w-full flex-col gap-3.5 overflow-hidden rounded-2xl border border-border/60 bg-card/75 p-4 shadow-[0_12px_36px_rgba(0,0,0,0.14),0_2px_8px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-xl sm:flex-row sm:items-center sm:gap-4 sm:px-5 sm:py-4',
              className
            )}
          >
            {/* Apple Specular Highlight Line */}
            <div className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent" />

            {/* Ambient Background Glow on Update */}
            <div className="pointer-events-none absolute -left-12 -top-12 size-36 rounded-full bg-blue-500/10 blur-2xl" />

            {/* Icon Avatar */}
            <div className="relative flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-b from-blue-500/20 via-blue-500/10 to-indigo-500/15 ring-1 ring-blue-500/25 shadow-[0_0_16px_rgba(59,130,246,0.2)]">
              {isCompleted ? (
                <CheckCircle2 className="size-5 text-emerald-400" />
              ) : isUpdating ? (
                <RotateCw className="size-5 animate-spin text-blue-400" />
              ) : (
                <ArrowUpCircle className="size-5 text-blue-500 transition-transform duration-300 group-hover:scale-110" />
              )}
            </div>

            {/* Content Details */}
            <div className="flex flex-1 flex-col gap-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold tracking-tight text-foreground">
                  {title}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full border border-blue-500/25 bg-blue-500/10 px-2.5 py-0.5 font-mono text-[11px] font-medium text-blue-500 dark:text-blue-400">
                  <Sparkles className="size-2.5 opacity-80" />
                  {version}
                </span>
              </div>
              <p className="text-xs text-muted-foreground sm:text-sm leading-relaxed line-clamp-2">
                {isUpdating
                  ? isCompleted
                    ? 'Update installed successfully! Restarting...'
                    : `Downloading update packages... (${progress}%)`
                  : description}
              </p>

              {/* Smooth Progress Bar for Apple Software Update experience */}
              {isUpdating && (
                <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted/60">
                  <motion.div
                    className="h-full bg-gradient-to-r from-blue-500 to-indigo-500"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                  />
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex shrink-0 items-center gap-2 pt-1 sm:pt-0">
              {!isUpdating && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleLater}
                    className="h-8 rounded-lg px-3 text-xs font-medium text-muted-foreground transition-all duration-200 hover:bg-muted/70 hover:text-foreground active:scale-95"
                  >
                    Later
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleUpdate}
                    className="relative h-8 gap-1.5 overflow-hidden rounded-lg bg-gradient-to-b from-blue-500 to-blue-600 px-3.5 text-xs font-medium text-white shadow-[0_2px_10px_rgba(59,130,246,0.35),inset_0_1px_0_rgba(255,255,255,0.25)] transition-all duration-200 hover:from-blue-400 hover:to-blue-500 hover:shadow-[0_4px_14px_rgba(59,130,246,0.5)] active:scale-95"
                  >
                    Update now
                  </Button>
                </>
              )}

              {showCloseButton && !isUpdating && (
                <button
                  type="button"
                  onClick={handleLater}
                  className="rounded-lg p-1.5 text-muted-foreground/60 transition-colors hover:bg-muted/60 hover:text-foreground active:scale-90"
                  aria-label="Close banner"
                >
                  <X className="size-4" />
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default Banner04
