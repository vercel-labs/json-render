#!/usr/bin/env node
// Records model output for the streaming demo app.
//
// The script builds the system prompt for the native catalog with
// `catalog.prompt()` from @json-render/core, streams a response for each demo
// prompt from an OpenAI-compatible chat completions endpoint, and saves every
// text chunk with the time it arrived. The demo app replays the chunks with the
// same timing, so it renders real model output at the speed it streamed.
//
// Usage (from the repository root, after `pnpm install` and
// `pnpm --filter @json-render/core build`):
//
//   AI_GATEWAY_API_KEY=... node swift/JSONRender/Scripts/record-demo-streams.mjs [id ...]
//
// Options are read from the environment:
//   AI_GATEWAY_API_KEY  API key for the endpoint (required)
//   AI_GATEWAY_URL      Defaults to https://ai-gateway.vercel.sh/v1/chat/completions
//   AI_GATEWAY_MODEL    Defaults to anthropic/claude-sonnet-5.5
//   PRINT_PROMPT=1      Print the system prompt and exit

import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, "../../..");
const requireFromReact = createRequire(
  join(repoRoot, "packages/react/package.json"),
);
const { z } = requireFromReact("zod");
const { defineCatalog } = await import(
  join(repoRoot, "packages/core/dist/index.mjs")
);
const { schema } = await import(join(repoRoot, "packages/react/src/schema.ts"));

const outputDir = join(here, "../Sources/JSONRenderStreamingDemo/Resources");

const tint = z
  .enum([
    "blue",
    "green",
    "orange",
    "red",
    "purple",
    "pink",
    "teal",
    "indigo",
    "yellow",
    "brown",
    "gray",
  ])
  .nullable();
const gap = z.enum(["none", "xs", "sm", "md", "lg", "xl"]).nullable();
const symbol = z
  .string()
  .nullable()
  .describe('SF Symbols name, for example "cup.and.saucer.fill"');

// Mirrors `NativeCatalog` in Sources/JSONRenderCatalog.
export const catalog = defineCatalog(schema, {
  components: {
    Card: {
      props: z.object({
        title: z.string().nullable(),
        description: z.string().nullable(),
        icon: symbol,
        tint,
      }),
      slots: ["default"],
      description:
        "Rounded content card on a material background. Groups a section of the screen.",
      example: { title: "Today", icon: "sun.max.fill" },
    },
    Stack: {
      props: z.object({
        direction: z.enum(["horizontal", "vertical"]).nullable(),
        gap,
        align: z.enum(["start", "center", "end", "stretch"]).nullable(),
        justify: z.enum(["start", "center", "end", "between"]).nullable(),
      }),
      slots: ["default"],
      description: "Vertical or horizontal stack of children.",
      example: { direction: "vertical", gap: "md" },
    },
    Grid: {
      props: z.object({
        columns: z.number().nullable().describe("1 to 4 columns"),
        gap,
      }),
      slots: ["default"],
      description: "Grid with equal-width columns.",
      example: { columns: 3, gap: "md" },
    },
    Heading: {
      props: z.object({
        text: z.string(),
        level: z.enum(["h1", "h2", "h3", "h4"]).nullable(),
      }),
      description: "Heading text. h1 is the page title.",
      example: { text: "Overview", level: "h2" },
    },
    Text: {
      props: z.object({
        text: z.string(),
        variant: z.enum(["body", "lead", "caption", "muted", "code"]).nullable(),
      }),
      description: "Paragraph text.",
      example: { text: "Everything is up to date." },
    },
    Metric: {
      props: z.object({
        label: z.string(),
        value: z.string(),
        detail: z.string().nullable(),
        trend: z.enum(["up", "down", "neutral"]).nullable(),
        icon: symbol,
        tint,
      }),
      description:
        "Key number with a label, an optional detail line, and an optional trend.",
      example: {
        label: "Revenue",
        value: "$4,280",
        detail: "+12% vs last week",
        trend: "up",
        icon: "dollarsign.circle.fill",
      },
    },
    Badge: {
      props: z.object({
        text: z.string(),
        variant: z
          .enum([
            "default",
            "secondary",
            "success",
            "warning",
            "destructive",
            "outline",
          ])
          .nullable(),
      }),
      description: "Small status pill.",
      example: { text: "Active", variant: "success" },
    },
    Alert: {
      props: z.object({
        title: z.string(),
        message: z.string().nullable(),
        type: z.enum(["info", "success", "warning", "error"]).nullable(),
      }),
      description: "Inline banner for a notice or warning.",
      example: { title: "Low stock", message: "2 items need restocking", type: "warning" },
    },
    List: {
      props: z.object({
        title: z.string().nullable(),
      }),
      slots: ["default"],
      description:
        "Grouped list with separators between rows. Children should be ListItem elements.",
      example: { title: "Top drinks" },
    },
    ListItem: {
      props: z.object({
        title: z.string(),
        subtitle: z.string().nullable(),
        icon: symbol,
        tint,
        trailing: z.string().nullable().describe("Trailing value text"),
      }),
      slots: ["default"],
      description:
        "Row in a List with a tinted SF Symbol, a title, an optional subtitle, and trailing text. Children render as trailing accessories, for example a Badge or a Button.",
      example: {
        title: "Oat Latte",
        subtitle: "142 sold",
        icon: "cup.and.saucer.fill",
        tint: "brown",
        trailing: "$781",
      },
    },
    Image: {
      props: z.object({
        src: z.string().nullable(),
        alt: z.string(),
        height: z.number().nullable(),
      }),
      description:
        "Image with rounded corners. Use only with a real https image URL; otherwise it shows a placeholder.",
    },
    Progress: {
      props: z.object({
        value: z.number(),
        max: z.number().nullable(),
        label: z.string().nullable(),
        tint,
      }),
      description: "Progress bar with an optional label and percentage.",
      example: { value: 65, max: 100, label: "Daily goal" },
    },
    Button: {
      props: z.object({
        label: z.string(),
        variant: z.enum(["primary", "secondary", "danger"]).nullable(),
        icon: symbol,
        disabled: z.boolean().nullable(),
      }),
      events: ["press"],
      description: "Push button. Bind on.press to an action.",
      example: { label: "Save", variant: "primary" },
    },
    Switch: {
      props: z.object({
        label: z.string(),
        description: z.string().nullable(),
        checked: z.boolean().nullable(),
      }),
      events: ["change"],
      description:
        "Toggle switch. Use { $bindState } on checked for two-way binding.",
      example: { label: "Notifications", checked: true },
    },
    BarChart: {
      props: z.object({
        title: z.string().nullable(),
        data: z.array(z.record(z.string(), z.unknown())),
        xKey: z.string(),
        yKey: z.string(),
        tint,
        height: z.number().nullable(),
      }),
      description:
        'Bar chart. Bind data with { "$state": "/path" }. xKey is the category field, yKey is the numeric field.',
    },
    LineChart: {
      props: z.object({
        title: z.string().nullable(),
        data: z.array(z.record(z.string(), z.unknown())),
        xKey: z.string(),
        yKey: z.string(),
        tint,
        height: z.number().nullable(),
      }),
      description:
        'Line chart with a soft area fill. Bind data with { "$state": "/path" }. xKey is the x-axis field, yKey is the numeric field.',
    },
    Separator: {
      props: z.object({}),
      description: "Horizontal divider line.",
    },
  },
  actions: {
    toast: {
      params: z.object({ message: z.string() }),
      description:
        "Show a short confirmation message at the bottom of the window. Params: { message: string }",
    },
  },
});

const customRules = [
  "The UI renders in a square native macOS window about 690 points wide with large text. Start with an h1 Heading and a short muted Text subtitle, then sections.",
  "Use a Grid with columns 2 for up to four Metric elements. Stack Cards vertically at full width. Only place two Cards side by side, in a Grid with columns 2, when each holds a chart or a few short lines, never a List with buttons.",
  "Every icon prop is an SF Symbols name such as cup.and.saucer.fill, chart.line.uptrend.xyaxis, exclamationmark.triangle.fill, airplane, tram.fill, fork.knife, or building.columns.fill. Use icons generously, with a tint that fits the meaning.",
  "Put chart data arrays and every value that can change in /state, and reference them with $state.",
  "Stream in reading order and finish each section before starting the next: output the /state patches an element reads immediately after that element, so no section waits on data.",
  "Make the screen interactive: at least one Button runs setState on a field that a Badge displays through $cond, so the Badge text and variant change, followed by a toast action that confirms it. The Button reflects the change too: bind its label and disabled props with $cond on the same field, so for example \"Reorder\" becomes \"Ordered\" and turns disabled. At least one Switch, bound with $bindState, shows or hides a Card through a visible condition.",
  "Do not use Image elements.",
  "Keep it compact: 22 to 32 elements, 3 to 5 items per list, short labels, and Metric details under 18 characters.",
];

const demos = [
  {
    id: "coffee-shop",
    title: "Coffee shop dashboard",
    prompt:
      "A dashboard for my coffee shop: today's sales, top drinks, and inventory alerts",
  },
  {
    id: "tokyo-trip",
    title: "Tokyo trip planner",
    prompt: "A trip planner for 3 days in Tokyo",
  },
  {
    id: "smart-home",
    title: "Smart home",
    prompt:
      "A smart home control panel: rooms, lights, thermostat, and energy use this week",
  },
];

const systemPrompt = catalog.prompt({ customRules });

if (process.env.PRINT_PROMPT) {
  console.log(systemPrompt);
  process.exit(0);
}

const apiKey = process.env.AI_GATEWAY_API_KEY;
if (!apiKey) {
  console.error("AI_GATEWAY_API_KEY is not set");
  process.exit(1);
}
const endpoint =
  process.env.AI_GATEWAY_URL ??
  "https://ai-gateway.vercel.sh/v1/chat/completions";
const model = process.env.AI_GATEWAY_MODEL ?? "anthropic/claude-sonnet-5.5";

const selected = process.argv.slice(2);
await mkdir(outputDir, { recursive: true });

for (const demo of demos) {
  if (selected.length > 0 && !selected.includes(demo.id)) continue;
  console.log(`Recording ${demo.id} with ${model}`);

  const started = performance.now();
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      stream: true,
      temperature: 0.7,
      max_tokens: 16000,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: demo.prompt },
      ],
    }),
  });
  if (!response.ok || !response.body) {
    console.error(`${response.status} ${await response.text()}`);
    process.exit(1);
  }

  const chunks = [];
  const decoder = new TextDecoder();
  let pending = "";
  for await (const bytes of response.body) {
    pending += decoder.decode(bytes, { stream: true });
    const events = pending.split("\n");
    pending = events.pop() ?? "";
    for (const event of events) {
      if (!event.startsWith("data:")) continue;
      const data = event.slice(5).trim();
      if (data === "[DONE]") continue;
      const text = JSON.parse(data).choices?.[0]?.delta?.content;
      if (text) {
        chunks.push({ t: Math.round(performance.now() - started), text });
      }
    }
  }

  const output = chunks.map((chunk) => chunk.text).join("");
  const lines = output.split("\n").filter((line) => line.trim().startsWith("{"));
  console.log(
    `  ${chunks.length} chunks, ${lines.length} patch lines, ${(chunks.at(-1)?.t ?? 0) / 1000}s`,
  );

  await writeFile(
    join(outputDir, `${demo.id}.json`),
    `${JSON.stringify(
      {
        id: demo.id,
        title: demo.title,
        prompt: demo.prompt,
        model,
        recordedAt: new Date().toISOString(),
        chunks,
      },
      null,
      1,
    )}\n`,
  );
}
