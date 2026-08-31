"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldCheck,
  Lock,
  HardDrive,
  Cpu,
  CloudOff,
  Radio,
  FileText,
  X,
  CheckCircle2,
  ExternalLink,
} from "lucide-react";

export interface WhereYourDataGoesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function WhereYourDataGoesModal({
  isOpen,
  onClose,
}: WhereYourDataGoesModalProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
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
          className="relative w-full max-w-2xl rounded-3xl bg-[#141416] border border-white/15 text-white shadow-2xl overflow-hidden z-10 font-sans"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <ShieldCheck size={22} />
              </div>
              <div>
                <h2 className="text-lg font-semibold tracking-tight text-white">
                  Where Your Data Goes
                </h2>
                <p className="text-xs text-white/50">
                  Privacy is Noska's resting state — zero retention by design.
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="h-8 w-8 rounded-full bg-white/10 hover:bg-white/20 text-white/70 hover:text-white flex items-center justify-center transition cursor-pointer"
            >
              <X size={15} />
            </button>
          </div>

          {/* Body / Plain Language Data Flow Diagram */}
          <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto scrollbar-thin">
            {/* 1. Audio Processing */}
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-start gap-4">
              <div className="w-9 h-9 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Radio size={18} />
              </div>
              <div className="space-y-1">
                <div className="text-sm font-semibold text-white flex items-center gap-2">
                  <span>1. Microphone Audio</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 font-medium">
                    100% On-Device
                  </span>
                </div>
                <p className="text-xs text-white/60 leading-relaxed">
                  Your raw voice audio is processed locally using your device’s Web Audio subsystem.
                  Audio streams are never uploaded, recorded to disk, or saved to external servers.
                </p>
              </div>
            </div>

            {/* 2. Text Cleanup & Rewind */}
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-start gap-4">
              <div className="w-9 h-9 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Cpu size={18} />
              </div>
              <div className="space-y-1">
                <div className="text-sm font-semibold text-white flex items-center gap-2">
                  <span>2. Speech Cleanup & Rewind Self-Correction</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-medium">
                    Zero Retention
                  </span>
                </div>
                <p className="text-xs text-white/60 leading-relaxed">
                  In <strong>Local Mode</strong>, cleanup runs strictly on your machine. In <strong>Cloud Mode</strong>,
                  requests are processed through stateless ephemeral endpoints with guaranteed Zero Data Retention (ZDR) — no training on user speech, ever.
                </p>
              </div>
            </div>

            {/* 3. Dictionary & Snippets */}
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-start gap-4">
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                <HardDrive size={18} />
              </div>
              <div className="space-y-1">
                <div className="text-sm font-semibold text-white flex items-center gap-2">
                  <span>3. Custom Dictionary & Snippets</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-medium">
                    Local / End-to-End Encrypted
                  </span>
                </div>
                <p className="text-xs text-white/60 leading-relaxed">
                  Your custom dictionary terms, proper nouns, and voice snippets are stored locally in your browser cache.
                  Optional cross-device sync uses client-side AES-GCM 256 encryption.
                </p>
              </div>
            </div>

            {/* 4. Logging & Telemetry */}
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-start gap-4">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Lock size={18} />
              </div>
              <div className="space-y-1">
                <div className="text-sm font-semibold text-white flex items-center gap-2">
                  <span>4. Telemetry & Model Improvement</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-medium">
                    Off By Default (Opt-In Only)
                  </span>
                </div>
                <p className="text-xs text-white/60 leading-relaxed">
                  We never collect voice training data without explicit consent. If you choose to opt in, you can view, export (JSONL), or wipe your logged pairs at any time in Settings.
                </p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-white/10 bg-white/[0.02] flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-emerald-400 font-medium">
              <CheckCircle2 size={14} />
              <span>Compliant with Zero Data Retention (ZDR) architecture</span>
            </div>

            <button
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-white text-black text-xs font-semibold hover:bg-white/90 transition cursor-pointer"
            >
              Got It
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
