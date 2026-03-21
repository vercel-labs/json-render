import { streamText } from "ai";
import { gateway } from "@ai-sdk/gateway";
import { headers } from "next/headers";
import { generateGameAIPrompt } from "@/lib/ai-game-prompt";
import { minuteRateLimit, dailyRateLimit } from "@/lib/rate-limit";

export async function POST(req: Request) {
  const headersList = await headers();
  const ip = headersList.get("x-forwarded-for")?.split(",")[0] ?? "anonymous";

  const [minuteResult, dailyResult] = await Promise.all([
    minuteRateLimit.limit(ip),
    dailyRateLimit.limit(ip),
  ]);

  if (!minuteResult.success || !dailyResult.success) {
    const isMinuteLimit = !minuteResult.success;
    return new Response(
      JSON.stringify({
        error: "Rate limit exceeded",
        message: isMinuteLimit
          ? "Too many requests. Please wait a moment before trying again."
          : "Daily limit reached. Please try again tomorrow.",
      }),
      {
        status: 429,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  const { prompt, objects, previousPrompts } = await req.json();

  if (!prompt) {
    return Response.json({ error: "Prompt is required" }, { status: 400 });
  }

  const sceneObjects = Array.isArray(objects) ? objects : [];

  const result = streamText({
    model: gateway(
      process.env.AI_GATEWAY_MODEL || "anthropic/claude-sonnet-4-6",
    ),
    prompt: generateGameAIPrompt(prompt, sceneObjects, previousPrompts || []),
  });

  return result.toTextStreamResponse();
}
