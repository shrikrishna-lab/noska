"use client";

import React, { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldCheck,
  Lock,
  HardDrive,
  Cpu,
  Radio,
  X,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { cn } from "../../lib/utils";

export interface WhereYourDataGoesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function WhereYourDataGoesModal({
  isOpen,
  onClose,
}: WhereYourDataGoesModalProps) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 select-none">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-md"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-2xl rounded-3xl bg-[#faf8f5] dark:bg-[#18191c] border border-[#ded8cc] dark:border-white/10 text-[#1c1b18] dark:text-white shadow-[0_25px_60px_rgba(0,0,0,0.35)] overflow-hidden z-10 font-sans flex flex-col max-h-[85vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-[#e8e4db] dark:border-white/10 bg-white/60 dark:bg-white/[0.02]">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-emerald-100 dark:bg-emerald-500/20 border border-emerald-300/60 dark:border-emerald-500/30 flex items-center justify-center text-emerald-700 dark:text-emerald-400 shadow-xs shrink-0">
                <ShieldCheck size={22} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold tracking-tight text-[#1c1b18] dark:text-white">
                    Where Your Data Goes
                  </h2>
                  <span className="text-[10.5px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300/60 dark:border-emerald-700/50">
                    Zero Retention
                  </span>
                </div>
                <p className="text-xs text-[#706c64] dark:text-white/50 mt-0.5">
                  Privacy is Noska's default resting state — zero audio storage by architectural design.
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="h-8 w-8 rounded-full bg-[#ede8df] hover:bg-[#e4ded3] dark:bg-white/10 dark:hover:bg-white/20 text-[#706c64] hover:text-[#1c1b18] dark:text-white/70 dark:hover:text-white flex items-center justify-center transition cursor-pointer"
            >
              <X size={15} />
            </button>
          </div>

          {/* Body / Data Flow Journey Cards */}
          <div className="p-6 space-y-3.5 overflow-y-auto scrollbar-thin">
            {/* 1. Audio Processing */}
            <div className="p-4 rounded-2xl bg-white/80 dark:bg-white/[0.03] border border-[#e8e4db] dark:border-white/10 flex items-start gap-3.5 shadow-2xs">
              <div className="w-9 h-9 rounded-xl bg-sky-100 dark:bg-sky-500/20 text-sky-700 dark:text-sky-400 flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                <Radio size={18} />
              </div>
              <div className="space-y-1">
                <div className="text-xs font-bold text-[#1c1b18] dark:text-white flex items-center gap-2">
                  <span>1. Microphone Audio Stream</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-100 dark:bg-sky-500/20 text-sky-800 dark:text-sky-300 font-bold">
                    100% On-Device
                  </span>
                </div>
                <p className="text-[11.5px] text-[#706c64] dark:text-white/60 leading-relaxed">
                  Your raw voice audio is processed exclusively in transient RAM using your device’s Web Audio / Whisper subsystem. Audio bytes are never saved to disk or transmitted for logging.
                </p>
              </div>
            </div>

            {/* 2. Text Cleanup & Rewind */}
            <div className="p-4 rounded-2xl bg-white/80 dark:bg-white/[0.03] border border-[#e8e4db] dark:border-white/10 flex items-start gap-3.5 shadow-2xs">
              <div className="w-9 h-9 rounded-xl bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-400 flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                <Cpu size={18} />
              </div>
              <div className="space-y-1">
                <div className="text-xs font-bold text-[#1c1b18] dark:text-white flex items-center gap-2">
                  <span>2. Speech Cleanup &amp; Voice Self-Correction</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-500/20 text-purple-800 dark:text-purple-300 font-bold">
                    Zero Retention
                  </span>
                </div>
                <p className="text-[11.5px] text-[#706c64] dark:text-white/60 leading-relaxed">
                  In <strong>Local Whisper Mode</strong>, transcription and cleanup stay entirely offline. In <strong>Cloud Mode</strong>, requests are stateless and ephemeral with guaranteed Zero Data Retention (ZDR) — no training on user speech.
                </p>
              </div>
            </div>

            {/* 3. Dictionary & Snippets */}
            <div className="p-4 rounded-2xl bg-white/80 dark:bg-white/[0.03] border border-[#e8e4db] dark:border-white/10 flex items-start gap-3.5 shadow-2xs">
              <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-400 flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                <HardDrive size={18} />
              </div>
              <div className="space-y-1">
                <div className="text-xs font-bold text-[#1c1b18] dark:text-white flex items-center gap-2">
                  <span>3. Voice Snippets &amp; Custom Vocabulary</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-900 dark:text-amber-300 font-bold">
                    AES-256 Encrypted
                  </span>
                </div>
                <p className="text-[11.5px] text-[#706c64] dark:text-white/60 leading-relaxed">
                  Your voice snippet expansion rules, proper nouns, and triggers are stored locally in your app storage. Cloud sync is secured with client-side end-to-end encryption.
                </p>
              </div>
            </div>

            {/* 4. Logging & Telemetry */}
            <div className="p-4 rounded-2xl bg-white/80 dark:bg-white/[0.03] border border-[#e8e4db] dark:border-white/10 flex items-start gap-3.5 shadow-2xs">
              <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                <Lock size={18} />
              </div>
              <div className="space-y-1">
                <div className="text-xs font-bold text-[#1c1b18] dark:text-white flex items-center gap-2">
                  <span>4. Telemetry &amp; Model Optimization</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-900 dark:text-emerald-300 font-bold">
                    Strictly Opt-In
                  </span>
                </div>
                <p className="text-[11.5px] text-[#706c64] dark:text-white/60 leading-relaxed">
                  Voice dataset logging is disabled by default. If you choose to opt in to assist accuracy benchmarking, you can inspect, export (JSONL), or erase all logged pairs at any time.
                </p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-5 border-t border-[#e8e4db] dark:border-white/10 bg-white/60 dark:bg-white/[0.02] flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-400 font-semibold">
              <CheckCircle2 size={15} />
              <span>Compliant with Zero Data Retention (ZDR) standards</span>
            </div>

            <button
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-[#1c1b18] hover:bg-black text-white text-xs font-bold shadow-sm transition cursor-pointer"
            >
              Done
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
