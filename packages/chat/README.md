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

bot.onNewMention(async (thread, message) => {
  const result = streamText({
    model: "anthropic/claude-haiku-4.5",
    instructions: catalog.prompt(),
    prompt: message.text,
  });
  await streamCard(thread, result.textStream);
});
```

`streamCard` posts the card as soon as its root exists, edits it as elements arrive, and finishes with a validated card. Use `toCard(spec)` to convert a complete spec without streaming.

## Components

`Card` is the root. Inside it you can use `Section`, `Text`, `Fields` and `Field`, `Table`, `Chart` (pie, bar, line, area), `Divider`, `Image`, and `Actions` with `Button` and `LinkButton`. Each one maps to a Chat SDK card element.

## Validation and limits

`toCard` validates the props of every element and the structure of the spec, and throws `CardSpecError` with one issue per problem, so you can send the issues back to the model.

Platforms cap what a message can hold, and Chat SDK adapters degrade content past those caps. Pass `limits` to reject the spec instead:

```ts
toCard(spec, { limits: { tables: 1, charts: 2 } });
```
