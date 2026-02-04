export type Tone = "neutral" | "formal" | "short" | "friendly";

export type GenerateRequest = {
  instruction: string;
  context?: string;
  tone: Tone;
};

const allowedTones: Tone[] = ["neutral", "formal", "short", "friendly"];

export function validateGenerateRequest(body: unknown): GenerateRequest {
  if (!body || typeof body !== "object") {
    throw new Error("Invalid JSON body.");
  }

  const instruction = (body as any).instruction;
  const context = (body as any).context;
  const tone = (body as any).tone;

  if (typeof instruction !== "string" || instruction.trim().length === 0) {
    throw new Error("instruction is required.");
  }
  if (context !== undefined && typeof context !== "string") {
    throw new Error("context must be a string.");
  }
  if (!allowedTones.includes(tone)) {
    throw new Error("tone must be one of: neutral, formal, short, friendly.");
  }

  return {
    instruction: instruction.trim(),
    context: typeof context === "string" ? context : undefined,
    tone
  };
}
