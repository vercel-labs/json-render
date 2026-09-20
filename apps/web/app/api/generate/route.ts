import { streamText } from "ai";
import { headers } from "next/headers";
import type { Spec, EditMode } from "@json-render/core";
import {
  buildUserPrompt,
  buildEditUserPrompt,
  isNonEmptySpec,
  selectOrcaModels,
  type OrcaInputModality,
} from "@json-render/core";
import { yamlPrompt } from "@json-render/yaml";
import { stringify as yamlStringify } from "yaml";
import { minuteRateLimit, dailyRateLimit } from "@/lib/rate-limit";
import { playgroundCatalog } from "@/lib/render/catalog";
import { createCompositionResponse } from "@/lib/jev/response";
import { discoverOrcaModels } from "@/lib/orcarouter/connect-session";
import {
  OrcaRouterNotConnectedError,
  createOrcarouterTransport,
  isOrcarouterProvider,
  ORCAROUTER_DEFAULT_MODEL,
} from "@/lib/orcarouter/provider";

export const maxDuration = 60;

const PLAYGROUND_RULES = [
  "NEVER use viewport height classes (min-h-screen, h-screen) - the UI renders inside a fixed-size container.",
  "NEVER use page background colors (bg-gray-50) - the container has its own background.",
  "For forms or small UIs: use Card as root with maxWidth:'sm' or 'md' and centered:true.",
  "For content-heavy UIs (blogs, dashboards, product listings): use Stack or Grid as root. Use Grid with 2-3 columns for card layouts. Keep the total UI compact — avoid sprawling multi-section pages. Prefer a single focused Card over a full page layout.",
  "Wrap each repeated item in a Card for visual separation and structure.",
  "Use realistic, professional sample data. Include 3-5 items with varied content. Never leave state arrays empty.",
  'For form inputs (Input, Textarea, Select), always include checks for validation (e.g. required, email, minLength). Always pair checks with a $bindState expression on the value prop (e.g. { "$bindState": "/path" }).',
  "NEVER use emoji characters. Use the Icon component with Lucide icon names instead. For example, use Icon with name:'MapPin' instead of a pin emoji, Icon with name:'Mail' instead of an envelope emoji, etc.",
  "For icon+label patterns, use a horizontal Stack with gap:'sm' and align:'center' containing an Icon and a Text.",
  "For any tabular or list data with consistent columns (items, orders, stats), ALWAYS use the Table component. Never simulate tables with Stacks — the columns won't align.",
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

  const {
    prompt,
    context,
    format,
    editModes,
    model,
    provider,
    orcaModel,
    attachments,
  } = await req.json();
  if (model === "typesafe-ai/jev")
    return createCompositionResponse(req, prompt, context?.previousSpec);
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

  const orcarouter =
    typeof provider === "string" && isOrcarouterProvider(provider);

  // Second-layer guard. The selector is already filtered by capability, but a
  // request must never carry an attachment to a model the catalog cannot prove
  // accepts it.
  const uploadedModalities = new Set<OrcaInputModality>(
    Array.isArray(attachments)
      ? attachments
          .map((item: unknown) =>
            typeof item === "object" && item !== null
              ? (item as { modality?: unknown }).modality
              : null,
          )
          .filter(
            (value: unknown): value is OrcaInputModality =>
              value === "image" || value === "audio" || value === "video",
          )
      : [],
  );

  let modelRef: Parameters<typeof streamText>[0]["model"];
  if (orcarouter) {
    const modelId =
      typeof orcaModel === "string" && orcaModel.trim()
        ? orcaModel.trim()
        : ORCAROUTER_DEFAULT_MODEL;
    try {
      // Revalidate the requested model against the live catalog for the exact
      // capability requirements of this request before sending anything.
      const { catalog } = await discoverOrcaModels();
      const compatible = selectOrcaModels(catalog, {
        capability: "chat",
        requiredInputModalities: [...uploadedModalities],
      });
      if (!compatible.some((entry) => entry.id === modelId)) {
        return Response.json(
          {
            error: "Incompatible model",
            message: uploadedModalities.size
              ? `The OrcaRouter catalog does not list "${modelId}" as a chat model that accepts ${[...uploadedModalities].join(", ")} input. Pick another model.`
              : `The OrcaRouter catalog does not list "${modelId}" as a chat model. Pick another model.`,
          },
          { status: 400 },
        );
      }
      modelRef = createOrcarouterTransport(modelId).model;
    } catch (error) {
      const message =
        error instanceof OrcaRouterNotConnectedError
          ? error.message
          : "The OrcaRouter model catalog is unavailable. Try again shortly.";
      return Response.json(
        { error: "OrcaRouter unavailable", message },
        {
          status: 503,
        },
      );
    }
  } else {
    modelRef = process.env.AI_GATEWAY_MODEL || DEFAULT_MODEL;
  }

  const result = streamText({
    model: modelRef,
    abortSignal: req.signal,
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
