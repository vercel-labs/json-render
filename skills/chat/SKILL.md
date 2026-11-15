---
name: chat
description: Chat SDK renderer for json-render that turns JSON specs into native chat cards (Block Kit on Slack, Adaptive Cards on Teams, and the card format of other Chat SDK adapters). Use when working with @json-render/chat, building bots that post rich messages with tables, charts, fields, or buttons, streaming a generated card into a chat thread, or when the user mentions Chat SDK, Slack Block Kit, or Teams Adaptive Cards together with json-render.
metadata:
  tags: chat, chat-sdk, slack, block-kit, teams, adaptive-cards, discord, json-render
---

# @json-render/chat

Renders json-render specs as Chat SDK `CardElement` objects. Each Chat SDK adapter converts the card to its platform format.

## Quick start

```typescript
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

`streamCard(target, textStream, options)` posts the card once the root exists, edits it every `updateIntervalMs` (default 500) as elements arrive, and finishes with a validated card. `toCard(spec, options)` converts a complete spec. `toPartialCard(spec)` returns a best-effort card for a streaming spec, or `null` before the root exists.

## Spec structure

Same flat tree as other renderers: `root` plus `elements`, with optional `state`. The root must be a `Card`. An inner `Card` renders as a titled section, because chat cards cannot nest.

Standard components: `Card`, `Section`, `Text` (markdown), `Fields` with `Field`, `Table`, `Chart` (`pie` with `segments`, or `bar`, `line`, `area` with `categories` and `series[].values`), `Divider`, `Image`, and `Actions` with `Button` and `LinkButton`.

```json
{
  "root": "card",
  "elements": {
    "card": {
      "type": "Card",
      "props": { "title": "Weekly deploys" },
      "children": ["kpis", "chart"]
    },
    "kpis": { "type": "Fields", "props": {}, "children": ["total"] },
    "total": {
      "type": "Field",
      "props": { "label": "Deploys", "value": "985" },
      "children": []
    },
    "chart": {
      "type": "Chart",
      "props": {
        "title": "Deploys per day",
        "chart": {
          "type": "bar",
          "categories": ["Mon", "Tue"],
          "series": [{ "name": "Deploys", "values": [180, 210] }]
        }
      },
      "children": []
    }
  }
}
```

## State, repeat, and visibility

`$state`, `$item`, `$index`, and `$template` resolve against `spec.state`. `visible` conditions drop elements. `repeat` renders an element's children once per item. A repeated `Table` expands its rows as a template, and object rows map to headers by key name. Selections report events to the bot; `$bindState` and `$bindItem` do not create local form state. Expansion stops at `maxElements` (default 1000 elements and table rows); `toCard` throws past it.

## Validation and limits

`toCard` throws `CardSpecError` with an `issues` array (one entry per problem). Send the issues back to the model to repair the spec. Pass `limits` to reject specs that a platform would degrade, for example `{ tables: 1, charts: 2 }` for Slack. Available limits: `tables`, `charts`, `fields`, `tableRows`, `tableColumns`, `chartTitle`, `chartLabel`, `chartSeries`, `chartPoints`.

## Portable composition

`Columns` and `Carousel` hold `Section` or nested `Card` items and emit section layout hints. Older or unsupported adapters render the same items vertically. Native layouts depend on adapter support and valid platform-specific content; do not promise identical presentation across platforms.

`Actions` accepts `Select` and `RadioSelect`, with `id`, `label`, `options` (`label`, `value`, optional `description`), optional `initialOption`, `optional`, and `dispatchAction`. Values must be unique; initial selections must exist. Use the adapter's normal action/submission handlers, including Teams' card submission flow. Control availability and fallback behavior depend on the adapter and its configuration.

`TaskList` contains `Task` elements. A task has `title`, `status` (`pending`, `in_progress`, `complete`, `error`), and optional `details` and `output`; it renders a text snapshot, not a live SDK Plan. `Feedback` has `id`, optional `label`, `positiveLabel`, and `negativeLabel`; its buttons use `<id>:positive` and `<id>:negative` action IDs and corresponding values. `Link` takes `label` and `url`.

All of these use `toCard`/`streamCard` and the shared catalog. Nested Card images are retained. Empty layouts and untitled empty task lists are pruned. Do not send native Slack payloads to these portable APIs.

## Runtime

The renderer imports `chat` for types only, so it runs in the browser and on the server. Convert a card for a specific platform with the adapter, for example `cardToSlackBlocks` from `@chat-adapter/slack/blocks` or `cardToAdaptiveCard` from `@chat-adapter/teams/cards`.
