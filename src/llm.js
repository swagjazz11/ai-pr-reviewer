// Works with any OpenAI-compatible API (Groq, OpenAI, OpenRouter, Gemini's
// OpenAI endpoint, etc.). Configure with LLM_API_KEY, LLM_BASE_URL, LLM_MODEL.
const SYSTEM_PROMPT = `You are a senior engineer doing a pull request code review.
You are given changed files as diffs. Each line is prefixed with its line number in the new file (e.g. "L12: +code").
Report only real problems: bugs, security vulnerabilities, bad error handling, performance problems, and clear maintainability issues.
Do NOT nitpick formatting. Do NOT comment on removed lines. Be specific and brief. Suggest a fix.

Respond with ONLY valid JSON, no markdown fences, in this exact shape:
{
  "summary": "2-3 sentence overall assessment",
  "comments": [
    { "file": "path/to/file.js", "line": 12, "severity": "bug|security|warning|suggestion", "comment": "what is wrong and how to fix it" }
  ]
}
"line" must be a line number that appears in the diff for that file. If the code looks fine, return an empty comments array.`;

function extractJson(text) {
  const cleaned = text.replace(/```json|```/g, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start !== -1 && end > start) return JSON.parse(cleaned.slice(start, end + 1));
    throw new Error("LLM did not return valid JSON");
  }
}

async function askLLM(diffText, { strictness = "normal" } = {}) {
  const apiKey = process.env.LLM_API_KEY;
  if (!apiKey) throw new Error("LLM_API_KEY is not set");
  const baseUrl = (process.env.LLM_BASE_URL || "https://api.groq.com/openai/v1").replace(/\/$/, "");
  const model = process.env.LLM_MODEL || "llama-3.3-70b-versatile";

  const strictNote =
    strictness === "high"
      ? "Be thorough and strict."
      : strictness === "low"
      ? "Only report serious bugs and security issues."
      : "Balance thoroughness and noise.";

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      messages: [
        { role: "system", content: `${SYSTEM_PROMPT}\n${strictNote}` },
        { role: "user", content: diffText },
      ],
    }),
  });

  if (!res.ok) throw new Error(`LLM API error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return extractJson(data.choices[0].message.content);
}

module.exports = { askLLM, extractJson };
