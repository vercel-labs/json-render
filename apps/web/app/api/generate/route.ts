import { streamText } from "ai";
import { openai } from "@ai-sdk/openai";
import { headers } from "next/headers";
import { buildUserPrompt } from "@json-render/core";
import { minuteRateLimit, dailyRateLimit } from "@/lib/rate-limit";
import { playgroundCatalog } from "@/lib/render/catalog";

export const maxDuration = 30;

const SYSTEM_PROMPT = playgroundCatalog.prompt({
  customRules: [
    "NEVER use viewport height classes (min-h-screen, h-screen) - the UI renders inside a fixed-size container.",
    "NEVER use page background colors (bg-gray-50) - the container has its own background.",
    "For forms or small UIs: use Card as root with maxWidth:'sm' or 'md' and centered:true.",
    "For content-heavy UIs (blogs, dashboards, product listings): use Stack or Grid as root. Use Grid with 2-3 columns for card layouts.",
    "Wrap each repeated item in a Card for visual separation and structure.",
    "Use realistic, professional sample data. Include 3-5 items with varied content. Never leave state arrays empty.",
    'For form inputs (Input, Textarea, Select), always include checks for validation (e.g. required, email, minLength). Always pair checks with a $bindState expression on the value prop (e.g. { "$bindState": "/path" }).',
  ],
});

const MAX_PROMPT_LENGTH = 500;
const DEFAULT_MODEL = "gpt-5";

function resolveModelName(): string {
  const rawModel = (process.env.OPENAI_MODEL || DEFAULT_MODEL).trim();
  if (rawModel.toLowerCase() === "gpt5") return "gpt-5";
  return rawModel.replace(/^openai\//, "");
}

export async function POST(req: Request) {
  if (!process.env.OPENAI_API_KEY) {
    return new Response(
      JSON.stringify({
        error: "Server misconfiguration",
        message: "Missing OPENAI_API_KEY environment variable.",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  // Get client IP for rate limiting
  const headersList = await headers();
  const ip = headersList.get("x-forwarded-for")?.split(",")[0] ?? "anonymous";

  // Check rate limits (minute and daily)
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

  const { prompt, context } = await req.json();

  const userPrompt = buildUserPrompt({
    prompt,
    currentSpec: context?.previousSpec,
    maxPromptLength: MAX_PROMPT_LENGTH,
  });

  const result = streamText({
    model: openai(resolveModelName()),
    system: SYSTEM_PROMPT,
    prompt: userPrompt,
  });

  // Stream the text, then append token usage metadata at the end
  const encoder = new TextEncoder();
  const textStream = result.textStream;

  const stream = new ReadableStream({
    async start(controller) {
      for await (const chunk of textStream) {
        controller.enqueue(encoder.encode(chunk));
      }
      // Append usage metadata after stream completes
      try {
        const usage = await result.usage;
        const meta = JSON.stringify({
          __meta: "usage",
          promptTokens: usage.inputTokens,
          completionTokens: usage.outputTokens,
          totalTokens: usage.totalTokens,
        });
        controller.enqueue(encoder.encode(`\n${meta}\n`));
      } catch {
        // Usage not available — skip silently
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
