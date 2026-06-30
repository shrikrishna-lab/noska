import { getCommand } from "./CommandRegistry";

export function executeCommand(commandId, context = {}) {
  const cmd = getCommand(commandId);
  if (!cmd) {
    console.warn(`[ActionExecutor] Unknown command: ${commandId}`);
    return;
  }
  if (cmd.available && !cmd.available(context)) {
    console.warn(`[ActionExecutor] Command not available: ${commandId}`);
    return;
  }
  try {
    cmd.execute(context);
  } catch (err) {
    console.error(`[ActionExecutor] Error executing command "${commandId}":`, err);
  }
}

export function executeSlashCommand(type, block, context) {
  const cmd = getCommand(type);
  if (cmd) {
    executeCommand(type, { ...context, block, text: (block.text || "").replace(/^\/\w*\s*/, "") });
    return true;
  }
  return false;
}

export function executePageAction(actionId, page, context) {
  return executeCommand(actionId, { ...context, page });
}
