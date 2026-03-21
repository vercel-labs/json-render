import { streamText } from "ai";
import { gateway } from "@ai-sdk/gateway";
import { headers } from "next/headers";
import { generateSystemPrompt, generateUserPrompt } from "@/lib/ai-prompt";
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

  const { prompt, spec, previousPrompts } = await req.json();

  const result = streamText({
    model: gateway(
      process.env.AI_GATEWAY_MODEL || "anthropic/claude-sonnet-4-6",
    ),
    system: generateSystemPrompt(),
    prompt: generateUserPrompt(prompt, spec, previousPrompts),
  });

  return result.toTextStreamResponse();
}
