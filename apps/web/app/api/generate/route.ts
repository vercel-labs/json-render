import { streamText } from "ai";
import { openai } from "@ai-sdk/openai";
import { headers } from "next/headers";
import { buildUserPrompt } from "@json-render/core";
import { minuteRateLimit, dailyRateLimit } from "@/lib/rate-limit";
import { playgroundCatalog } from "@/lib/render/catalog";

export const maxDuration = 30;

const SYSTEM_PROMPT = playgroundCatalog.prompt({
  customRules: [
    "Email-only mode: generate HTML email structures, never app UI layouts.",
    "Always set Html as root, with Head and Body as direct children.",
    "Inside Body, always include one main Container (max width around 600px).",
    "Use Section / Row / Column for layout and keep styles inline via style props.",
    "Emails are static: do not use interactive controls, state bindings, or actions.",
    "Use realistic marketing/email content (subject-like preview, hero, body copy, CTA, footer).",
    "For CTA, use Button with text + href. For links, always provide absolute URLs.",
    "For images, always use absolute URLs.",
  ],
});

const MAX_PROMPT_LENGTH = 500;
const DEFAULT_MODEL = "gpt-4.1-mini-2025-04-14";

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
