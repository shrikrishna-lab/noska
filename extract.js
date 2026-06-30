import fs from "fs";
import path from "path";

const logPath = "C:\\Users\\lenovo\\.gemini\\antigravity-ide\\brain\\7f6e374b-67a7-4432-8a48-0d923ebce408\\.system_generated\\logs\\transcript.jsonl";
const outputPath = "d:\\Future & Ideas\\Notion By Me\\features_list.md";

try {
  const content = fs.readFileSync(logPath, "utf8");
  const lines = content.split("\n");
  for (const line of lines) {
    if (!line.trim()) continue;
    const obj = JSON.parse(line);
    if (obj.step_index === 0 && obj.source === "USER_EXPLICIT") {
      let req = obj.content;
      // Remove <USER_REQUEST> and </USER_REQUEST> tags if present
      req = req.replace("<USER_REQUEST>\n", "").replace("\n</USER_REQUEST>", "");
      fs.writeFileSync(outputPath, req, "utf8");
      console.log("Successfully extracted full features list to:", outputPath);
      break;
    }
  }
} catch (err) {
  console.error("Error extracting features list:", err);
}
