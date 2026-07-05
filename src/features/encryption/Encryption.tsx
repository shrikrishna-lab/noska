import React, { useState } from "react";
import { motion } from "framer-motion";
import { SPRING_PRESETS } from "../motion/MotionSystem";
import { Lock, Unlock, KeyRound, AlertTriangle, X } from "lucide-react";

/* ─── Web Crypto API Helpers ─── */

const getBytes = (str) => new TextEncoder().encode(str);

function bufToHex(buf) {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function hexToBytes(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return bytes;
}

export async function deriveKey(passphrase, salt) {
  const passphraseBytes = getBytes(passphrase);
  const saltBytes = typeof salt === "string" ? hexToBytes(salt) : salt;

  const baseKey = await window.crypto.subtle.importKey(
    "raw",
    passphraseBytes,
    { name: "PBKDF2" },
    false,
    ["deriveBits", "deriveKey"]
  );

  return window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: saltBytes,
      iterations: 100000,
      hash: "SHA-256"
    },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

export async function encryptData(text, passphrase) {
  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  
  const key = await deriveKey(passphrase, salt);
  const textBytes = getBytes(text);
  
  const ciphertext = await window.crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: iv
    },
    key,
    textBytes
  );
  
  return {
    encryptedBlocks: bufToHex(ciphertext),
    iv: bufToHex(iv),
    salt: bufToHex(salt)
  };
}

export async function decryptData(ciphertextHex, passphrase, ivHex, saltHex) {
  const key = await deriveKey(passphrase, hexToBytes(saltHex));
  const ciphertext = hexToBytes(ciphertextHex);
  const iv = hexToBytes(ivHex);
  
  const plaintext = await window.crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: iv
    },
    key,
    ciphertext
  );
  
  return new TextDecoder().decode(plaintext);
}

/* ─── Lock Page Modal ─── */

export function LockPageModal({ pageTitle, onLock, onClose, onToast }) {
  React.useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const [passphrase, setPassphrase] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!passphrase) {
      setError("Passphrase cannot be empty.");
      return;
    }
    if (passphrase.length < 4) {
      setError("Passphrase must be at least 4 characters.");
      return;
    }
    if (passphrase !== confirmPass) {
      setError("Passphrases do not match.");
      return;
    }

    setLoading(true);
    try {
      // Simulate slight delay for premium feel / loading state
      await new Promise((r) => setTimeout(r, 600));
      await onLock(passphrase);
      onToast("Page encrypted and locked successfully.");
      onClose();
    } catch (err) {
      setError("Failed to encrypt page: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-[4px] flex items-center justify-center p-6"
      onMouseDown={onClose}
    >
      <motion.div
        initial={{ scale: 0.96, opacity: 0, y: 15 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.96, opacity: 0, y: 10 }}
        transition={SPRING_PRESETS.soft}
        className="w-[420px] max-w-full flex flex-col overflow-hidden rounded-xl border border-[var(--border-strong)] bg-[var(--bg)] shadow-2xl p-6"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Lock size={18} className="text-[var(--danger)]" />
            <h2 className="font-semibold text-[var(--text)]">Encrypt Page</h2>
          </div>
          <button onClick={onClose} className="grid h-7 w-7 place-items-center rounded-md text-[var(--secondary)] hover:bg-[var(--hover)] hover:text-[var(--text)]">
            <X size={16} />
          </button>
        </div>

        <p className="text-xs text-[var(--secondary)] mb-4">
          Locking <strong className="text-[var(--text)]">"{pageTitle}"</strong> will encrypt all its blocks using 256-bit AES-GCM. 
          The data is only decrypted locally in your browser.
        </p>

        <div className="p-3 mb-4 rounded-lg bg-[var(--danger)]/10 border border-[var(--danger)]/20 flex gap-2 text-[var(--danger)]">
          <AlertTriangle size={16} className="shrink-0 mt-0.5" />
          <span className="text-[11px] leading-relaxed">
            <strong>Warning:</strong> Noska cannot recover this passphrase. If you forget it, the page data will be lost forever.
          </span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-medium uppercase tracking-wider text-[var(--muted)]">Passphrase</label>
            <input
              type="password"
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
              placeholder="Enter secure passphrase"
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text)] placeholder-[var(--muted)] focus:border-[var(--accent)] focus:outline-none"
              disabled={loading}
              autoFocus
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-medium uppercase tracking-wider text-[var(--muted)]">Confirm Passphrase</label>
            <input
              type="password"
              value={confirmPass}
              onChange={(e) => setConfirmPass(e.target.value)}
              placeholder="Confirm passphrase"
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text)] placeholder-[var(--muted)] focus:border-[var(--accent)] focus:outline-none"
              disabled={loading}
            />
          </div>

          {error && <div className="text-xs text-[var(--danger)] font-medium">{error}</div>}

          <div className="flex gap-2 justify-end pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-xs font-semibold text-[var(--secondary)] hover:bg-[var(--hover)]"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 rounded-lg bg-[var(--danger)] hover:bg-[var(--danger)]/90 px-4 py-2 text-xs font-semibold text-white shadow-sm"
              disabled={loading}
            >
              {loading ? (
                <div className="h-3 w-3 animate-spin rounded-full border border-[var(--text)] border-t-transparent" />
              ) : (
                <Lock size={12} />
              )}
              Encrypt Page
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

/* ─── Unlock Page Prompt ─── */

export function UnlockPagePrompt({ pageTitle, onUnlock, onDecryptRemove, onToast }) {
  const [passphrase, setPassphrase] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await new Promise((r) => setTimeout(r, 600)); // smooth feeling
      await onUnlock(passphrase);
      onToast("Page unlocked successfully.");
    } catch (err) {
      setError("Incorrect passphrase. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 max-w-md mx-auto min-h-[400px]">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={SPRING_PRESETS.soft}
        className="text-center w-full"
      >
        <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--danger)]/10 text-[var(--danger)]">
          <KeyRound size={28} />
        </div>

        <h2 className="text-xl font-bold text-[var(--text)] mb-2">This page is encrypted</h2>
        <p className="text-xs text-[var(--secondary)] mb-6">
          Enter the passphrase to decrypt and access <strong className="text-[var(--text)]">"{pageTitle}"</strong>.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4 text-left">
          <div className="space-y-1">
            <input
              type="password"
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
              placeholder="Passphrase"
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-center text-sm text-[var(--text)] placeholder-[var(--muted)] focus:border-[var(--accent)] focus:outline-none"
              disabled={loading}
              autoFocus
            />
          </div>

          {error && <div className="text-xs text-[var(--danger)] text-center font-medium">{error}</div>}

          <button
            type="submit"
            className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-white shadow-sm"
            disabled={loading}
          >
            {loading ? (
              <div className="h-4 w-4 animate-spin rounded-full border border-[var(--text)] border-t-transparent" />
            ) : (
              <>
                <Unlock size={14} />
                Unlock Page
              </>
            )}
          </button>
        </form>

        <div className="mt-8 border-t border-[var(--border)] pt-4">
          <button
            onClick={() => {
              if (window.confirm("Are you sure you want to permanently delete this page? You do not have the passphrase to recover it.")) {
                onDecryptRemove();
              }
            }}
            className="text-xs text-[var(--danger)]/70 hover:text-[var(--danger)] hover:underline"
          >
            Force delete page
          </button>
        </div>
      </motion.div>
    </div>
  );
}
