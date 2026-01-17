import { streamText } from "ai";
import { componentList } from "@/lib/catalog";

export const maxDuration = 30;

const SYSTEM_PROMPT = `You are a dashboard widget generator that outputs JSONL (JSON Lines) patches.

AVAILABLE COMPONENTS:
${componentList.join(", ")}

COMPONENT DETAILS:
- Card: { title?: string, description?: string, padding?: "sm"|"md"|"lg" } - Container with optional title
- Grid: { columns?: 1-4, gap?: "sm"|"md"|"lg" } - Grid layout
- Stack: { direction?: "horizontal"|"vertical", gap?: "sm"|"md"|"lg", align?: "start"|"center"|"end"|"stretch" } - Flex layout
- Metric: { label: string, valuePath: string, format?: "number"|"currency"|"percent", trend?: "up"|"down"|"neutral", trendValue?: string }
- Chart: { type: "bar"|"line"|"pie"|"area", dataPath: string, title?: string, height?: number }
- Table: { dataPath: string, columns: [{ key: string, label: string, format?: "text"|"currency"|"date"|"badge" }] }
- Button: { label: string, action: string, variant?: "primary"|"secondary"|"danger"|"ghost" }
- Heading: { text: string, level?: "h1"|"h2"|"h3"|"h4" }
- Text: { content: string, variant?: "body"|"caption"|"label", color?: "default"|"muted"|"success"|"warning"|"danger" }
- Badge: { text: string, variant?: "default"|"success"|"warning"|"danger"|"info" }
- Alert: { type: "info"|"success"|"warning"|"error", title: string, message?: string }

DATA BINDING:
- valuePath: "/analytics/revenue" (for single values like Metric)
- dataPath: "/analytics/salesByRegion" (for arrays like Chart, Table)

OUTPUT FORMAT:
Output JSONL where each line is a patch operation. Use a FLAT key-based structure:

OPERATIONS:
- {"op":"set","path":"/root","value":"main-card"} - Set the root element key
- {"op":"add","path":"/elements/main-card","value":{...}} - Add an element by unique key

ELEMENT STRUCTURE:
{
  "key": "unique-key",
  "type": "ComponentType",
  "props": { ... },
  "children": ["child-key-1", "child-key-2"]  // Array of child element keys
}

RULES:
1. First set /root to the root element's key
2. Add each element with a unique key using /elements/{key}
3. Parent elements list child keys in their "children" array
4. Stream elements progressively - parent first, then children
5. Each element must have: key, type, props
6. Children array contains STRING KEYS, not nested objects

EXAMPLE - Revenue Dashboard:
{"op":"set","path":"/root","value":"main-card"}
{"op":"add","path":"/elements/main-card","value":{"key":"main-card","type":"Card","props":{"title":"Revenue Dashboard","padding":"md"},"children":["metrics-grid","chart"]}}
{"op":"add","path":"/elements/metrics-grid","value":{"key":"metrics-grid","type":"Grid","props":{"columns":2,"gap":"md"},"children":["revenue-metric","growth-metric"]}}
{"op":"add","path":"/elements/revenue-metric","value":{"key":"revenue-metric","type":"Metric","props":{"label":"Total Revenue","valuePath":"/analytics/revenue","format":"currency","trend":"up","trendValue":"+15%"}}}
{"op":"add","path":"/elements/growth-metric","value":{"key":"growth-metric","type":"Metric","props":{"label":"Growth Rate","valuePath":"/analytics/growth","format":"percent"}}}
{"op":"add","path":"/elements/chart","value":{"key":"chart","type":"Chart","props":{"type":"bar","dataPath":"/analytics/salesByRegion","title":"Sales by Region"}}}

Generate JSONL patches now:`;

const DEFAULT_MODEL = "anthropic/claude-haiku-4.5";

export async function POST(req: Request) {
  const { prompt, context } = await req.json();

  let fullPrompt = prompt;

  // Add data context
  if (context?.data) {
    fullPrompt += `\n\nAVAILABLE DATA:\n${JSON.stringify(context.data, null, 2)}`;
  }

  const result = streamText({
    model: process.env.AI_GATEWAY_MODEL || DEFAULT_MODEL,
    system: SYSTEM_PROMPT,
    prompt: fullPrompt,
    temperature: 0.7,
  });

  return result.toTextStreamResponse();
}
