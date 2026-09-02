import { invoke } from "@tauri-apps/api/core";
import { isDesktop } from "../desktop/platform";

export type DictionaryEntry =
  | { id: string; type: "term"; value: string; createdAt: string }
  | { id: string; type: "correction"; heard: string; write: string; createdAt: string };

export interface VoiceDictionary { version: 1; entries: DictionaryEntry[] }
const KEY = "noska_voice_dictionary";
const EMPTY: VoiceDictionary = { version: 1, entries: [] };

function parse(value: unknown): VoiceDictionary {
  if (!value || typeof value !== "object" || !Array.isArray((value as VoiceDictionary).entries)) return { ...EMPTY };
  return { version: 1, entries: (value as VoiceDictionary).entries };
}

export async function loadVoiceDictionary(): Promise<VoiceDictionary> {
  try {
    if (isDesktop()) return parse(await invoke("load_voice_dictionary"));
    return parse(JSON.parse(localStorage.getItem(KEY) || "null"));
  } catch { return { ...EMPTY }; }
}

export async function saveVoiceDictionary(dictionary: VoiceDictionary): Promise<void> {
  if (isDesktop()) { await invoke("save_voice_dictionary", { dictionary }); return; }
  localStorage.setItem(KEY, JSON.stringify(dictionary, null, 2));
}

export function dictionaryBiasTerms(dictionary: VoiceDictionary, limit = 24): string[] {
  return dictionary.entries
    .flatMap((entry) => entry.type === "term" ? [entry.value] : [entry.write])
    .filter(Boolean).sort((a, b) => b.length - a.length).slice(0, limit);
}

export type DictionaryCorrection = { heard: string; write: string; count: number };

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Applies explicit correction pairs without touching adjacent words.  Separators
 * inside a multi-word phrase are deliberately flexible so `CloudCode` and
 * `Cloud-Code` both match a `cloud code` entry.
 */
export function applyDictionaryCorrections(text: string, dictionary: VoiceDictionary): { text: string; corrections: DictionaryCorrection[] } {
  const entries = dictionary.entries
    .filter((entry): entry is Extract<DictionaryEntry, { type: "correction" }> => entry.type === "correction")
    .filter((entry) => entry.heard.trim() && entry.write.trim())
    .sort((a, b) => b.heard.length - a.heard.length);
  const corrections: DictionaryCorrection[] = [];
  let output = text;

  for (const entry of entries) {
    const parts = entry.heard.trim().split(/[\s-]+/).filter(Boolean).map(escapeRegex);
    if (!parts.length) continue;
    const pattern = `(?<![\\p{L}\\p{N}])${parts.join("[\\s-]*")}(?![\\p{L}\\p{N}])`;
    let count = 0;
    output = output.replace(new RegExp(pattern, "giu"), () => { count += 1; return entry.write; });
    if (count) corrections.push({ heard: entry.heard, write: entry.write, count });
  }
  return { text: output, corrections };
}

/** A short, single-word replacement is more likely to be too broad in normal prose. */
export function dictionaryEntryWarning(heard: string): string | null {
  const parts = heard.trim().split(/[\s-]+/).filter(Boolean);
  if (parts.length === 1 && parts[0].length < 6) return "Short one-word corrections can be too broad. Use the full phrase you want to replace.";
  return null;
}
