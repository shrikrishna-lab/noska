/**
 * Advanced Voice Intelligence Engine
 * Parses natural language voice commands into intents and executes actions.
 * Goes beyond WisprFlow with deep app integration, context awareness, and multi-modal processing.
 */

import { VoiceCommandParser, VoiceCommand, ParsedCommand, CommandContext, VoiceCommandExecutor } from "./voice-commands";
import { createSTTEngine, STTEngine } from "./stt-engine";
import { cleanDictation, cleanDictationSync, detectTargetApp, getCustomDictionary } from "./dictation-cleanup";
import { detectLanguage, detectCodeSwitching } from "./dictation-cleanup";

export type VoiceIntentType = 
  | "dictation"          // Just speak text to insert
  | "command"            // Pure command (delete, format, navigate, etc.)
  | "mixed"              // Text + commands in same utterance
  | "action"             // Open, create, navigate actions
  | "system"             // System-level commands (settings, help, etc.)
  | "code"               // Code dictation or command execution
  | "email"              // Email dictation/composition
  | "chat"               // Chat/messaging dictation/commands;

export interface VoiceIntent {
  type: VoiceIntentType;
  confidence: number;
  text: string;
  // Dictation parts
  dictationText?: string;
  // Command parts
  command?: VoiceCommand;
  parsedCommand?: ParsedCommand;
  // Action details
  targetAction?: string;
  targetContext?: string;
  // Language info
  detectedLanguage?: string;
  codeSwitched?: boolean;
  secondaryLanguage?: string;
  // Context
  cursorContext?: string;
  editorState?: string;
}

export interface VoiceProcessingResult {
  success: boolean;
  // For dictation
  textToInsert?: string;
  // For commands
  action?: "replace" | "insert" | "delete" | "format" | "navigate" | "custom" | "system";
  commandResult?: any;
  // Feedback
  feedback?: string;
  // For mixed/continuation
  requiresConfirmation?: boolean;
  continuationId?: string;
}

export class VoiceIntelligence {
  private sttEngine: STTEngine;
  private commandParser: VoiceCommandParser;
  private commandExecutor: VoiceCommandExecutor;
  private telemetry: VoiceTelemetry;
  private config: {
    autoProcess: boolean;
    autoDictation: boolean;
    autoCommands: boolean;
    confirmationRequiredForMixed: boolean;
    languageDetection: boolean;
    codeSwitchingDetection: boolean;
  };

  constructor(config: Partial<{ 
    autoProcess: boolean; 
    autoDictation: boolean; 
    autoCommands: boolean; 
    confirmationRequiredForMixed: boolean;
    languageDetection: boolean;
    codeSwitchingDetection: boolean;
  }> = {}) {
    this.sttEngine = createSTTEngine();
    this.commandParser = new VoiceCommandParser();
    this.commandExecutor = new VoiceCommandExecutor(this.commandParser);
    this.telemetry = new VoiceTelemetry();
    
    this.config = {
      autoProcess: true,
      autoDictation: true,
      autoCommands: true,
      confirmationRequiredForMixed: true,
      languageDetection: true,
      codeSwitchingDetection: true,
      ...config,
    };

    // Register default voice commands that map to app actions
    this.registerDefaultIntents();
  }

  private registerDefaultIntents() {
    // Map common voice intents to command triggers
    
    // Navigation commands
    this.commandParser.addCommand({
      type: "delete_last",
      trigger: /\b(delete|remove|undo|scratch)\s+(that|it|last|words|sentences?)\b/i,
      description: "Delete spoken text",
    });

    this.commandParser.addCommand({
      type: "new_line",
      trigger: /\b(new|next)\s+line\b/i,
      description: "New line",
    });

    this.commandParser.addCommand({
      type: "new_paragraph",
      trigger: /\b(new|next)\s+paragraph\b/i,
      description: "New paragraph",
    });

    // Format commands
    this.commandParser.addCommand({
      type: "format_bold",
      trigger: /\b(bold|make\s+this\s+bold)\b/i,
      description: "Bold text",
    });

    this.commandParser.addCommand({
      type: "format_italic",
      trigger: /\b(italic|make\s+this\s+italic)\b/i,
      description: "Italic text",
    });

    // Navigation
    this.commandParser.addCommand({
      type: "submit",
      trigger: /\b(send|submit|done|finish|send\s+message)\b/i,
      description: "Submit/send",
    });

    this.commandParser.addCommand({
      type: "cancel",
      trigger: /\b(cancel|discard|abort|never\s+mind)\b/i,
      description: "Cancel/discard",
    });

    // System actions
    this.commandParser.addCommand({
      type: "command",
      trigger: /\b(go to|navigate to|open)\s+(settings|home|profile|page|dashboard)\b/i,
      description: "Navigate to section",
    });

    this.commandParser.addCommand({
      type: "command",
      trigger: /\b(help|what can you do)\b/i,
      description: "Help command",
    });
  }

  /**
   * Process a voice utterance - parse intent and execute
   */
  async processUtterance(
    text: string,
    editorState: {
      getContent: () => string;
      getCursorPosition: () => number;
      getSelection: () => { start: number; end: number } | null;
      getCurrentBlock: () => { type: string; id: string } | null;
      executeAction: (action: string, params?: any) => Promise<any>;
    }
  ): Promise<VoiceProcessingResult> {
    const context = this.buildCommandContext(editorState);
    const languageInfo = this.detectLanguageAndCodeSwitching(text);
    
    // 1. First, check for pure dictation (just speak text, no commands)
    const pureDictationScore = this.calculateDictationScore(text, context);
    
    // 2. Parse for commands
    const parsedCommand = this.commandParser.parse(text, context);
    
    // 3. Determine intent type
    const intent = this.determineIntent(text, parsedCommand, pureDictationScore, languageInfo);
    
    // 4. Execute based on intent
    switch (intent.type) {
      case "dictation":
        return this.handleDictation(intent, context);
      case "command":
        return this.handleCommand(intent, parsedCommand!, context);
      case "mixed":
        return this.handleMixedIntent(intent, parsedCommand!, context);
      case "action":
        return this.handleActionIntent(intent, parsedCommand!, context);
      case "system":
        return this.handleSystemIntent(intent, context);
      case "code":
        return this.handleCodeIntent(intent, parsedCommand!, context);
      default:
        return { success: false, feedback: "Could not understand voice command" };
    }
  }

  private buildCommandContext(editorState: any): CommandContext {
    const content = editorState.getContent();
    const cursor = editorState.getCursorPosition();
    const selection = editorState.getSelection();
    const block = editorState.getCurrentBlock();
    
    return {
      editorContent: content,
      cursorPosition: cursor,
      selectionStart: selection?.start,
      selectionEnd: selection?.end,
      currentBlockType: block?.type,
      currentBlockId: block?.id,
      recentTranscripts: [],
      targetApp: detectTargetApp(),
      isInCodeBlock: block?.type === "code",
      isInList: block?.type === "bullet" || block?.type === "number",
    };
  }

  private detectLanguageAndCodeSwitching(text: string): { primary: string; secondary: string[]; codeSwitched: boolean } {
    if (!this.config.languageDetection) return { primary: "en-US", secondary: [], codeSwitched: false };
    
    const primary = detectLanguage(text);
    const { primary: detectedPrimary, secondary } = detectCodeSwitching(text);
    const codeSwitched = secondary.length > 0;
    
    return { primary: detectedPrimary, secondary, codeSwitched };
  }

  private calculateDictationScore(text: string, context: CommandContext): number {
    // If text is long and has no command triggers, it's likely dictation
    const trimmed = text.trim();
    if (trimmed.length === 0) return 0;
    
    // Check for command triggers
    const hasCommand = this.commandParser.hasCommand(trimmed);
    if (hasCommand) return 0;
    
    // If short (less than 3 words), likely a command or filler
    const wordCount = trimmed.split(/\s+/).length;
    if (wordCount <= 3) return 0.2;
    
    // Longer text without command triggers is likely dictation
    if (wordCount >= 10) return 0.9;
    
    // Medium length - depends on content
    const hasSentenceStructure = /[.!?]/.test(trimmed) || /\b(and|but|or|so|because)\b/i.test(trimmed);
    return hasSentenceStructure ? 0.7 : 0.4;
  }

  private determineIntent(
    text: string,
    parsedCommand: ParsedCommand | null,
    dictationScore: number,
    languageInfo: { primary: string; secondary: string[]; codeSwitched: boolean }
  ): VoiceIntent {
    const trimmed = text.trim();
    
    // Pure command (parser found a match with high confidence)
    if (parsedCommand && parsedCommand.confidence > 0.8) {
      return {
        type: "command",
        confidence: parsedCommand.confidence,
        text,
        command: parsedCommand.command,
        parsedCommand,
        detectedLanguage: languageInfo.primary,
        codeSwitched: languageInfo.codeSwitched,
      };
    }
    
    // Pure dictation (no command found, substantial text)
    if (dictationScore > 0.7 && !parsedCommand) {
      return {
        type: "dictation",
        confidence: dictationScore,
        text,
        detectedLanguage: languageInfo.primary,
        codeSwitched: languageInfo.codeSwitched,
      };
    }
    
    // Mixed intent (text + possible command)
    if (parsedCommand && dictationScore > 0.3) {
      // Extract the dictation part (text before/after the command)
      const extracted = this.extractDictationFromMixed(text, parsedCommand);
      return {
        type: "mixed",
        confidence: Math.min(parsedCommand.confidence, dictationScore),
        text,
        dictationText: extracted.dictation,
        command: parsedCommand.command,
        parsedCommand,
        targetAction: extracted?.action,
        detectedLanguage: languageInfo.primary,
        codeSwitched: languageInfo.codeSwitched,
      };
    }
    
    // Check for action-like patterns ("open X", "write Y", etc.)
    const actionPattern = text.match(/\b(open|write|create|delete|go to|select)\s+(.+)/i);
    if (actionPattern) {
      return {
        type: "action",
        confidence: 0.6,
        text,
        targetAction: actionPattern[1].toLowerCase(),
        targetContext: actionPattern[2].trim(),
        detectedLanguage: languageInfo.primary,
        codeSwitched: languageInfo.codeSwitched,
      };
    }
    
    // Fallback: low confidence dictation
    return {
      type: "dictation",
      confidence: 0.3,
      text,
      detectedLanguage: languageInfo.primary,
      codeSwitched: languageInfo.codeSwitched,
    };
  }

  private extractDictationFromMixed(
    text: string,
    parsed: ParsedCommand
  ): { dictation?: string; action?: string } {
    const lower = text.toLowerCase();
    const trigger = parsed.rawMatch.toLowerCase();
    
    // Find the command trigger position
    const triggerIndex = lower.indexOf(trigger);
    if (triggerIndex === -1) return {};
    
    // Text after the command trigger is the dictation
    const afterTrigger = text.slice(triggerIndex + trigger.length).trim();
    
    // Text before the command trigger could also be dictation
    const beforeTrigger = text.slice(0, triggerIndex).trim();
    
    // Heuristic: if there's meaningful text before the command, use that as dictation
    if (beforeTrigger.length > afterTrigger.length && beforeTrigger.length > 5) {
      return { dictation: beforeTrigger, action: parsed.command.type };
    }
    
    return { dictation: afterTrigger, action: parsed.command.type };
  }

  private async handleDictation(intent: VoiceIntent, context: CommandContext): Promise<VoiceProcessingResult> {
    // Use AI-powered cleanup for professional dictation
    const { cleanedText } = await cleanDictation({
      rawTranscript: intent.text,
      targetApp: context.targetApp as any,
      dictationMode: "ai_polished",
      language: intent.detectedLanguage,
      customDictionary: this.getCustomDictionaryForLanguage(intent.detectedLanguage),
    });
    
    return {
      success: true,
      textToInsert: cleanedText,
      feedback: `Dictated and cleaned: "${cleanedText.substring(0, 50)}${cleanedText.length > 50 ? "..." : ""}"`,
    };
  }

  private async handleCommand(
    intent: VoiceIntent,
    parsedCommand: ParsedCommand,
    context: CommandContext
  ): Promise<VoiceProcessingResult> {
    const result = await this.commandExecutor.execute(
      parsedCommand.rawMatch,
      context
    );
    
    if (result?.success) {
      return {
        success: true,
        feedback: result.feedback || "Command executed",
      };
    }
    
    return {
      success: false,
      feedback: result?.feedback || "Command failed",
    };
  }

  private async handleMixedIntent(
    intent: VoiceIntent,
    parsedCommand: ParsedCommand,
    context: CommandContext
  ): Promise<VoiceProcessingResult> {
    // First, process the dictation part with AI cleanup
    const dictationText = intent.dictationText || "";
    let cleanedDictation = "";
    
    if (dictationText.length > 0) {
      const { cleanedText } = await cleanDictation({
        rawTranscript: dictationText,
        targetApp: context.targetApp as any,
        dictationMode: "ai_polished",
        language: intent.detectedLanguage,
        customDictionary: this.getCustomDictionaryForLanguage(intent.detectedLanguage),
      });
      cleanedDictation = cleanedText;
    }
    
    // Then execute the command
    const commandResult = await this.commandExecutor.execute(
      parsedCommand.rawMatch,
      context
    );
    
    // Combine results
    const parts: string[] = [];
    if (cleanedDictation) parts.push(cleanedDictation);
    if (commandResult?.feedback) parts.push(commandResult.feedback);
    
    return {
      success: commandResult?.success || !!cleanedDictation,
      textToInsert: parts.length > 0 ? cleanedDictation : undefined,
      action: commandResult?.action as any,
      commandResult,
      feedback: parts.join(" · "),
      requiresConfirmation: this.config.confirmationRequiredForMixed,
    };
  }

  private async handleActionIntent(
    intent: VoiceIntent,
    parsedCommand: ParsedCommand,
    context: CommandContext
  ): Promise<VoiceProcessingResult> {
    const { targetAction, targetContext } = intent;
    
    // Map action types to actual app commands
    const actionMap: Record<string, string> = {
      "open": "navigate",
      "write": "insert_text",
      "create": "create_block",
      "delete": "delete_selection",
      "select": "select_text",
    };
    
    const mappedAction = actionMap[targetAction] || "custom";
    
    // Try to execute as a command
    const result = await this.commandExecutor.execute(
      intent.text,
      context
    );
    
    return {
      success: result?.success || false,
      feedback: result?.feedback || `Action "${targetAction}" on "${targetContext}"`,
      action: mappedAction as any,
    };
  }

  private async handleSystemIntent(
    intent: VoiceIntent,
    context: CommandContext
  ): Promise<VoiceProcessingResult> {
    const { targetAction, targetContext } = intent;
    
    // System-level actions
    switch (targetAction) {
      case "help":
        return {
          success: true,
          feedback: "Voice commands: dictate text, say 'delete that', 'bold that', 'new paragraph', 'send', 'cancel', 'undo'",
        };
      case "settings":
        // Could open settings modal
        return {
          success: true,
          feedback: "Opening settings...",
          action: "system",
        };
      default:
        return {
          success: false,
          feedback: `System command "${targetAction}" not recognized`,
        };
    }
  }

  private async handleCodeIntent(
    intent: VoiceIntent,
    parsedCommand: ParsedCommand,
    context: CommandContext
  ): Promise<VoiceProcessingResult> {
    // For code dictation, use local cleanup only (no AI rephrasing)
    const cleaned = cleanDictationSync(intent.text);
    
    return {
      success: true,
      textToInsert: cleaned,
      feedback: "Code dictation cleaned",
    };
  }

  private getCustomDictionaryForLanguage(language: string): string[] {
    const dict = getCustomDictionary();
    // Could load language-specific dictionary entries
    return dict;
  }
}

/**
 * Voice Telemetry for tracking and fine-tuning
 */
export class VoiceTelemetry {
  private log: Array<{
    timestamp: number;
    intent: VoiceIntentType;
    text: string;
    output?: string;
    success: boolean;
    language: string;
  }> = [];
  
  recordIntent(intent: VoiceIntent, output?: string, success = true): void {
    this.log.push({
      timestamp: Date.now(),
      intent: intent.type,
      text: intent.text,
      output,
      success,
      language: intent.detectedLanguage || "en-US",
    });
    
    // Keep last 1000 entries
    if (this.log.length > 1000) this.log = this.log.slice(-1000);
    
    // Store in localStorage for persistence
    try {
      localStorage.setItem("noska_voice_intelligence_log", JSON.stringify(this.log));
    } catch {}
  }
  
  getLog(): typeof this.log {
    return this.log;
  }
  
  clearLog(): void {
    this.log = [];
    try { localStorage.removeItem("noska_voice_intelligence_log"); } catch {}
  }
}

// ─── Factory Function ───
export function createVoiceIntelligence(config?: Partial<{
  autoProcess: boolean;
  autoDictation: boolean;
  autoCommands: boolean;
  confirmationRequiredForMixed: boolean;
  languageDetection: boolean;
  codeSwitchingDetection: boolean;
}>): VoiceIntelligence {
  return new VoiceIntelligence(config);
}