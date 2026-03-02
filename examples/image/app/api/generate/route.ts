import { streamText } from "ai";
import { buildUserPrompt, type Spec } from "@json-render/core";
import { imageCatalog } from "@/lib/catalog";

export const maxDuration = 60;

const SYSTEM_PROMPT = imageCatalog.prompt();

const DEFAULT_MODEL = "anthropic/claude-haiku-4.5";

export async function POST(req: Request) {
  const { prompt, startingSpec } = (await req.json()) as {
    prompt: string;
    startingSpec?: Spec | null;
  };

  if (!prompt || typeof prompt !== "string") {
    return Response.json({ error: "prompt is required" }, { status: 400 });
  }

  const userPrompt = buildUserPrompt({
    prompt,
    currentSpec: startingSpec,
  });

  const result = streamText({
    model: process.env.AI_GATEWAY_MODEL ?? DEFAULT_MODEL,
    system: SYSTEM_PROMPT,
    prompt: userPrompt,
    temperature: 0.7,
  });

  return result.toTextStreamResponse();
}
