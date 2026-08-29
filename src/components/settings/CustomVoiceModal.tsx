import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X, Volume2, Play } from "lucide-react";
import { addCustomVoice, type ElevenLabsVoice, streamElevenLabsSpeech, getElevenLabsApiKey } from "../../lib/voice/elevenlabs";

interface CustomVoiceModalProps {
  open: boolean;
  onClose: () => void;
  onVoiceAdded: (voices: ElevenLabsVoice[], newVoiceId: string) => void;
  onToast?: (msg: string) => void;
}

export default function CustomVoiceModal({
  open,
  onClose,
  onVoiceAdded,
  onToast,
}: CustomVoiceModalProps) {
  const [name, setName] = useState("");
  const [voiceId, setVoiceId] = useState("");
  const [description, setDescription] = useState("");
  const [accent, setAccent] = useState("");
  const [testingVoice, setTestingVoice] = useState(false);

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !voiceId.trim()) return;

    const updated = addCustomVoice({
      id: voiceId.trim(),
      name: name.trim(),
      description: description.trim() || "Custom Cloned Voice",
      accent: accent.trim() || "Custom Voice",
    });

    onVoiceAdded(updated, voiceId.trim());
    onToast?.(`Custom voice “${name.trim()}” added successfully!`);
    onClose();
    setName("");
    setVoiceId("");
    setDescription("");
    setAccent("");
  };

  const handleTestVoice = async () => {
    if (!voiceId.trim() || testingVoice) return;
    const apiKey = getElevenLabsApiKey();
    setTestingVoice(true);

    try {
      if (apiKey) {
        await streamElevenLabsSpeech({
          text: `Hello! This is a live voice preview of ${name.trim() || "your custom voice"} on Noska.`,
          voiceId: voiceId.trim(),
          apiKey,
          onAudioEnd: () => setTestingVoice(false),
        });
        return;
      }

      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        const u = new SpeechSynthesisUtterance(`Testing voice ${name.trim() || "preview"}.`);
        u.onend = () => setTestingVoice(false);
        u.onerror = () => setTestingVoice(false);
        window.speechSynthesis.speak(u);
      } else {
        setTestingVoice(false);
      }
    } catch (err: any) {
      console.warn("Test voice error:", err);
      onToast?.(err.message || "Failed to preview custom voice");
      setTestingVoice(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-[#e8e4db] space-y-4 text-left"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[#e8e4db] pb-3">
            <div className="flex items-center gap-2 font-bold text-sm text-[#1c1b18]">
              <Sparkles size={16} className="text-purple-600" />
              <span>Add Custom Cloned Voice</span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-[#ede8df] text-[#706c64] hover:text-[#1c1b18] transition cursor-pointer"
            >
              <X size={15} />
            </button>
          </div>

          {/* Form Fields */}
          <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
            <div>
              <label className="font-semibold text-[#1c1b18] block mb-1">Voice Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Elena (Executive Briefings)"
                className="w-full px-3 py-2 rounded-xl bg-[#ede8df]/50 border border-[#e8e4db] text-xs text-[#1c1b18] outline-none focus:border-purple-600 placeholder:text-[#a09c94]"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-semibold text-[#1c1b18]">ElevenLabs Voice ID</label>
                <button
                  type="button"
                  onClick={handleTestVoice}
                  disabled={!voiceId.trim() || testingVoice}
                  className="text-[11px] text-purple-600 hover:text-purple-700 font-semibold flex items-center gap-1 disabled:opacity-40 cursor-pointer"
                >
                  <Play size={10} className={testingVoice ? "animate-pulse fill-purple-600" : ""} />
                  <span>{testingVoice ? "Testing..." : "Test Audio"}</span>
                </button>
              </div>
              <input
                type="text"
                required
                value={voiceId}
                onChange={(e) => setVoiceId(e.target.value)}
                placeholder="e.g. JBFqnCBsd6RMkjVDRZzb"
                className="w-full px-3 py-2 rounded-xl bg-[#ede8df]/50 border border-[#e8e4db] text-xs font-mono text-[#1c1b18] outline-none focus:border-purple-600 placeholder:text-[#a09c94]"
              />
              <span className="text-[10px] text-[#706c64] mt-1 block">
                Copy the Voice ID from your ElevenLabs Dashboard or Community Voice Library.
              </span>
            </div>

            <div>
              <label className="font-semibold text-[#1c1b18] block mb-1">Accent / Style (Optional)</label>
              <input
                type="text"
                value={accent}
                onChange={(e) => setAccent(e.target.value)}
                placeholder="e.g. British (Warm), American (Calm)"
                className="w-full px-3 py-2 rounded-xl bg-[#ede8df]/50 border border-[#e8e4db] text-xs text-[#1c1b18] outline-none focus:border-purple-600 placeholder:text-[#a09c94]"
              />
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#e8e4db]">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-[#ede8df] text-[#1c1b18] font-semibold text-xs hover:bg-[#e4ded3] transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs transition cursor-pointer shadow-sm"
              >
                Add Voice
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
