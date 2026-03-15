import { streamText } from "ai";
import { headers } from "next/headers";
import type { Spec, EditMode } from "@json-render/core";
import {
  buildUserPrompt,
  buildEditUserPrompt,
  isNonEmptySpec,
} from "@json-render/core";
import { yamlPrompt } from "@json-render/yaml";
import { stringify as yamlStringify } from "yaml";
import { minuteRateLimit, dailyRateLimit } from "@/lib/rate-limit";
import { playgroundCatalog } from "@/lib/render/catalog";

export const maxDuration = 30;

const PLAYGROUND_RULES = [
  "NEVER use viewport height classes (min-h-screen, h-screen) - the UI renders inside a fixed-size container.",
  "NEVER use page background colors (bg-gray-50) - the container has its own background.",
  "For forms or small UIs: use Card as root with maxWidth:'sm' or 'md' and centered:true.",
  "For content-heavy UIs (blogs, dashboards, product listings): use Stack or Grid as root. Use Grid with 2-3 columns for card layouts.",
  "Wrap each repeated item in a Card for visual separation and structure.",
  "Use realistic, professional sample data. Include 3-5 items with varied content. Never leave state arrays empty.",
  'For form inputs (Input, Textarea, Select), always include checks for validation (e.g. required, email, minLength). Always pair checks with a $bindState expression on the value prop (e.g. { "$bindState": "/path" }).',
];

const MAX_PROMPT_LENGTH = 500;
const DEFAULT_MODEL = "anthropic/claude-haiku-4.5";

function getSystemPrompt(isYaml: boolean, editModes?: EditMode[]): string {
  if (isYaml) {
    return yamlPrompt(playgroundCatalog, {
      mode: "standalone",
      customRules: PLAYGROUND_RULES,
      editModes: editModes ?? ["merge"],
    });
  }
  return playgroundCatalog.prompt({
    customRules: PLAYGROUND_RULES,
    editModes,
  });
}

function buildYamlUserPrompt(
  prompt: string,
  previousSpec?: Spec | null,
  editModes?: EditMode[],
): string {
  if (isNonEmptySpec(previousSpec)) {
    return buildEditUserPrompt({
      prompt,
      currentSpec: previousSpec,
      config: { modes: editModes ?? ["merge"] },
      format: "yaml",
      maxPromptLength: MAX_PROMPT_LENGTH,
      serializer: (s) => yamlStringify(s, { indent: 2 }).trimEnd(),
    });
  }

  const userText = prompt.slice(0, MAX_PROMPT_LENGTH);
  return [
    userText,
    "",
    "Output the full spec in a ```yaml-spec fence. Stream progressively — output elements one at a time.",
  ].join("\n");
}

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

  const { prompt, context, format, editModes } = await req.json();
  const isYaml = format === "yaml";

  const systemPrompt = getSystemPrompt(isYaml, editModes);
  const userPrompt = isYaml
    ? buildYamlUserPrompt(prompt, context?.previousSpec, editModes)
    : buildUserPrompt({
        prompt,
        currentSpec: context?.previousSpec,
        maxPromptLength: MAX_PROMPT_LENGTH,
        editModes,
      });

  const result = streamText({
    model: process.env.AI_GATEWAY_MODEL || DEFAULT_MODEL,
    system: [
      {
        role: "system",
        content: systemPrompt,
        providerOptions: {
          anthropic: { cacheControl: { type: "ephemeral" } },
        },
      },
    ],
    prompt: userPrompt,
    temperature: 0.7,
  });

  const encoder = new TextEncoder();
  const textStream = result.textStream;

  const stream = new ReadableStream({
    async start(controller) {
      for await (const chunk of textStream) {
        controller.enqueue(encoder.encode(chunk));
      }
      try {
        const usage = await result.usage;
        const meta = JSON.stringify({
          __meta: "usage",
          promptTokens: usage.inputTokens,
          completionTokens: usage.outputTokens,
          totalTokens: usage.totalTokens,
          cachedTokens: usage.inputTokenDetails?.cacheReadTokens ?? 0,
          cacheWriteTokens: usage.inputTokenDetails?.cacheWriteTokens ?? 0,
        });
        controller.enqueue(encoder.encode(`\n${meta}\n`));
      } catch {
        // Usage not available
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
