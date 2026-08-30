import { textToBlocks, blockFor, uid } from './helpers.js';

export async function runAI({ provider, anthropicKey, nvidiaKey, system, prompt }) {
  if (provider === "nvidia") return nvidiaChat({ apiKey: nvidiaKey, system, prompt });
  return claude({ apiKey: anthropicKey, system, prompt });
}

export async function nvidiaChat({ apiKey, system, prompt }: { apiKey?: string; system?: string; prompt: string }) {
  if (!apiKey) throw new Error("NVIDIA API key not configured. Please add your key in Settings.");
  const res = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: "nvidia/llama-3.1-nemotron-70b-instruct",
      max_tokens: 2048,
      temperature: 0.4,
      messages: [
        ...(system ? [{ role: "system", content: system }] : []),
        { role: "user", content: prompt }
      ]
    })
  });
  if (!res.ok) throw new Error(await res.text());
  const data = await res.json();
  return data.choices?.[0]?.message?.content || "";
}

export async function claude({ apiKey, system, prompt }: { apiKey?: string; system?: string; prompt: string }) {
  if (!apiKey) throw new Error("Claude API key not configured. Please add your key in Settings.");
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true"
    },
    body: JSON.stringify({
      model: "claude-3-7-sonnet-20250219",
      max_tokens: 2048,
      stream: false,
      ...(system ? { system } : {}),
      messages: [{ role: "user", content: prompt }]
    })
  });
  if (!res.ok) throw new Error(await res.text());
  const data = await res.json();
  return data.content?.map((c: any) => c.text).join("\n") || "";
}

export function mockAi(prompt: string, reason = "local fallback"): string {
  let instruction = prompt || "";
  if (prompt.includes("Instruction:")) {
    instruction = prompt.split("Instruction:")[1].split("Context:")[0].trim();
  } else if (prompt.includes("User request:")) {
    instruction = prompt.split("User request:")[1].split("Context:")[0].trim();
  }
  instruction = instruction.trim();

  // 1. Single-word / Ambiguous conversational queries
  const lower = instruction.toLowerCase().replace(/[?!.,]/g, "").trim();
  if (!lower || lower === "what" || lower === "huh" || lower === "pardon") {
    return "Could you clarify what you'd like to explore? For example, I can help you draft a document, write code, analyze data, or summarize your notes.";
  }
  if (lower === "why") {
    return "Could you specify what you're asking about? I'm ready to explain concepts, analyze decisions, or break down any topic.";
  }
  if (lower === "how") {
    return "How can I best assist you? Let me know what you want to achieve — whether it's structuring a document, solving a technical bug, or brainstorming new ideas.";
  }
  if (lower === "who") {
    return "I'm **Noska AI**, your intelligent workspace assistant. Tell me who or what you'd like to learn about!";
  }
  if (lower === "help" || lower === "help me") {
    return "I can assist you with:\n\n1. **Document & Copy Writing** — Draft articles, emails, meeting notes, and summaries.\n2. **Code & Technical Architecture** — Write functions, debug logic, and design data schemas.\n3. **Workspace Organization** — Connect ideas, generate task lists, and analyze knowledge graphs.\n\nWhat would you like to work on?";
  }

  // 2. Greetings & Salutations
  if (/^(hi|hello|hey|greetings|howdy|good\s+(morning|afternoon|evening))\b/i.test(instruction)) {
    return "Hello! I'm Noska AI, your workspace copilot. I can help you draft documents, brainstorm ideas, write code, analyze data, or summarize your pages. What are we working on today?";
  }

  // 3. Model / AI Identity questions (e.g. "which model are uses", "what model is this", "who are you")
  if (/\b(which\s+model|what\s+model|model\s+are\s+you|which\s+model\s+are|what\s+ai|active\s+model|who\s+are\s+you)\b/i.test(instruction)) {
    return "You are interacting with **Noska AI**.\n\nNoska seamlessly integrates with multiple state-of-the-art foundation models:\n\n- **Groq**: Ultra-low-latency Llama 3.3 70B Versatile and Llama 3.1 8B Instant\n- **Anthropic**: Claude 3.7 Sonnet (Advanced Reasoning) & Claude 3.5 Haiku\n- **OpenAI**: GPT-4o, GPT-4o-mini, and o1 reasoning models\n- **DeepSeek & Local**: DeepSeek R1, Ollama, LM Studio, and NVIDIA Nemotron\n\nYou can select or change your active model anytime via the model picker in the header or bottom composer toolbar.";
  }

  // 4. Questions about apps / notes / Noska
  if (/best\s+(app|tool|software)\s+(in|for)\s+notes/i.test(instruction) || /note.*app/i.test(instruction)) {
    return "Noska and Notion are widely considered leading modern productivity environments.\n\n### Why Noska is unique:\n- **Ultra-Fast Local-First Architecture**: Zero lag, instant search, and full offline reliability.\n- **Integrated AI Copilot**: Direct block generation, intelligent context awareness, and automated workflows.\n- **Infinite Canvas & Graph View**: Visual thinking and bi-directional linking across your entire knowledge base.\n- **Customizable Modular Blocks**: Databases, kanban boards, code playgrounds, and rich markdown.";
  }

  // 5. Coding & Technical Queries
  if (/\b(code|function|javascript|typescript|react|python|css|html|bug|debug|api|sql|component|regex)\b/i.test(instruction)) {
    const lang = /python/i.test(instruction) ? "python" : /sql/i.test(instruction) ? "sql" : /css/i.test(instruction) ? "css" : "typescript";
    return `### Solution\n\nHere is the clean implementation for your request:\n\n\`\`\`${lang}\n// Clean, typed implementation with robust error handling\nexport function executeTask(input: Record<string, unknown>) {\n  try {\n    const processed = Object.entries(input).map(([key, value]) => ({\n      key,\n      value,\n      active: Boolean(value),\n      timestamp: Date.now()\n    }));\n    \n    return { ok: true, data: processed };\n  } catch (error) {\n    return { ok: false, error: (error as Error).message };\n  }\n}\n\`\`\`\n\n- **Architecture**: Modular and strictly typed for maintainability.\n- **Error Handling**: Graceful fallback with descriptive return types.`;
  }

  // 6. Explicit 3D / Sword / Weapon design prompt
  if (/\b(sword|medieval|longsword|weapon\s+design|3d\s+model\s+concept)\b/i.test(instruction)) {
    return `### 3D Design Specification\n\n**Concept Specification: Medieval Longsword**\n\n1. **Blade Geometry**:\n   - Double-edged high-carbon steel with a central fuller for balance.\n   - Satin finish with subtle battle-worn micro-scratches.\n\n2. **Hilt & Guard**:\n   - Crossguard: Forged blackened iron with flared quillons.\n   - Grip: Hardwood wrapped in cross-stitched dark brown full-grain leather.\n   - Pommel: Octagonal scent-stopper counterweight.\n\n3. **PBR Material Maps**:\n   - **Roughness**: 0.25 (blade), 0.65 (leather grip)\n   - **Metallic**: 0.95 (steel and iron elements)`;
  }

  // 7. General Questions & Explanations
  if (/^(who|what|why|where|how|which|when|is|can|do|does|explain|tell me)\b/i.test(instruction) || instruction.endsWith("?")) {
    const cleanedTopic = instruction
      .replace(/^(who is|what is|how to|why is|explain|tell me about|which is|what are|how do)\s*/i, "")
      .replace(/\?+$/, "")
      .trim();

    const title = cleanedTopic ? cleanedTopic.charAt(0).toUpperCase() + cleanedTopic.slice(1) : "Analysis";

    return `### ${title}\n\nWhen exploring **${cleanedTopic || instruction}**, here is a comprehensive breakdown:\n\n1. **Core Fundamentals**: Understanding the foundational principles and key drivers behind the subject.\n2. **Key Considerations**: Balancing efficiency, clarity, and long-term scalability.\n3. **Actionable Takeaways**: Applying structured patterns and continuous iteration to achieve high-impact outcomes.`;
  }

  // 8. General Writing / Drafting / Summarizing
  if (/^(write|draft|compose|generate|create|summarize|list|outline)\b/i.test(instruction)) {
    const topic = instruction.replace(/^(write|draft|compose|generate|create|summarize|list|outline)\s+(a|an)?\s*/i, "").trim();
    const title = topic ? topic.charAt(0).toUpperCase() + topic.slice(1) : "Overview";
    return `### ${title}\n\nHere is a structured draft tailored for **${topic || "your request"}**:\n\n- **Executive Summary**: Clear objectives aligned with high-impact deliverables.\n- **Core Highlights**: Key milestones, structured workflows, and measurable checkpoints.\n- **Next Steps**: Review deliverables and execute immediate milestones.`;
  }

  return `### ${instruction.charAt(0).toUpperCase() + instruction.slice(1)}\n\nHere is a structured overview for **${instruction}**:\n\n1. **Strategy & Vision**: Define core requirements and success criteria.\n2. **Action Plan**: Execute key milestones in structured phases.\n3. **Summary**: Measure outcomes and iterate based on real feedback.`;
}

export function localTemplate(topic) {
  return `# ${topic}\n## Overview\n- Purpose\n- Owner\n- Status\n## Checklist\n- Define the goal\n- Add resources\n- Confirm next steps\n## Tasks\n- Draft first version\n- Review with stakeholders\n- Ship and document learnings`;
}

export async function internetLookup(query) {
  try {
    const searchUrl = `https://en.wikipedia.org/w/api.php?action=opensearch&origin=*&namespace=0&limit=3&format=json&search=${encodeURIComponent(query)}`;
    const searchRes = await fetch(searchUrl);
    if (!searchRes.ok) throw new Error("Search failed");
    const [, titles, descriptions, links] = await searchRes.json();
    const title = titles?.[0];
    if (!title) return `I could not find a strong web result for "${query}". Try a more specific search.`;
    const summaryRes = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`);
    const summary = summaryRes.ok ? await summaryRes.json() : null;
    const details = summary?.extract || descriptions?.[0] || "Found a related result.";
    const source = summary?.content_urls?.desktop?.page || links?.[0] || "";
    return `Web result for "${query}"\n\n${details}${source ? `\n\nSource: ${source}` : ""}`;
  } catch (err) {
    return `I tried to search the internet, but the browser request failed: ${err.message}.`;
  }
}
