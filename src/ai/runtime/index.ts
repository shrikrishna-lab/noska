/**
 * Noska Intelligence — public surface of the shared agent runtime.
 * AI, Agents, and Automations all import from this single module.
 */

export type {
  RuntimeIntent,
  IntentResult,
  PermissionCategory,
  PermissionMode,
  PermissionSpec,
  TriggerType,
  TriggerSpec,
  ScheduleSpec,
  PlanStep,
  ExecutionPlan,
  Condition,
  ConditionGroup,
  StepStatus,
  StepProgress,
  ApprovalRequest,
  ToolCallRecord,
  AffectedResource,
  RunRecord,
  RunListener,
  RuntimeJobOptions,
  ModelClass,
  WorkspaceEvent,
  ToolContextLike,
} from "./types";

export { FULL_AUTO_PERMISSIONS, READ_ONLY_PERMISSIONS, defaultPermissions } from "./types";
export { classifyIntent, classifyIntentSmart, refineIntentWithLLM, looksLikeComplexAction, isAgenticIntent } from "./intent";
export { resolveTemplate, resolveParams, buildVars } from "./variables";
export { categoryForTool, evaluatePermission, describePermissions } from "./permissions";
export { LoopProtector, loopProtector } from "./loopProtection";
export {
  parseSchedule,
  describeSchedule,
  isScheduleDue,
  isValidTrigger,
  lastOccurrenceOnOrBefore,
} from "./scheduler";
export { publishWorkspaceEvent, subscribeWorkspaceEvents, getRecentEvents } from "./eventBus";
export { getAgentMemory, rememberFact, forgetFact, clearAgentMemory, recallContext } from "./agentMemory";
export { selectModel, classifyModelNeed } from "./modelRouter";
export { requestApproval, respondToApproval, getPendingApprovals, subscribeApprovals } from "./approvals";
export { verifyToolCall, collectAffectedResources } from "./verifier";
export { buildPlan } from "./planner";
export { proposeAutomation, proposeAgent, describeTrigger } from "./proposals";
export type { AutomationProposal, AgentProposal } from "./proposals";
export { upsertRun, listRuns, getRun, subscribeRuns, persistRunRemote, refreshFromRemote, recordRunEvent, fetchRunEvents, subscribeRunLive } from "./runStore";
export type { RunEventRow } from "./runStore";
export { agentRuntime, AgentRuntime } from "./AgentRuntime";
