/**
 * Noska Intelligence — Planner
 *
 * Turns an intent + goal into a concrete ExecutionPlan. Plans are built
 * from deterministic, intent-specific skeletons (testable, predictable)
 * rather than free-form LLM planning; the model still decides *how* to
 * execute each step, guided by instructions and tools.
 *
 * Step instructions deliberately avoid prescribing response structure
 * (no forced bullet counts, no forced section lists) — they state the GOAL
 * of each step and let the model choose the shape.
 *
 * No chain-of-thought is ever surfaced — plans expose only concise,
 * user-facing labels.
 */

import { uid } from "../../utils/blockModel";
import type { ExecutionPlan, IntentResult, PlanStep, RuntimeJobOptions } from "./types";

function step(label: string, kind: PlanStep["kind"], extra: Partial<PlanStep> = {}): PlanStep {
  return { id: `st_${uid().slice(0, 8)}`, kind, label, ...extra };
}

const INTENT_PLANS: Record<string, (goal: string) => { approach: string; steps: PlanStep[] }> = {
  question: (goal) => ({
    approach: "Answer directly using workspace context where helpful.",
    steps: [step("Understanding your question", "answer", { instruction: goal })],
  }),
  casual: (goal) => ({
    approach: "Conversational reply.",
    steps: [step("Replying", "answer", { instruction: goal })],
  }),
  follow_up: (goal) => ({
    approach: "Continue from the conversation so far.",
    steps: [
      step("Continuing where we left off", "answer", {
        instruction: `${goal}\n\nThis message refers to the earlier conversation — resolve any references before answering.`,
      }),
    ],
  }),
  search: (goal) => ({
    approach: "Search the workspace, then report what was found.",
    steps: [
      step("Searching workspace", "ai_step", {
        instruction: `Search the workspace for pages matching this request. Use search_pages / list_pages / get_page_content as needed:\n${goal}\n\nReport what you found with exact page titles. If nothing relevant exists, say that plainly instead of guessing.`,
      }),
      step("Summarizing findings", "answer", {
        instruction:
          "Summarize the findings above. Lead with what is most relevant; reference page titles exactly as they exist. Keep it as brief as the results allow.",
      }),
    ],
  }),
  create: (goal) => ({
    approach: "Check what exists, create the requested content, verify it.",
    steps: [
      step("Checking existing content", "ai_step", {
        instruction: `Before creating anything, check existing pages so you don't duplicate something that already covers this. Use search_pages if helpful.\nRequest: ${goal}\nNote in one sentence what already exists that's relevant (or say nothing does).`,
      }),
      step("Creating content", "ai_step", {
        instruction: `Fulfill the creation request using create_page / append_blocks / add_todo / set_page_tags etc.\nRequest: ${goal}`,
      }),
      step("Verifying result", "tool", { toolName: "get_workspace_stats" }),
    ],
  }),
  edit: (goal) => ({
    approach: "Read current content, apply careful edits, verify.",
    steps: [
      step("Reading current content", "ai_step", {
        instruction: `Read the target page(s) to understand their current state before editing. Use get_page_content.\nEdit request: ${goal}\nState briefly what you found.`,
      }),
      step("Applying edits", "ai_step", {
        instruction: `Apply the edit using update_block / append_blocks / insert_block / replace_content / rename_page as appropriate. Preserve the author's voice.\nEdit request: ${goal}`,
      }),
      step("Verifying changes", "tool", { toolName: "get_page_content" }),
    ],
  }),
  analyze: (goal) => ({
    approach: "Collect relevant workspace data, then reason over it.",
    steps: [
      step("Gathering workspace data", "ai_step", {
        instruction: `Gather all data relevant to this analysis. Use search_pages, list_pages, get_page_content, get_workspace_stats.\nAnalysis goal: ${goal}\nCollect facts only — no conclusions yet.`,
      }),
      step("Analyzing", "answer", {
        instruction: `Based ONLY on the data gathered above:\n${goal}\nQuantify findings from the actual data, prioritize insights, and flag gaps honestly. Structure however serves the answer best.`,
      }),
    ],
  }),
  organize: (goal) => ({
    approach: "Inspect structure, propose changes, apply after confirmation.",
    steps: [
      step("Inspecting workspace structure", "ai_step", {
        instruction: `Inspect the workspace structure: list_pages, get_page_hierarchy on key pages, get_workspace_stats.\nOrganization goal: ${goal}\nList issues found (duplicates, misplaced pages, missing hierarchy).`,
      }),
      step("Preparing organization proposal", "answer", {
        instruction:
          "Propose a specific organization plan as a numbered list of concrete move/tag/archive operations. Be conservative: do not propose trashing anything unless clearly a duplicate.",
      }),
      step("Applying organization", "ai_step", {
        instruction: `Apply the organizational changes using move_page, set_page_tags, batch_tag, trash_page (only clear duplicates).\nOriginal goal: ${goal}`,
      }),
      step("Verifying new structure", "tool", { toolName: "get_workspace_stats" }),
    ],
  }),
  plan: (goal) => ({
    approach: "Gather context, draft a structured plan, save it as a page.",
    steps: [
      step("Gathering context", "ai_step", {
        instruction: `Gather context relevant to this planning request from the workspace (search_pages, get_page_content).\nPlanning request: ${goal}\nNote constraints, related projects, and existing tasks.`,
      }),
      step("Drafting plan", "answer", {
        instruction: `Draft a structured plan for: ${goal}\nInclude phases/milestones, concrete tasks as todos, owners where inferable, and realistic sequencing.`,
      }),
      step("Saving plan to workspace", "ai_step", {
        instruction:
          "Create a well-formatted page containing the plan using create_page (with headings, todos, and a summary section). Return the page title.",
      }),
      step("Verifying saved plan", "tool", { toolName: "get_workspace_stats" }),
    ],
  }),
  action: (goal) => ({
    approach: "Execute the requested action with the available tools, then verify.",
    steps: [
      step("Executing action", "ai_step", {
        instruction: `Perform this action using the available tools:\n${goal}\nIf multiple tools are needed, call them in sequence.`,
      }),
      step("Verifying outcome", "tool", { toolName: "get_workspace_stats" }),
    ],
  }),
  automation_intent: (goal) => ({
    approach: "Prepare automation details for review.",
    steps: [step("Preparing automation proposal", "answer", { instruction: goal })],
  }),
  agent_intent: (goal) => ({
    approach: "Prepare agent configuration for review.",
    steps: [step("Preparing agent proposal", "answer", { instruction: goal })],
  }),
};

export function buildPlan(goal: string, intentResult: IntentResult, options?: Partial<RuntimeJobOptions>): ExecutionPlan {
  const builder = INTENT_PLANS[intentResult.intent] || INTENT_PLANS.question;
  const built = builder(goal);
  const maxSteps = options?.maxSteps ?? 8;
  const steps = built.steps.slice(0, maxSteps);
  return {
    goal,
    intent: intentResult.intent,
    approach: options?.instructions ? `${built.approach} Additional guidance provided.` : built.approach,
    steps,
  };
}

export { INTENT_PLANS };
