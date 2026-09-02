import type { VoiceSettings } from "./voice-settings";

export const AUTO_LANGUAGE = "auto";
export const HINGLISH_LANGUAGE = "hinglish";

const LANGUAGE_ALIASES: Record<string, string> = {
  en: "en-US", "en-us": "en-US", "en-gb": "en-GB", "en-in": "en-IN",
  hi: "hi-IN", "hi-in": "hi-IN", es: "es-ES", fr: "fr-FR", de: "de-DE",
  ja: "ja-JP", "ja-jp": "ja-JP", zh: "zh-CN", "zh-cn": "zh-CN",
  pt: "pt-BR", it: "it-IT", ru: "ru-RU", ar: "ar-SA", ko: "ko-KR",
};

/**
 * Web Speech has no reliable speech-language auto-detection. Auto therefore
 * selects the first supported browser locale, falling back to English rather
 * than passing the invalid `auto` tag through to Chrome.
 */
export function resolveAutoLanguage(locales: readonly string[] = []): string {
  for (const locale of locales) {
    const normalized = locale.toLowerCase();
    if (LANGUAGE_ALIASES[normalized]) return LANGUAGE_ALIASES[normalized];
    const base = normalized.split("-")[0];
    if (LANGUAGE_ALIASES[base]) return LANGUAGE_ALIASES[base];
  }
  return "en-US";
}

export function resolveRecognitionLanguage(settings: Pick<VoiceSettings, "language" | "languageMode" | "sourceLanguage">, locales?: readonly string[]): string {
  const choice = settings.languageMode === "translation" && settings.sourceLanguage && settings.sourceLanguage !== AUTO_LANGUAGE
    ? settings.sourceLanguage
    : settings.language;
  if (choice === HINGLISH_LANGUAGE) return "en-IN";
  if (!choice || choice === AUTO_LANGUAGE) {
    const browserLocales = locales ?? (typeof navigator === "undefined" ? [] : navigator.languages);
    return resolveAutoLanguage(browserLocales);
  }
  return choice;
}

/** The shipped ggml-tiny.en model must only receive English audio. */
export function canUseEnglishOnlyLocalModel(language: string): boolean {
  return language.toLowerCase().startsWith("en-");
}
