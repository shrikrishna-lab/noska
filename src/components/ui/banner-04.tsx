'use client'

import * as React from 'react'
import { useState, useEffect } from 'react'
import { ArrowUpCircle, CheckCircle2, RotateCw, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

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
  showCloseButton = false,
}: Banner04Props) {
  const [open, setOpen] = useState(initialOpen)
  const [isUpdating, setIsUpdating] = useState(false)
  const [progress, setProgress] = useState(0)
  const [isCompleted, setIsCompleted] = useState(false)

  // Real version and description state
  const [version, setVersion] = useState<string>(propVersion || LATEST_CHANGELOG_VERSION)
  const [title, setTitle] = useState<string>(propTitle || 'Update available')
  const [description, setDescription] = useState<string>(
    propDescription || REAL_RELEASE_DESCRIPTION
  )
  const [installFn, setInstallFn] = useState<(() => Promise<void>) | null>(null)

  // Sync props when they change
  useEffect(() => {
    if (propVersion) setVersion(propVersion)
    if (propTitle) setTitle(propTitle)
    if (propDescription) setDescription(propDescription)
  }, [propVersion, propTitle, propDescription])

  // Detect real application version & description dynamically if not passed
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

    // Interactive progress & simulation
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
    <div className="relative flex w-full justify-end">
      <AnimatePresence initial={false}>
        {!open ? (
          <motion.div
            key="reopen-trigger"
            initial={{ opacity: 0, scale: 0.94, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 8 }}
            transition={{ type: 'spring', stiffness: 450, damping: 28 }}
          >
            <button
              type="button"
              aria-label="Show banner again"
              onClick={() => setOpen(true)}
              className="group relative inline-flex items-center gap-2 rounded-full border border-neutral-200/90 bg-white/95 px-3 py-1.5 text-xs font-medium text-neutral-600 shadow-[0_4px_16px_rgba(0,0,0,0.06)] backdrop-blur-xl transition-all duration-200 hover:border-neutral-300 hover:bg-white hover:text-neutral-950 active:scale-95 dark:border-neutral-800 dark:bg-neutral-900/95 dark:text-neutral-300 dark:hover:border-neutral-700 dark:hover:text-white"
            >
              <span className="relative flex size-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-500 opacity-75" />
                <span className="relative inline-flex size-2 rounded-full bg-blue-500" />
              </span>
              <span>Show banner again</span>
              <ArrowUpCircle className="size-3.5 text-neutral-500 transition-transform duration-200 group-hover:-translate-y-0.5 dark:text-neutral-400" />
            </button>
          </motion.div>
        ) : (
          <motion.div
            key="banner-card"
            layout
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.96 }}
            transition={{
              type: 'spring',
              stiffness: 420,
              damping: 28,
              mass: 0.75,
            }}
            className={cn(
              'group relative flex items-center justify-between gap-3 sm:gap-4 overflow-hidden rounded-2xl border border-neutral-200/90 bg-white/95 px-3.5 py-3 shadow-[0_8px_30px_rgb(0,0,0,0.08),0_2px_8px_rgb(0,0,0,0.04)] backdrop-blur-xl dark:border-neutral-800/90 dark:bg-[#16181F]/95 dark:shadow-[0_12px_40px_rgb(0,0,0,0.45)]',
              'max-w-[460px] w-full select-none',
              className
            )}
          >
            {/* Top specular highlight line */}
            <div className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-black/[0.04] to-transparent dark:via-white/[0.07]" />

            {/* Left circular icon badge */}
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-neutral-900 transition-transform duration-200 group-hover:scale-105 dark:bg-neutral-800 dark:text-neutral-100">
              {isCompleted ? (
                <CheckCircle2 className="size-4 text-emerald-500" />
              ) : isUpdating ? (
                <RotateCw className="size-3.5 animate-spin text-neutral-800 dark:text-neutral-200" />
              ) : (
                <ArrowUpCircle className="size-4.5 stroke-[1.8]" />
              )}
            </div>

            {/* Content Details: Title & Subtitle */}
            <div className="flex flex-1 flex-col min-w-0 pr-1">
              {isUpdating ? (
                <span className="text-xs sm:text-[13px] font-semibold tracking-tight text-neutral-900 dark:text-neutral-100 truncate leading-snug">
                  {isCompleted ? 'Update ready' : 'Updating...'}
                </span>
              ) : (
                <div className="flex items-center gap-1.5 min-w-0 text-xs sm:text-[13px] font-semibold tracking-tight text-neutral-900 dark:text-neutral-100 leading-snug truncate">
                  <span className="truncate">{title}</span>
                  {version && (
                    <>
                      <span className="text-neutral-400 dark:text-neutral-500 font-normal select-none">
                        —
                      </span>
                      <span className="shrink-0">
                        {version.startsWith('v') ? version : `v${version}`}
                      </span>
                    </>
                  )}
                </div>
              )}

              <p className="text-[11px] sm:text-xs text-neutral-500 dark:text-neutral-400 font-normal leading-tight line-clamp-2 mt-0.5">
                {isUpdating
                  ? isCompleted
                    ? 'Restarting the app to install...'
                    : progress > 0
                    ? `Downloading update packages (${progress}%)...`
                    : 'Preparing update...'
                  : description}
              </p>
            </div>

            {/* Actions: Later & Update now */}
            <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
              {!isUpdating && (
                <>
                  <button
                    type="button"
                    onClick={handleLater}
                    className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-neutral-500 transition-colors hover:text-neutral-900 active:scale-95 dark:text-neutral-400 dark:hover:text-white cursor-pointer"
                  >
                    Later
                  </button>

                  <motion.button
                    type="button"
                    onClick={handleUpdate}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.96 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                    className="relative inline-flex items-center justify-center rounded-lg bg-neutral-950 px-3.5 py-1.5 text-xs font-medium text-white shadow-sm transition-all hover:bg-neutral-800 active:scale-95 dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-100 cursor-pointer"
                  >
                    Update now
                  </motion.button>
                </>
              )}

              {isUpdating && (
                <div className="inline-flex items-center gap-1.5 rounded-lg bg-neutral-100 px-3 py-1.5 text-xs font-medium text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
                  <RotateCw className="size-3 animate-spin" />
                  <span>{isCompleted ? 'Done' : `${progress}%`}</span>
                </div>
              )}

              {showCloseButton && !isUpdating && (
                <button
                  type="button"
                  onClick={handleLater}
                  className="rounded-lg p-1 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-neutral-200 cursor-pointer"
                  aria-label="Close"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>

            {/* Sleek bottom progress bar during update */}
            {isUpdating && (
              <div className="absolute inset-x-0 bottom-0 h-[2px] bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
                <motion.div
                  className="h-full bg-neutral-900 dark:bg-white"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                />
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default Banner04
