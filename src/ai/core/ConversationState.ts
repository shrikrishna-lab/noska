/**
 * Noska AI — Conversation State Tracker
 * 
 * Tracks per-conversation state that makes follow-ups work naturally.
 * "Why?", "Continue", "Now implement it", "Use the previous approach"
 * all depend on the system knowing what happened earlier without
 * the user having to repeat themselves.
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ConversationDecision {
  /** What was decided */
  decision: string;
  /** When in the conversation (message index or timestamp) */
  at: number;
  /** Still active or superseded by a later decision */
  active: boolean;
}

export interface ConversationArtifact {
  type: "code" | "page" | "list" | "plan" | "analysis" | "other";
  title: string;
  /** Brief summary or first lines */
  summary: string;
  /** When created */
  at: number;
}

export interface ConversationStateData {
  /** High-level topic of the conversation */
  topic: string;
  /** Current active task the user is working on */
  activeTask: string;
  /** What the user ultimately wants to achieve */
  userGoal: string;
  /** Explicit constraints the user stated */
  constraints: string[];
  /** Decisions made during the conversation */
  decisions: ConversationDecision[];
  /** Unresolved questions */
  openQuestions: string[];
  /** Notable entities/pages/files referenced */
  lastRelevantEntities: string[];
  /** Created artifacts (code, pages, etc.) */
  artifacts: ConversationArtifact[];
  /** Rolling summary of older parts of the conversation */
  rollingSummary: string;
  /** Number of total exchanges */
  exchangeCount: number;
  /** Timestamp of last update */
  updatedAt: number;
}

// ─── Default State ──────────────────────────────────────────────────────────

function emptyState(): ConversationStateData {
  return {
    topic: "",
    activeTask: "",
    userGoal: "",
    constraints: [],
    decisions: [],
    openQuestions: [],
    lastRelevantEntities: [],
    artifacts: [],
    rollingSummary: "",
    exchangeCount: 0,
    updatedAt: Date.now(),
  };
}

// ─── State Manager ──────────────────────────────────────────────────────────

export class ConversationState {
  private state: ConversationStateData;

  constructor(initial?: Partial<ConversationStateData>) {
    this.state = { ...emptyState(), ...initial };
  }

  get(): ConversationStateData {
    return { ...this.state };
  }

  /** Update state after a user message */
  updateFromUserMessage(text: string): void {
    this.state.exchangeCount++;
    this.state.updatedAt = Date.now();

    // Detect topic if not set
    if (!this.state.topic && text.length > 10) {
      this.state.topic = text.slice(0, 80);
    }

    // Detect goal patterns
    const goalPatterns = [
      /I (?:want|need|would like) (?:to |)(.*?)(?:\.|$)/i,
      /(?:can you|please|help me) (.*?)(?:\.|$)/i,
      /(?:make|create|build|implement|fix|debug|analyze) (.*?)(?:\.|$)/i,
    ];
    for (const pattern of goalPatterns) {
      const match = text.match(pattern);
      if (match?.[1] && match[1].length > 5) {
        this.state.userGoal = match[1].trim().slice(0, 120);
        break;
      }
    }

    // Detect constraints
    const constraintPatterns = [
      /(?:must|should|needs? to|has to|require|always|never|don't|do not) (.*?)(?:\.|$)/gi,
    ];
    for (const pattern of constraintPatterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const c = match[1].trim().slice(0, 100);
        if (c.length > 3 && !this.state.constraints.includes(c)) {
          this.state.constraints.push(c);
          if (this.state.constraints.length > 10) this.state.constraints.shift();
        }
      }
    }

    // Detect task updates
    const taskPatterns = [
      /(?:now |next |let's |let us )(.*?)(?:\.|$)/i,
      /(?:focus on|work on|switch to) (.*?)(?:\.|$)/i,
    ];
    for (const pattern of taskPatterns) {
      const match = text.match(pattern);
      if (match?.[1] && match[1].length > 3) {
        this.state.activeTask = match[1].trim().slice(0, 120);
        break;
      }
    }

    // Track entities (page names in quotes, @mentions, file paths)
    const entityPatterns = [
      /"([^"]+)"/g,
      /`([^`]+)`/g,
      /@(\w+)/g,
    ];
    for (const pattern of entityPatterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const entity = match[1].trim();
        if (entity.length > 1 && entity.length < 80) {
          if (!this.state.lastRelevantEntities.includes(entity)) {
            this.state.lastRelevantEntities.push(entity);
          }
          if (this.state.lastRelevantEntities.length > 15) {
            this.state.lastRelevantEntities.shift();
          }
        }
      }
    }
  }

  /** Update state after an AI response */
  updateFromAIResponse(text: string): void {
    this.state.updatedAt = Date.now();

    // Detect artifacts in AI response
    if (text.includes("```")) {
      this.state.artifacts.push({
        type: "code",
        title: "Code snippet",
        summary: text.match(/```\w*\n(.{0,60})/)?.[1] || "code block",
        at: this.state.exchangeCount,
      });
      if (this.state.artifacts.length > 10) this.state.artifacts.shift();
    }
  }

  /** Record a decision made during conversation */
  addDecision(decision: string): void {
    // Supersede any conflicting previous decisions
    this.state.decisions.push({
      decision: decision.slice(0, 200),
      at: this.state.exchangeCount,
      active: true,
    });
    if (this.state.decisions.length > 15) {
      // Remove oldest inactive decisions
      const activeCount = this.state.decisions.filter(d => d.active).length;
      if (activeCount > 10) {
        this.state.decisions = this.state.decisions.slice(-10);
      }
    }
  }

  /** Add an open question */
  addOpenQuestion(question: string): void {
    if (!this.state.openQuestions.includes(question)) {
      this.state.openQuestions.push(question.slice(0, 200));
      if (this.state.openQuestions.length > 8) this.state.openQuestions.shift();
    }
  }

  /** Resolve an open question */
  resolveQuestion(question: string): void {
    this.state.openQuestions = this.state.openQuestions.filter(q => q !== question);
  }

  /** Update the rolling summary (called when history gets long) */
  setRollingSummary(summary: string): void {
    this.state.rollingSummary = summary.slice(0, 800);
  }

  /** Build context string for injection into prompts */
  buildContextString(): string {
    const parts: string[] = [];

    if (this.state.topic) {
      parts.push(`Topic: ${this.state.topic}`);
    }
    if (this.state.userGoal) {
      parts.push(`User goal: ${this.state.userGoal}`);
    }
    if (this.state.activeTask) {
      parts.push(`Current task: ${this.state.activeTask}`);
    }
    if (this.state.constraints.length > 0) {
      parts.push(`Constraints: ${this.state.constraints.join("; ")}`);
    }

    const activeDecisions = this.state.decisions.filter(d => d.active);
    if (activeDecisions.length > 0) {
      parts.push(`Decisions: ${activeDecisions.map(d => d.decision).join("; ")}`);
    }

    if (this.state.openQuestions.length > 0) {
      parts.push(`Open questions: ${this.state.openQuestions.join("; ")}`);
    }

    if (this.state.lastRelevantEntities.length > 0) {
      parts.push(`Referenced: ${this.state.lastRelevantEntities.slice(-8).join(", ")}`);
    }

    if (this.state.rollingSummary) {
      parts.push(`Earlier context: ${this.state.rollingSummary}`);
    }

    if (parts.length === 0) return "";
    return `## Conversation State\n${parts.join("\n")}`;
  }

  /** Reset state for a new conversation */
  reset(): void {
    Object.assign(this.state, emptyState());
  }

  /** Serialize for persistence */
  serialize(): string {
    return JSON.stringify(this.state);
  }

  /** Restore from serialized data */
  static deserialize(data: string): ConversationState {
    try {
      return new ConversationState(JSON.parse(data));
    } catch {
      return new ConversationState();
    }
  }
}
