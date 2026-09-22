/**
 * Noska AI — Stream Protocol
 * 
 * Normalized streaming event types. All provider stream parsers convert
 * their native format (OpenAI SSE, Anthropic events, Gemini JSON, 
 * Ollama NDJSON) into this protocol before yielding to the consumer.
 * 
 * The consumer (AIManager.stream / AIPanel) only needs to handle
 * StreamEvent objects — never raw provider payloads.
 */

// ─── Event Types ────────────────────────────────────────────────────────────

export type StreamEventType =
  | "text_delta"          // incremental text content
  | "reasoning_delta"     // incremental reasoning/thinking content
  | "tool_call_start"     // tool call initiated
  | "tool_call_delta"     // incremental tool call arguments
  | "tool_call_end"       // tool call complete
  | "usage"               // token usage update
  | "finish"              // stream completed normally
  | "error";              // stream-level error

export interface StreamEvent {
  type: StreamEventType;
  /** Text content for text_delta and reasoning_delta */
  text?: string;
  /** Tool call info */
  toolCall?: {
    id?: string;
    name?: string;
    arguments?: string;
  };
  /** Token usage (may arrive during or after stream) */
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
    reasoningTokens?: number;
    totalTokens?: number;
  };
  /** Finish reason */
  finishReason?: string;
  /** Error details */
  error?: string;
}

// ─── SSE Parser (OpenAI-compatible) ─────────────────────────────────────────

/**
 * Parse an OpenAI-compatible SSE stream into StreamEvents.
 * Works for: OpenRouter, OpenAI, Groq, DeepSeek, Mistral, Together, xAI, NVIDIA, LM Studio, custom.
 */
export async function* parseOpenAIStream(
  response: Response,
  signal?: AbortSignal
): AsyncGenerator<StreamEvent> {
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      if (signal?.aborted) {
        reader.cancel();
        return;
      }
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed === "data: [DONE]") continue;
        if (!trimmed.startsWith("data:")) continue;

        const payload = trimmed.slice(5).trim();
        if (payload === "[DONE]") continue;

        try {
          const json = JSON.parse(payload);
          const choice = json.choices?.[0];
          if (!choice) continue;

          const delta = choice.delta;
          if (!delta) continue;

          // Reasoning content (OpenAI o1/o3, OpenRouter, DeepSeek)
          const reasoning = delta.reasoning_content || delta.reasoning;
          if (reasoning) {
            yield { type: "reasoning_delta", text: reasoning };
          }

          // Regular text content
          if (delta.content) {
            yield { type: "text_delta", text: delta.content };
          }

          // Tool calls
          if (delta.tool_calls?.[0]) {
            const tc = delta.tool_calls[0];
            if (tc.function?.name) {
              yield {
                type: "tool_call_start",
                toolCall: { id: tc.id, name: tc.function.name, arguments: tc.function.arguments || "" }
              };
            } else if (tc.function?.arguments) {
              yield {
                type: "tool_call_delta",
                toolCall: { id: tc.id, arguments: tc.function.arguments }
              };
            }
          }

          // Finish
          if (choice.finish_reason) {
            // Check for usage in the final chunk
            if (json.usage) {
              yield {
                type: "usage",
                usage: {
                  inputTokens: json.usage.prompt_tokens,
                  outputTokens: json.usage.completion_tokens,
                  totalTokens: json.usage.total_tokens,
                }
              };
            }
            yield { type: "finish", finishReason: choice.finish_reason };
          }
        } catch {
          // Skip malformed JSON chunks
        }
      }
    }
  } catch (err: unknown) {
    if (err instanceof Error && err.name === "AbortError") return;
    yield { type: "error", error: err instanceof Error ? err.message : "Stream read error" };
  } finally {
    try { reader.cancel(); } catch { /* already closed */ }
  }
}

// ─── OpenAI Responses SSE Parser ────────────────────────────────────────────

/**
 * Parse the OpenAI Responses API SSE stream (used by OpenCode Zen for
 * gpt-*, grok-*, and muse-* models). Events are JSON objects with a
 * `type` field; the `event:` line mirrors `type` but is ignored —
 * `data.type` is authoritative.
 */
export async function* parseOpenAIResponsesStream(
  response: Response,
  signal?: AbortSignal
): AsyncGenerator<StreamEvent> {
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      if (signal?.aborted) {
        reader.cancel();
        return;
      }
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith("data:")) continue;

        const payload = trimmed.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;

        try {
          const json = JSON.parse(payload);
          const type = String(json.type || "");

          switch (type) {
            case "response.output_text.delta":
              if (json.delta) {
                yield { type: "text_delta", text: String(json.delta) };
              }
              break;

            case "response.reasoning_text.delta":
            case "response.reasoning_summary_text.delta": {
              const text = json.delta ?? json.text ?? json.summary_text;
              if (text) {
                yield { type: "reasoning_delta", text: String(text) };
              }
              break;
            }

            case "response.output_item.added": {
              const item = json.item;
              if (item?.type === "function_call") {
                yield {
                  type: "tool_call_start",
                  toolCall: {
                    id: item.call_id || item.id,
                    name: item.name,
                    arguments: typeof item.arguments === "string" ? item.arguments : "",
                  },
                };
              } else if (item?.type === "reasoning") {
                // Reasoning item started — deltas follow.
              }
              break;
            }

            case "response.function_call_arguments.delta":
              if (json.delta) {
                yield {
                  type: "tool_call_delta",
                  toolCall: { id: json.item_id, arguments: String(json.delta) },
                };
              }
              break;

            case "response.completed": {
              const u = json.response?.usage;
              if (u) {
                yield {
                  type: "usage",
                  usage: {
                    inputTokens: u.input_tokens,
                    outputTokens: u.output_tokens,
                    totalTokens: u.total_tokens,
                  },
                };
              }
              yield { type: "finish", finishReason: json.response?.status || "stop" };
              break;
            }

            case "response.failed":
            case "error": {
              const msg =
                json.response?.error?.message ||
                json.message ||
                json.error?.message ||
                "Responses stream error";
              yield { type: "error", error: String(msg) };
              break;
            }
          }
        } catch {
          // Skip malformed JSON chunks
        }
      }
    }
  } catch (err: unknown) {
    if (err instanceof Error && err.name === "AbortError") return;
    yield { type: "error", error: err instanceof Error ? err.message : "Stream read error" };
  } finally {
    try { reader.cancel(); } catch { /* already closed */ }
  }
}

// ─── Anthropic SSE Parser ───────────────────────────────────────────────────

/**
 * Parse Anthropic's native Messages API SSE stream.
 * Handles content_block_start, content_block_delta (text + thinking), 
 * message_delta (usage, stop_reason), and tool_use blocks.
 */
export async function* parseAnthropicStream(
  response: Response,
  signal?: AbortSignal
): AsyncGenerator<StreamEvent> {
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      if (signal?.aborted) {
        reader.cancel();
        return;
      }
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith("data: ")) continue;

        try {
          const json = JSON.parse(trimmed.slice(6));

          switch (json.type) {
            case "content_block_start": {
              const block = json.content_block;
              if (block?.type === "tool_use") {
                yield {
                  type: "tool_call_start",
                  toolCall: { id: block.id, name: block.name, arguments: "" }
                };
              }
              // thinking block start — emit nothing, wait for deltas
              break;
            }

            case "content_block_delta": {
              const delta = json.delta;
              if (delta?.type === "text_delta" && delta.text) {
                yield { type: "text_delta", text: delta.text };
              }
              if (delta?.type === "thinking_delta" && delta.thinking) {
                yield { type: "reasoning_delta", text: delta.thinking };
              }
              if (delta?.type === "input_json_delta" && delta.partial_json) {
                yield {
                  type: "tool_call_delta",
                  toolCall: { arguments: delta.partial_json }
                };
              }
              break;
            }

            case "content_block_stop": {
              // If we were in a tool_use block, signal completion
              // The consumer tracks this from the start event
              break;
            }

            case "message_delta": {
              if (json.delta?.stop_reason) {
                yield { type: "finish", finishReason: json.delta.stop_reason };
              }
              if (json.usage) {
                yield {
                  type: "usage",
                  usage: {
                    inputTokens: json.usage.input_tokens,
                    outputTokens: json.usage.output_tokens,
                  }
                };
              }
              break;
            }

            case "message_start": {
              if (json.message?.usage) {
                yield {
                  type: "usage",
                  usage: {
                    inputTokens: json.message.usage.input_tokens,
                    outputTokens: json.message.usage.output_tokens,
                  }
                };
              }
              break;
            }

            case "error": {
              yield { type: "error", error: json.error?.message || "Anthropic stream error" };
              break;
            }
          }
        } catch {
          // Skip malformed JSON
        }
      }
    }
  } catch (err: unknown) {
    if (err instanceof Error && err.name === "AbortError") return;
    yield { type: "error", error: err instanceof Error ? err.message : "Stream read error" };
  } finally {
    try { reader.cancel(); } catch { /* already closed */ }
  }
}

// ─── Gemini SSE Parser ──────────────────────────────────────────────────────

/**
 * Parse Gemini's streamGenerateContent SSE stream.
 * Gemini returns JSON objects with candidates[].content.parts[].text
 */
export async function* parseGeminiStream(
  response: Response,
  signal?: AbortSignal
): AsyncGenerator<StreamEvent> {
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      if (signal?.aborted) {
        reader.cancel();
        return;
      }
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith("data: ")) continue;

        try {
          const json = JSON.parse(trimmed.slice(6));
          const parts = json.candidates?.[0]?.content?.parts;
          if (parts) {
            for (const part of parts) {
              if (part.text) {
                yield { type: "text_delta", text: part.text };
              }
              if (part.thought) {
                yield { type: "reasoning_delta", text: part.thought };
              }
              // Native function calling: Gemini streams complete functionCall
              // parts (not argument deltas), so emit them as finished calls.
              if (part.functionCall?.name) {
                yield {
                  type: "tool_call_start",
                  toolCall: {
                    name: part.functionCall.name,
                    arguments: JSON.stringify(part.functionCall.args ?? {}),
                  }
                };
              }
            }
          }

          // Usage
          if (json.usageMetadata) {
            yield {
              type: "usage",
              usage: {
                inputTokens: json.usageMetadata.promptTokenCount,
                outputTokens: json.usageMetadata.candidatesTokenCount,
                totalTokens: json.usageMetadata.totalTokenCount,
              }
            };
          }

          // Finish
          const finishReason = json.candidates?.[0]?.finishReason;
          if (finishReason && finishReason !== "FINISH_REASON_UNSPECIFIED") {
            yield { type: "finish", finishReason };
          }
        } catch {
          // Skip malformed
        }
      }
    }
  } catch (err: unknown) {
    if (err instanceof Error && err.name === "AbortError") return;
    yield { type: "error", error: err instanceof Error ? err.message : "Stream read error" };
  } finally {
    try { reader.cancel(); } catch { /* already closed */ }
  }
}

// ─── Ollama NDJSON Parser ───────────────────────────────────────────────────

/**
 * Parse Ollama's NDJSON streaming format.
 */
export async function* parseOllamaStream(
  response: Response,
  signal?: AbortSignal
): AsyncGenerator<StreamEvent> {
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      if (signal?.aborted) {
        reader.cancel();
        return;
      }
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const json = JSON.parse(line);
          if (json.message?.content) {
            yield { type: "text_delta", text: json.message.content };
          }
          if (json.done) {
            if (json.eval_count || json.prompt_eval_count) {
              yield {
                type: "usage",
                usage: {
                  inputTokens: json.prompt_eval_count,
                  outputTokens: json.eval_count,
                }
              };
            }
            yield { type: "finish", finishReason: "stop" };
          }
        } catch {
          // Skip malformed
        }
      }
    }
  } catch (err: unknown) {
    if (err instanceof Error && err.name === "AbortError") return;
    yield { type: "error", error: err instanceof Error ? err.message : "Stream read error" };
  } finally {
    try { reader.cancel(); } catch { /* already closed */ }
  }
}

// ─── Stream Consumer Helpers ────────────────────────────────────────────────

/**
 * Consume a StreamEvent generator and accumulate text + reasoning.
 * This is the main helper used by AIManager.stream() and AIPanel.
 */
export async function consumeStream(
  events: AsyncGenerator<StreamEvent>,
  callbacks: {
    onText?: (text: string, fullText: string) => void;
    onReasoning?: (text: string, fullReasoning: string) => void;
    onToolCallStart?: (toolCall: StreamEvent["toolCall"]) => void;
    onUsage?: (usage: StreamEvent["usage"]) => void;
    onFinish?: (reason: string) => void;
    onError?: (error: string) => void;
  }
): Promise<{ text: string; reasoning: string; usage: StreamEvent["usage"] | null }> {
  let fullText = "";
  let fullReasoning = "";
  let lastUsage: StreamEvent["usage"] | null = null;

  for await (const event of events) {
    switch (event.type) {
      case "text_delta":
        fullText += event.text || "";
        callbacks.onText?.(event.text || "", fullText);
        break;
      case "reasoning_delta":
        fullReasoning += event.text || "";
        callbacks.onReasoning?.(event.text || "", fullReasoning);
        break;
      case "tool_call_start":
        callbacks.onToolCallStart?.(event.toolCall);
        break;
      case "usage":
        lastUsage = event.usage || null;
        callbacks.onUsage?.(event.usage);
        break;
      case "finish":
        callbacks.onFinish?.(event.finishReason || "stop");
        break;
      case "error":
        callbacks.onError?.(event.error || "Unknown stream error");
        break;
    }
  }

  return { text: fullText, reasoning: fullReasoning, usage: lastUsage };
}

/**
 * Simple adapter: convert a StreamEvent generator into an old-style 
 * string generator for backward compatibility with existing stream consumers.
 * Yields accumulated text (not deltas) to match the old onChunk(fullText) pattern.
 */
export async function* streamEventsToText(
  events: AsyncGenerator<StreamEvent>
): AsyncGenerator<string> {
  let fullText = "";
  let reasoning = "";
  let inReasoning = false;

  for await (const event of events) {
    switch (event.type) {
      case "reasoning_delta":
        if (!inReasoning) {
          reasoning = "";
          inReasoning = true;
        }
        reasoning += event.text || "";
        // Yield reasoning wrapped in think tags for the UI
        yield `<think>${reasoning}</think>${fullText}`;
        break;
      case "text_delta":
        if (inReasoning) inReasoning = false;
        fullText += event.text || "";
        if (reasoning) {
          yield `<think>${reasoning}</think>${fullText}`;
        } else {
          yield fullText;
        }
        break;
      case "error":
        throw new Error(event.error || "Stream error");
    }
  }
}

/**
 * Streaming WITH native tool calling: like streamEventsToText, but native
 * tool_call deltas (OpenAI tool_calls / Anthropic tool_use / Gemini
 * functionCall) are accumulated and appended to the FINAL yield as
 * <<TOOL:name>>{...}<</TOOL>> markers — so consumers that parse the marker
 * protocol get native calls for free while live text stays marker-free.
 *
 * Known limitation (shared with the parsers): parallel tool calls in one
 * stream interleave argument deltas; sequences of complete calls (the common
 * case) serialize correctly.
 */
export async function* streamEventsToTextWithTools(
  events: AsyncGenerator<StreamEvent>
): AsyncGenerator<string> {
  let fullText = "";
  let reasoning = "";
  let inReasoning = false;
  const openCalls: Array<{ id?: string; name?: string; args: string }> = [];
  let activeCall: { id?: string; name?: string; args: string } | null = null;

  for await (const event of events) {
    switch (event.type) {
      case "tool_call_start": {
        activeCall = { id: event.toolCall?.id, name: event.toolCall?.name, args: event.toolCall?.arguments || "" };
        openCalls.push(activeCall);
        break;
      }
      case "tool_call_delta": {
        const target = activeCall ?? openCalls[openCalls.length - 1];
        if (target) target.args += event.toolCall?.arguments || "";
        break;
      }
      case "reasoning_delta":
        if (!inReasoning) {
          reasoning = "";
          inReasoning = true;
        }
        reasoning += event.text || "";
        yield `<think>${reasoning}</think>${fullText}`;
        break;
      case "text_delta":
        if (inReasoning) inReasoning = false;
        fullText += event.text || "";
        if (reasoning) {
          yield `<think>${reasoning}</think>${fullText}`;
        } else {
          yield fullText;
        }
        break;
      case "error":
        throw new Error(event.error || "Stream error");
    }
  }

  // Serialize accumulated native calls as text markers on the final chunk.
  const markers = openCalls
    .filter((c) => c.name)
    .map((c) => `<<TOOL:${c.name}>>${c.args.trim() || "{}"}<</TOOL>>`)
    .join("");
  if (markers) {
    yield (reasoning ? `<think>${reasoning}</think>` : "") + fullText + markers;
  }
}
