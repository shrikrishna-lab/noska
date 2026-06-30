import { textToBlocks, blockFor, uid } from './helpers.js';

export async function runAI({ provider, anthropicKey, nvidiaKey, system, prompt }) {
  if (provider === "nvidia") return nvidiaChat({ apiKey: nvidiaKey, system, prompt });
  return claude({ apiKey: anthropicKey, system, prompt });
}

export async function nvidiaChat({ apiKey, system, prompt }) {
  if (!apiKey) return mockAi(prompt, "NVIDIA key not saved");
  try {
    const res = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "nvidia/llama-3.1-nemotron-70b-instruct",
        max_tokens: 1000,
        temperature: 0.4,
        messages: [
          { role: "system", content: system },
          { role: "user", content: prompt }
        ]
      })
    });
    if (!res.ok) throw new Error(await res.text());
    const data = await res.json();
    return data.choices?.[0]?.message?.content || "";
  } catch (err) {
    return `${mockAi(prompt, "NVIDIA request failed")}\n\nNVIDIA API detail: ${err.message}`;
  }
}

export async function claude({ apiKey, system, prompt }) {
  if (!apiKey) return mockAi(prompt, "Claude key not saved");
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1000,
        stream: false,
        system,
        messages: [{ role: "user", content: prompt }]
      })
    });
    if (!res.ok) throw new Error(await res.text());
    const data = await res.json();
    return data.content?.map((c) => c.text).join("\n") || "";
  } catch (err) {
    return `${mockAi(prompt, "Claude request failed")}\n\nClaude API detail: ${err.message}`;
  }
}

export function mockAi(prompt, reason = "local fallback") {
  const topic = prompt.split("User request:").pop()?.trim() || prompt.split("Task:").pop()?.trim() || "this page";
  return `## AI draft\n- ${topic}\n- Key insight: organize the work into clear decisions, owners, and next actions.\n- Next action: convert unresolved notes into to-do blocks.\n\n> Generated locally (${reason}). Add your NVIDIA or Claude API key in Settings for live output.`;
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
