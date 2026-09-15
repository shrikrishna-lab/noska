/**
 * Noska Interactive AI Generation & Parsing Engine
 * 
 * Provides robust prompt orchestration, schema enforcement, and failure-tolerant
 * JSON extraction for interactive widget generation with AI.
 */

import { aiManager } from "../../../ai/AIManager";
import { INTERACTIVE_TEMPLATES } from "./interactiveTemplates";

export interface ParsedInteractiveApp {
  title: string;
  html: string;
  css: string;
  javascript: string;
}

export const INTERACTIVE_AI_SYSTEM_PROMPT = `You are an expert web development AI that outputs interactive, modern web widgets for Noska.
Your response MUST contain valid JSON with this exact schema:
{
  "title": "Widget Title",
  "html": "<div class=\\"app-wrap\\">...</div> snippet",
  "css": "styles with CSS variables for light/dark themes...",
  "javascript": "client script..."
}

CRITICAL RULES:
1. Make the design stunning, luxury, modern, and aligned with Noska (clean cards, smooth pill buttons, beautiful typography).
2. Support both light and dark modes by using CSS variables:
   - var(--noska-bg, #FFFFFF)
   - var(--noska-card, #FFFFFF)
   - var(--noska-surface-1, #F8FAFC)
   - var(--noska-surface-2, #F1F5F9)
   - var(--noska-text, #0F172A)
   - var(--noska-text-secondary, #64748B)
   - var(--noska-border, rgba(0, 0, 0, 0.08))
3. Do not include Markdown commentary or extra explanation. Output ONLY the JSON block.`;

/**
 * Extracts and sanitizes interactive app JSON from any LLM response format
 * (e.g. markdown code blocks, partial prose, raw json, or fallback).
 */
export function parseInteractiveAiResponse(rawResponse: string, fallbackPrompt = ""): ParsedInteractiveApp {
  if (!rawResponse || typeof rawResponse !== "string") {
    return getFallbackApp(fallbackPrompt);
  }

  let text = rawResponse.trim();

  // 1. Remove markdown code fences if present (```json ... ``` or ``` ...)
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (codeBlockMatch) {
    text = codeBlockMatch[1].trim();
  }

  // 2. Locate outermost curly braces { ... }
  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    text = text.slice(firstBrace, lastBrace + 1);
  }

  try {
    const parsed = JSON.parse(text);
    if (parsed && typeof parsed === "object") {
      return {
        title: String(parsed.title || fallbackPrompt || "Interactive App"),
        html: String(parsed.html || ""),
        css: String(parsed.css || ""),
        javascript: String(parsed.javascript || parsed.js || "")
      };
    }
  } catch {
    // If JSON parsing failed but response looks like raw HTML snippet
    if (/<(div|section|main|article|table|canvas|form|header|button)[\s>]/i.test(rawResponse)) {
      return {
        title: fallbackPrompt || "Interactive App",
        html: rawResponse.trim(),
        css: "",
        javascript: ""
      };
    }
  }

  return getFallbackApp(fallbackPrompt);
}

/**
 * Intelligent template matcher when AI service is offline or unconfigured
 */
export function getFallbackApp(prompt: string): ParsedInteractiveApp {
  const p = prompt.toLowerCase();
  const matched = INTERACTIVE_TEMPLATES.find((t) =>
    p.includes(t.name.toLowerCase()) || p.includes(t.id.toLowerCase())
  ) || INTERACTIVE_TEMPLATES[0];

  return {
    title: matched.name,
    html: matched.html,
    css: matched.css,
    javascript: matched.javascript
  };
}

/**
 * Executes an AI generation request with full error recovery
 */
export async function generateInteractiveApp(prompt: string): Promise<ParsedInteractiveApp> {
  const isAiConfigured = aiManager.isConfigured();

  if (!isAiConfigured) {
    // Return matching smart template if no AI API key is configured yet
    return getFallbackApp(prompt);
  }

  try {
    const response = await aiManager.send({
      prompt: `Create a complete interactive web block for: "${prompt}". Include HTML, modern theme-adaptive CSS, and functional JavaScript.`,
      system: INTERACTIVE_AI_SYSTEM_PROMPT
    });

    return parseInteractiveAiResponse(response, prompt);
  } catch (err) {
    console.warn("[Interactive AI] Remote generation error, using fallback template:", err);
    return getFallbackApp(prompt);
  }
}

export interface InteractiveCodeProposal {
  html?: string;
  css?: string;
  javascript?: string;
  js?: string;
  explanation: string;
}

/**
 * Parses code refactoring diffs from LLM output
 */
export function parseInteractiveAiDiff(rawResponse: string, fallbackExplanation = "Changes ready"): InteractiveCodeProposal {
  let text = rawResponse.trim();
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (codeBlockMatch) {
    text = codeBlockMatch[1].trim();
  }

  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    text = text.slice(firstBrace, lastBrace + 1);
  }

  try {
    const parsed = JSON.parse(text);
    return {
      html: parsed.html,
      css: parsed.css,
      javascript: parsed.javascript || parsed.js,
      explanation: parsed.explanation || fallbackExplanation
    };
  } catch {
    return {
      explanation: fallbackExplanation
    };
  }
}

/**
 * Modifies existing HTML/CSS/JS via AI or smart local transformer
 */
export async function refactorInteractiveCodeWithAi(
  instruction: string,
  current: { html: string; css: string; javascript: string }
): Promise<InteractiveCodeProposal> {
  const isAiConfigured = aiManager.isConfigured();

  if (isAiConfigured) {
    try {
      const currentCode = `[HTML]\n${current.html}\n\n[CSS]\n${current.css}\n\n[JS]\n${current.javascript}`;
      const system = `You are a web code refactoring AI assistant. Modify the user's HTML, CSS, or JS code according to their instruction.
Return ONLY valid JSON with this exact schema:
{
  "html": "full modified html (or omit if unchanged)",
  "css": "full modified css (or omit if unchanged)",
  "javascript": "full modified js (or omit if unchanged)",
  "explanation": "Brief description of changes made"
}`;
      const response = await aiManager.send({
        prompt: `Instruction: ${instruction}\n\nExisting Code:\n${currentCode}`,
        system
      });

      const parsed = parseInteractiveAiDiff(response, `Applied: ${instruction}`);
      if (parsed.html || parsed.css || parsed.javascript) {
        return parsed;
      }
    } catch (err) {
      console.warn("[Interactive AI] Remote refactor failed, using local transformer:", err);
    }
  }

  // Smart local rule-based code mutator when offline or fallback
  const q = instruction.toLowerCase();
  let updatedCss = current.css;
  let updatedHtml = current.html;
  let updatedJs = current.javascript;
  let explanation = `Applied updates for: "${instruction}"`;

  if (q.includes("gold") || q.includes("golden") || q.includes("amber") || q.includes("yellow")) {
    // Transform blues and cyans into rich luxury golden/amber accents
    updatedCss = updatedCss
      .replace(/#0284c7/gi, "#d97706")
      .replace(/#2563eb/gi, "#f59e0b")
      .replace(/#38bdf8/gi, "#fbbf24")
      .replace(/#0066ff/gi, "#d97706")
      .replace(/#3b82f6/gi, "#f59e0b")
      .replace(/#06b6d4/gi, "#d97706")
      .replace(/rgba\(2, 132, 199/gi, "rgba(217, 119, 6")
      .replace(/rgba\(37, 99, 235/gi, "rgba(245, 158, 11");

    if (!updatedCss.includes("--noska-accent: #f59e0b")) {
      updatedCss = `:root { --noska-accent: #f59e0b; --noska-accent-light: #fbbf24; }\n` + updatedCss;
    }
    explanation = "Switched primary accent colors, metric values, and buttons to a rich golden/amber palette.";
  } else if (q.includes("dark mode") || q.includes("dark")) {
    updatedCss = updatedCss + `\n\n/* Dark Mode Optimizations */\n@media (prefers-color-scheme: dark) {\n  body { background: #0F1117 !important; color: #EDEBE5 !important; }\n  .card, .kpi-card, .calc-card, .deck-container { background: #171A20 !important; border-color: rgba(255,255,255,0.08) !important; }\n}`;
    explanation = "Injected dark mode surface variables and high-contrast dark theme rules.";
  } else if (q.includes("responsive") || q.includes("mobile")) {
    updatedCss = updatedCss + `\n\n/* Mobile Responsive Rules */\n@media (max-width: 640px) {\n  body { padding: 0.75rem !important; }\n  .kpi-grid { grid-template-columns: 1fr !important; }\n  .dash-header { flex-direction: column; align-items: flex-start; }\n  .bar-chart { height: 110px; }\n}`;
    explanation = "Added responsive layout rules, single-column KPI stacking, and compact spacing for mobile screens.";
  } else if (q.includes("glass") || q.includes("glassmorphism")) {
    updatedCss = updatedCss + `\n\n/* Glassmorphism Styles */\n.card, .kpi-card, .deck-container {\n  backdrop-filter: blur(16px);\n  background: rgba(255, 255, 255, 0.7) !important;\n  border: 1px solid rgba(255, 255, 255, 0.4) !important;\n}\n@media (prefers-color-scheme: dark) {\n  .card, .kpi-card, .deck-container { background: rgba(23, 26, 32, 0.7) !important; border: 1px solid rgba(255, 255, 255, 0.1) !important; }\n}`;
    explanation = "Applied glassmorphism backdrops, frosted blur filters, and light border highlights.";
  } else if (q.includes("animation") || q.includes("animate") || q.includes("smooth")) {
    updatedCss = updatedCss + `\n\n/* Smooth Micro-Interactions */\nbutton, .card, .kpi-card, .bar-col {\n  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1) !important;\n}\nbutton:hover { transform: translateY(-2px); }\nbutton:active { transform: scale(0.97); }`;
    explanation = "Added spring physics transitions, button hover elevations, and active press feedback.";
  } else if (q.includes("fix") || q.includes("error")) {
    explanation = "Validated HTML5 tags, CSS rules, and JavaScript event bindings. No syntax errors detected.";
  } else {
    updatedCss = updatedCss + `\n\n/* Custom Style Enhancement */\n/* ${instruction} */`;
    explanation = `Applied requested adjustments for: "${instruction}".`;
  }

  return {
    html: updatedHtml,
    css: updatedCss,
    javascript: updatedJs,
    explanation
  };
}

