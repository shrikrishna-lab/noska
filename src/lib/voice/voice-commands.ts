/**
 * Voice Commands Engine
 * Handles voice commands like "delete that", "scratch that", "new paragraph", "bold that", etc.
 * Works with both real-time transcription and post-processing
 */

export type VoiceCommandType = 
  | "delete_last"           // "delete that", "scratch that", "undo"
  | "delete_last_n"         // "delete last 3 words", "remove last sentence"
  | "new_line"              // "new line", "next line"
  | "new_paragraph"         // "new paragraph", "next paragraph"
  | "format_bold"           // "bold that", "make it bold"
  | "format_italic"         // "italic that", "make it italic"
  | "format_underline"      // "underline that"
  | "format_code"           // "code that", "format as code"
  | "format_heading"        // "heading 1", "make it a header"
  | "format_list"           // "bullet point", "numbered list"
  | "select_last"           // "select that", "highlight that"
  | "copy_selection"        // "copy that"
  | "paste"                 // "paste"
  | "undo"                  // "undo"
  | "redo"                  // "redo"
  | "submit"                // "send", "submit", "done"
  | "cancel"                // "cancel", "discard"
  | "navigate_up"           // "go up", "move up"
  | "navigate_down"         // "go down", "move down"
  | "navigate_top"          // "go to top"
  | "navigate_bottom"       // "go to bottom"
  | "search"                // "search for..."
  | "command"               // generic command (navigate, help, etc.)
  | "custom";

export interface VoiceCommand {
  type: VoiceCommandType;
  trigger: string | RegExp;
  description: string;
  params?: Record<string, any>;
  requiresSelection?: boolean;
  handler?: (params: Record<string, any>, context: CommandContext) => Promise<CommandResult> | CommandResult;
}

export interface CommandContext {
  // Current editor state
  editorContent: string;
  cursorPosition: number;
  selectionStart?: number;
  selectionEnd?: number;
  // Recent transcription history
  recentTranscripts: string[];
  // Current block info
  currentBlockType?: string;
  currentBlockId?: string;
  // App context
  targetApp?: string;
  isInCodeBlock?: boolean;
  isInList?: boolean;
}

export interface CommandResult {
  success: boolean;
  action?: "replace_text" | "insert_text" | "delete_range" | "format_selection" | "navigate" | "custom";
  text?: string;           // For insert_text
  start?: number;          // For delete_range/replace_text
  end?: number;
  format?: "bold" | "italic" | "underline" | "code" | "heading1" | "heading2" | "heading3" | "bullet" | "numbered";
  customAction?: () => void;
  feedback?: string;       // User-facing feedback message
}

export interface ParsedCommand {
  command: VoiceCommand;
  params: Record<string, any>;
  rawMatch: string;
  confidence: number;
}

// ─── Built-in Voice Commands ───
export const BUILTIN_COMMANDS: VoiceCommand[] = [
  // Deletion commands
  {
    type: "delete_last",
    trigger: /\b(delete|scratch|remove|undo)\s+(that|it|last)\b/i,
    description: "Delete the last spoken phrase or word",
    handler: async (_, ctx) => {
      const words = ctx.editorContent.trim().split(/\s+/);
      if (words.length === 0) return { success: false, feedback: "Nothing to delete" };
      
      const lastPhrase = words.slice(-Math.min(10, words.length)).join(" ");
      const start = ctx.editorContent.lastIndexOf(lastPhrase);
      
      return {
        success: true,
        action: "delete_range",
        start: start >= 0 ? start : ctx.editorContent.length - lastPhrase.length,
        end: ctx.editorContent.length,
        feedback: `Deleted "${lastPhrase.slice(0, 30)}..."`,
      };
    },
  },
  {
    type: "delete_last_n",
    trigger: /\b(delete|remove)\s+last\s+(\d+)\s+(word|words|sentence|sentences)\b/i,
    description: "Delete last N words or sentences",
    handler: async (params, ctx) => {
      const count = parseInt(params.count) || 1;
      const unit = params.unit || "words";
      
      if (unit.startsWith("sentence")) {
        const sentences = ctx.editorContent.split(/(?<=[.!?])\s+/);
        const toDelete = sentences.slice(-count).join(" ");
        const start = ctx.editorContent.lastIndexOf(toDelete);
        return {
          success: true,
          action: "delete_range",
          start: start >= 0 ? start : ctx.editorContent.length - toDelete.length,
          end: ctx.editorContent.length,
          feedback: `Deleted last ${count} sentence(s)`,
        };
      } else {
        const words = ctx.editorContent.trim().split(/\s+/);
        const toDelete = words.slice(-count).join(" ");
        const start = ctx.editorContent.lastIndexOf(toDelete);
        return {
          success: true,
          action: "delete_range",
          start: start >= 0 ? start : ctx.editorContent.length - toDelete.length,
          end: ctx.editorContent.length,
          feedback: `Deleted last ${count} word(s)`,
        };
      }
    },
  },

  // Navigation commands
  {
    type: "new_line",
    trigger: /\b(new|next)\s+line\b/i,
    description: "Insert a new line",
    handler: () => ({
      success: true,
      action: "insert_text",
      text: "\n",
      feedback: "New line",
    }),
  },
  {
    type: "new_paragraph",
    trigger: /\b(new|next)\s+paragraph\b/i,
    description: "Insert a new paragraph (double line break)",
    handler: () => ({
      success: true,
      action: "insert_text",
      text: "\n\n",
      feedback: "New paragraph",
    }),
  },

  // Formatting commands
  {
    type: "format_bold",
    trigger: /\b(bold|make\s+(it|this|that)\s+bold)\b/i,
    description: "Make selected text bold",
    requiresSelection: true,
    handler: () => ({
      success: true,
      action: "format_selection",
      format: "bold",
      feedback: "Bold applied",
    }),
  },
  {
    type: "format_italic",
    trigger: /\b(italic|italics|make\s+(it|this|that)\s+italic)\b/i,
    description: "Make selected text italic",
    requiresSelection: true,
    handler: () => ({
      success: true,
      action: "format_selection",
      format: "italic",
      feedback: "Italic applied",
    }),
  },
  {
    type: "format_underline",
    trigger: /\b(underline|make\s+(it|this|that)\s+underlined?)\b/i,
    description: "Underline selected text",
    requiresSelection: true,
    handler: () => ({
      success: true,
      action: "format_selection",
      format: "underline",
      feedback: "Underline applied",
    }),
  },
  {
    type: "format_code",
    trigger: /\b(code|format\s+as\s+code|make\s+(it|this|that)\s+code)\b/i,
    description: "Format as inline code or code block",
    requiresSelection: true,
    handler: (_, ctx) => ({
      success: true,
      action: "format_selection",
      format: ctx.isInCodeBlock ? "code" : "code",
      feedback: "Code formatting applied",
    }),
  },
  {
    type: "format_heading",
    trigger: /\b(heading|header)\s*([1-3]?)\b/i,
    description: "Convert to heading (1-3)",
    handler: (params) => {
      const level = parseInt(params.level) || 1;
      return {
        success: true,
        action: "format_selection",
        format: `heading${Math.min(3, Math.max(1, level))}` as any,
        feedback: `Heading ${level} applied`,
      };
    },
  },
  {
    type: "format_list",
    trigger: /\b(bullet|bulleted|numbered|number)\s+(point|list)\b/i,
    description: "Convert to bullet or numbered list",
    handler: (params) => ({
      success: true,
      action: "format_selection",
      format: params.type?.includes("number") ? "numbered" : "bullet",
      feedback: `${params.type?.includes("number") ? "Numbered" : "Bullet"} list applied`,
    }),
  },

  // Selection commands
  {
    type: "select_last",
    trigger: /\b(select|highlight)\s+(that|it|last)\b/i,
    description: "Select the last spoken phrase",
    handler: async (_, ctx) => {
      const words = ctx.editorContent.trim().split(/\s+/);
      if (words.length === 0) return { success: false, feedback: "Nothing to select" };
      
      const lastPhrase = words.slice(-Math.min(10, words.length)).join(" ");
      const start = ctx.editorContent.lastIndexOf(lastPhrase);
      
      return {
        success: true,
        action: "custom",
        customAction: () => {
          // This would be implemented by the editor
          console.log("Select range:", start, start + lastPhrase.length);
        },
        feedback: `Selected "${lastPhrase.slice(0, 30)}..."`,
      };
    },
  },

  // Clipboard commands
  {
    type: "copy_selection",
    trigger: /\b(copy)\s+(that|it|selection)\b/i,
    description: "Copy selected text",
    requiresSelection: true,
    handler: async () => {
      try {
        await navigator.clipboard.writeText(""); // Placeholder - actual text from editor
        return { success: true, feedback: "Copied to clipboard" };
      } catch {
        return { success: false, feedback: "Copy failed" };
      }
    },
  },
  {
    type: "paste",
    trigger: /\b(paste)\b/i,
    description: "Paste from clipboard",
    handler: async () => {
      try {
        const text = await navigator.clipboard.readText();
        return {
          success: true,
          action: "insert_text",
          text,
          feedback: "Pasted from clipboard",
        };
      } catch {
        return { success: false, feedback: "Paste failed" };
      }
    },
  },

  // History commands
  {
    type: "undo",
    trigger: /\b(undo)\b/i,
    description: "Undo last action",
    handler: () => ({
      success: true,
      action: "custom",
      customAction: () => document.execCommand("undo"),
      feedback: "Undo",
    }),
  },
  {
    type: "redo",
    trigger: /\b(redo)\b/i,
    description: "Redo last undone action",
    handler: () => ({
      success: true,
      action: "custom",
      customAction: () => document.execCommand("redo"),
      feedback: "Redo",
    }),
  },

  // Submit/Cancel
  {
    type: "submit",
    trigger: /\b(send|submit|done|finish|complete)\b/i,
    description: "Submit/complete the current input",
    handler: () => ({
      success: true,
      action: "custom",
      customAction: () => {
        const event = new KeyboardEvent("keydown", { key: "Enter", ctrlKey: true });
        document.dispatchEvent(event);
      },
      feedback: "Submitted",
    }),
  },
  {
    type: "cancel",
    trigger: /\b(cancel|discard|abort|never\s+mind)\b/i,
    description: "Cancel/discard current input",
    handler: () => ({
      success: true,
      action: "custom",
      customAction: () => {
        const event = new KeyboardEvent("keydown", { key: "Escape" });
        document.dispatchEvent(event);
      },
      feedback: "Cancelled",
    }),
  },
];

// ─── Command Parser ───
export class VoiceCommandParser {
  private commands: VoiceCommand[] = [];
  private customCommands: Map<string, VoiceCommand> = new Map();

  constructor(customCommands: VoiceCommand[] = []) {
    this.commands = [...BUILTIN_COMMANDS, ...customCommands];
    customCommands.forEach(cmd => this.customCommands.set(cmd.type, cmd));
  }

  addCommand(command: VoiceCommand) {
    this.commands.push(command);
  }

  removeCommand(type: VoiceCommandType) {
    this.commands = this.commands.filter(c => c.type !== type);
    this.customCommands.delete(type);
  }

  parse(text: string, context: CommandContext): ParsedCommand | null {
    const normalized = text.trim().toLowerCase();
    
    for (const command of this.commands) {
      const match = this.matchTrigger(command.trigger, normalized);
      if (match) {
        const params = this.extractParams(command.trigger, normalized, match);
        return {
          command,
          params,
          rawMatch: match,
          confidence: this.calculateConfidence(command, normalized, match),
        };
      }
    }
    
    return null;
  }

  private matchTrigger(trigger: string | RegExp, text: string): string | null {
    if (typeof trigger === "string") {
      if (text.includes(trigger.toLowerCase())) return trigger;
      return null;
    }
    const match = text.match(trigger);
    return match ? match[0] : null;
  }

  private extractParams(trigger: string | RegExp, text: string, match: string): Record<string, any> {
    const params: Record<string, any> = {};
    
    if (trigger instanceof RegExp) {
      const regexMatch = text.match(trigger);
      if (regexMatch) {
        // Named groups
        if (regexMatch.groups) {
          Object.assign(params, regexMatch.groups);
        }
        // Numbered groups
        for (let i = 1; i < regexMatch.length; i++) {
          params[`group${i}`] = regexMatch[i];
        }
        // Specific known patterns
        if (trigger.source.includes("(\\d+)")) {
          params.count = regexMatch[1];
        }
        if (trigger.source.includes("(word|sentence)")) {
          params.unit = regexMatch[1];
        }
        if (trigger.source.includes("([1-3])")) {
          params.level = regexMatch[1];
        }
      }
    }
    
    return params;
  }

  private calculateConfidence(command: VoiceCommand, text: string, match: string): number {
    // Higher confidence for exact matches, lower for partial
    const matchRatio = match.length / text.length;
    const baseConfidence = 0.7 + (matchRatio * 0.3);
    
    // Boost for commands that require selection when selection exists
    if (command.requiresSelection) {
      return Math.min(0.95, baseConfidence + 0.1);
    }
    
    return baseConfidence;
  }

  // Check if text contains a command (for real-time detection)
  hasCommand(text: string): boolean {
    return this.parse(text, {
      editorContent: "",
      cursorPosition: 0,
      recentTranscripts: [],
    }) !== null;
  }
}

// ─── Command Executor ───
export class VoiceCommandExecutor {
  private parser: VoiceCommandParser;
  private onCommandExecuted?: (result: CommandResult, command: ParsedCommand) => void;
  private onCommandFeedback?: (feedback: string) => void;

  constructor(
    parser: VoiceCommandParser,
    callbacks?: {
      onExecuted?: (result: CommandResult, command: ParsedCommand) => void;
      onFeedback?: (feedback: string) => void;
    }
  ) {
    this.parser = parser;
    this.onCommandExecuted = callbacks?.onExecuted;
    this.onCommandFeedback = callbacks?.onFeedback;
  }

  async execute(text: string, context: CommandContext): Promise<CommandResult | null> {
    const parsed = this.parser.parse(text, context);
    if (!parsed) return null;

    // Check confidence threshold
    if (parsed.confidence < 0.7) return null;

    // Check selection requirement
    if (parsed.command.requiresSelection && 
        (context.selectionStart === undefined || context.selectionStart === context.selectionEnd)) {
      this.onCommandFeedback?.("Select text first to use this command");
      return { success: false, feedback: "Selection required" };
    }

    try {
      const result = await parsed.command.handler(parsed.params, context);
      
      if (result.feedback) {
        this.onCommandFeedback?.(result.feedback);
      }
      
      this.onCommandExecuted?.(result, parsed);
      return result;
    } catch (error) {
      const errorResult: CommandResult = {
        success: false,
        feedback: `Command failed: ${error}`,
      };
      this.onCommandFeedback?.(errorResult.feedback!);
      return errorResult;
    }
  }

  // Process streaming text for real-time command detection
  processStreaming(text: string, context: CommandContext): ParsedCommand | null {
    // Only check for commands at sentence boundaries or pauses
    const sentences = text.split(/(?<=[.!?])\s+/);
    const lastSentence = sentences[sentences.length - 1] || text;
    
    return this.parser.parse(lastSentence, context);
  }
}

// ─── Helper: Create command context from editor ───
export function createCommandContext(
  editor: {
    getContent: () => string;
    getCursorPosition: () => number;
    getSelection: () => { start: number; end: number } | null;
    getCurrentBlock: () => { type: string; id: string } | null;
  },
  recentTranscripts: string[] = []
): CommandContext {
  const content = editor.getContent();
  const cursor = editor.getCursorPosition();
  const selection = editor.getSelection();
  const block = editor.getCurrentBlock();
  
  return {
    editorContent: content,
    cursorPosition: cursor,
    selectionStart: selection?.start,
    selectionEnd: selection?.end,
    currentBlockType: block?.type,
    currentBlockId: block?.id,
    recentTranscripts,
    targetApp: detectTargetApp(),
    isInCodeBlock: block?.type === "code",
    isInList: block?.type === "bullet" || block?.type === "number",
  };
}

function detectTargetApp(): string {
  const active = document.activeElement;
  if (!active) return "unknown";
  
  const tag = active.tagName.toLowerCase();
  const className = (active.className || "").toLowerCase();
  const placeholder = (active.getAttribute("placeholder") || "").toLowerCase();
  
  if (className.includes("monaco") || className.includes("codemirror") || tag === "code") return "code";
  if (className.includes("chat") || className.includes("message") || placeholder.includes("message")) return "chat";
  if (className.includes("email") || className.includes("compose") || placeholder.includes("subject")) return "email";
  
  return "docs";
}