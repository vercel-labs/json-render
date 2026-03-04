import { streamText } from "ai";
import { gateway } from "@ai-sdk/gateway";
import { openai } from "@ai-sdk/openai";
import { headers } from "next/headers";
import { buildUserPrompt } from "@json-render/core";
import { minuteRateLimit, dailyRateLimit } from "@/lib/rate-limit";
import { playgroundCatalog } from "@/lib/render/catalog";

export const maxDuration = 30;

const SYSTEM_PROMPT = playgroundCatalog.prompt({
  customRules: [
    "Email-only mode: output ONLY valid json-render email spec. Never output app UI/layouts.",
    "Structure: root MUST be Html with children [Head, Body] (Head can be empty).",
    "Body must contain exactly one primary Container centered at maxWidth 600px.",
    "Use table-safe layout primitives only: Section, Row, Column. Avoid CSS features with weak email support.",
    "Inline styles only. No external CSS, no classes, no style tags, no scripts.",
    "Typography system: clear hierarchy (hero heading, section heading, body, caption). Use consistent spacing scale (8/12/16/24/32).",
    "Visual system: modern but restrained. High contrast, generous whitespace, subtle dividers, consistent corner radius, limited color palette (1 primary, 1 neutral, 1 accent max).",
    "Content quality: concise, specific, benefit-led copy. Avoid generic filler text and vague marketing clichés.",
    "Compose professional sections in this order unless user asks otherwise: Hero, Value Proposition, Feature blocks, Social proof/testimonial, Primary CTA, Footer.",
    "CTA quality: exactly one primary CTA above fold; optional secondary CTA in footer. CTA text must be action-oriented (e.g., 'Start Free Trial').",
    "Links and images: always absolute HTTPS URLs. Images must include meaningful alt text and explicit width/height when possible.",
    "Accessibility: maintain readable font sizes (>=14px body), strong color contrast, and clear link/button affordances.",
    "Responsiveness: prefer single-column or simple 2-column sections that stack gracefully.",
    "Email safety: no interactive controls, no forms, no state bindings, no actions.",
    "Output reliability: all referenced child keys must exist; no orphan elements; no unknown component types.",
  ],
});

const MAX_PROMPT_LENGTH = 700;
const DEFAULT_MODEL = "anthropic/claude-haiku-4.5";

function resolveModelName(): string {
  const rawModel = (
    process.env.MODEL ||
    process.env.AI_GATEWAY_MODEL ||
    DEFAULT_MODEL
  ).trim();
  if (rawModel.toLowerCase() === "gpt5") return "gpt-5";
  return rawModel;
}

function resolveModelProvider(modelName: string): "openai" | "gateway" {
  if (modelName.startsWith("anthropic/")) return "gateway";
  if (modelName.startsWith("openai/")) return "openai";
  if (modelName.includes("/")) return "gateway";
  return "openai";
}

function createModel(modelName: string) {
  const provider = resolveModelProvider(modelName);
  if (provider === "gateway") {
    return { provider, model: gateway(modelName) };
  }
  return { provider, model: openai(modelName.replace(/^openai\//, "")) };
}

export async function POST(req: Request) {
  const modelName = resolveModelName();
  const { provider, model } = createModel(modelName);

  console.log(`[generate] Using model: ${modelName} (provider: ${provider})`);

  if (provider === "gateway" && !process.env.AI_GATEWAY_API_KEY) {
    return new Response(
      JSON.stringify({
        error: "Server misconfiguration",
        message: "Missing AI_GATEWAY_API_KEY environment variable.",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  if (provider === "openai" && !process.env.OPENAI_API_KEY) {
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
    model,
    system: SYSTEM_PROMPT,
    prompt: userPrompt,
  });

  // Stream the text, then append token usage metadata at the end
  const encoder = new TextEncoder();
  const textStream = result.textStream;

  const stream = new ReadableStream({
    async start(controller) {
      try {
        let hasContent = false;
        for await (const chunk of textStream) {
          if (chunk) hasContent = true;
          controller.enqueue(encoder.encode(chunk));
        }

        if (!hasContent) {
          console.warn(`[generate] Empty response from model ${modelName}`);
          const meta = JSON.stringify({
            __meta: "error",
            message: `Model "${modelName}" returned an empty response. Check that the API key and model name are correct.`,
          });
          controller.enqueue(encoder.encode(`\n${meta}\n`));
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
      } catch (error) {
        console.error(`[generate] Stream error for model ${modelName}:`, error);
        const message =
          error instanceof Error ? error.message : "Generation failed.";
        const meta = JSON.stringify({
          __meta: "error",
          message: `[${modelName}] ${message}`,
        });
        controller.enqueue(encoder.encode(`\n${meta}\n`));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
