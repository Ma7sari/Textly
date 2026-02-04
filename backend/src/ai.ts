import type { GenerateRequest } from "./validate.js";

type ProviderResponse = {
  text: string;
};

function needsClarification(instruction: string, context?: string): boolean {
  const words = instruction.trim().split(/\s+/);
  if (words.length < 3 && (!context || context.trim().length === 0)) {
    return true;
  }
  if (/^skriv$/i.test(instruction.trim())) {
    return true;
  }
  return false;
}

function clarificationQuestions(tone: string): string {
  const prefix =
    tone === "formal"
      ? "För att kunna hjälpa dig behöver jag:"
      : "Jag behöver lite mer info:";
  return [
    prefix,
    "1) Vad är syftet/mottagaren?",
    "2) Vilka nyckelpunkter måste med?",
    "3) Finns det någon önskad längd eller deadline?"
  ].join("\n");
}

function buildSystemPrompt(tone: string): string {
  return [
    "Du är en skrivassistent för legitimt bruk (jobbmail, dokument, CRM, anteckningar).",
    "Skriv tydliga, korrekta och användbara utkast.",
    "Håll dig till användarens instruktion.",
    `Ton: ${tone}.`,
    "Om kontext ges, utgå från den."
  ].join(" ");
}

function buildUserPrompt(instruction: string, context?: string): string {
  if (context && context.trim().length > 0) {
    return [
      "INSTRUKTION:",
      instruction,
      "",
      "KONTEXT:",
      context
    ].join("\n");
  }
  return `INSTRUKTION:\n${instruction}`;
}

async function openAiGenerate(req: GenerateRequest): Promise<ProviderResponse> {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY saknas i .env");
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: buildSystemPrompt(req.tone) },
        { role: "user", content: buildUserPrompt(req.instruction, req.context) }
      ],
      temperature: req.tone === "short" ? 0.4 : 0.7
    })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OpenAI error: ${response.status} ${text}`);
  }

  const data = (await response.json()) as any;
  const text =
    data?.choices?.[0]?.message?.content?.trim() ||
    "Kunde inte generera text.";
  return { text };
}

export async function generateText(req: GenerateRequest): Promise<ProviderResponse> {
  if (needsClarification(req.instruction, req.context)) {
    return { text: clarificationQuestions(req.tone) };
  }

  return openAiGenerate(req);
}
