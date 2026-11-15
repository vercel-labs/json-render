# @json-render/chat

Chat SDK renderer for json-render. An agent picks components from a catalog, and the spec renders as a native card on every Chat SDK adapter: Block Kit on Slack, Adaptive Cards on Teams, and the card format of each other platform.

## Install

```bash
npm install @json-render/core @json-render/chat chat zod
```

## Usage

```ts
import { defineCatalog } from "@json-render/core";
import {
  schema,
  standardComponentDefinitions,
  streamCard,
} from "@json-render/chat";
import { streamText } from "ai";

const catalog = defineCatalog(schema, {
  components: standardComponentDefinitions,
});

chat.onNewMention(async (thread, message) => {
  const result = streamText({
    model: "anthropic/claude-haiku-4.5",
    system: catalog.prompt(),
    prompt: message.text,
  });
  await streamCard(thread, result.textStream);
});
```

`streamCard` posts the card as soon as its root exists, edits it as elements arrive, and finishes with a validated card. Use `toCard(spec)` to convert a complete spec without streaming.

## Components

`Card` is the root. Inside it you can use `Section`, `Text`, `Fields` and `Field`, `Table`, `Chart` (pie, bar, line, area), `Divider`, `Image`, and `Actions` with `Button` and `LinkButton`. Additional portable components include `Columns`, `Carousel`, `TaskList` with `Task`, `Feedback`, `Link`, and `Actions` with `Select` and `RadioSelect`. Each component maps to Chat SDK elements.

## Portable composition

Use `Columns` and `Carousel` to group `Section` or nested `Card` items. They produce ordinary Chat SDK sections with a layout hint. Adapters that do not support the hint keep their existing vertical rendering; all items remain in source order. Native rendering of these hints is proposed in [Chat SDK PR #1126](https://github.com/vercel/chat/pull/1126). The released adapters currently used here stack the items; this package does not require an unreleased SDK dependency.

`Actions` also accepts `Select` and `RadioSelect`. Each takes `id`, `label`, `options` (objects with `label`, `value`, and optional `description`), optional `initialOption`, `optional`, and `dispatchAction`. Option values must be unique, and `initialOption` must match one of them. Interaction and submission behavior follow the adapter: Slack reports selections as actions, Teams uses its card submission flow, and support on other platforms follows Chat SDK and the adapter configuration. For example, Discord select controls require Components V2; the existing Embeds format does not render them.

`Feedback` produces ordinary buttons with action IDs `<id>:positive` and `<id>:negative`, and values `positive` and `negative`. Optional `label`, `positiveLabel`, and `negativeLabel` customize their text. Handle these through Chat SDK's normal action handlers.

`TaskList` holds `Task` children and accepts an optional `title`. Tasks take `title`, `status` (`pending`, `in_progress`, `complete`, or `error`), and optional `details` and `output`. They render as text sections representing a snapshot. For a live plan with lifecycle methods, use Chat SDK's `Plan` API directly. `Link` takes `label` and `url` and renders an inline link.

```json
{
  "root": "report",
  "elements": {
    "report": { "type": "Card", "props": { "title": "Deployment" }, "children": ["tasks", "rating"] },
    "tasks": { "type": "TaskList", "props": { "title": "Progress" }, "children": ["build"] },
    "build": { "type": "Task", "props": { "title": "Build", "status": "complete", "output": "Build passed" }, "children": [] },
    "rating": { "type": "Feedback", "props": { "id": "deployment-rating", "label": "Was this helpful?" }, "children": [] }
  }
}
```

Post these specs with `thread.post(toCard(spec))`, or use `streamCard` to stream them. State expressions, visibility, repeats, validation, and expansion budgets apply as for the existing components. Nested cards retain their title, subtitle, image, and children. A `Columns`, `Carousel`, or untitled `TaskList` with no visible children is omitted.

## State and repeat

`toCard` resolves `$state`, `$item`, `$index`, and `$template` expressions against `spec.state`, honors `visible` conditions, and expands `repeat`. Selections report events to the bot; `$bindState` and `$bindItem` do not create local form state. Expansion stops at `maxElements` (1000 elements and table rows by default).

## Validation and limits

`toCard` validates the props of every element and the structure of the spec, and throws `CardSpecError` with one issue per problem, so you can send the issues back to the model.

Platforms cap what a message can hold, and Chat SDK adapters degrade content past those caps. Pass `limits` to reject the spec instead:

```ts
toCard(spec, { limits: { tables: 1, charts: 2 } });
```
