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

`Card` is the root. Inside it you can use `Section`, `Text`, `Fields` and `Field`, `Table`, `Chart` (pie, bar, line, area), `Divider`, `Image`, and `Actions` with `Button` and `LinkButton`. Each one maps to a Chat SDK card element.

## State and repeat

`toCard` resolves `$state`, `$item`, `$index`, and `$template` expressions against `spec.state`, honors `visible` conditions, and expands `repeat`. A posted message has no inputs, so `$bindState` and `$bindItem` have no effect. Expansion stops at `maxElements` (1000 elements and table rows by default).

## Validation and limits

`toCard` validates the props of every element and the structure of the spec, and throws `CardSpecError` with one issue per problem, so you can send the issues back to the model.

Platforms cap what a message can hold, and Chat SDK adapters degrade content past those caps. Pass `limits` to reject the spec instead:

```ts
toCard(spec, { limits: { tables: 1, charts: 2 } });
```

## Native Slack Block Kit

Use `slackSchema`, `slackComponentDefinitions`, and `toSlackBlocks` for Slack-specific content. The native catalog adds message blocks that the portable card model cannot express: native cards and carousels, titled containers, multi-column layouts, context actions, plans, and task cards. It also exposes native versions of the existing message blocks, including data tables and data visualizations. See the [Slack Block Kit reference](https://docs.slack.dev/reference/block-kit/blocks/) for their payloads.

```ts
import { defineCatalog, type Spec } from "@json-render/core";
import {
  slackSchema,
  slackComponentDefinitions,
  toSlackBlocks,
} from "@json-render/chat";

const catalog = defineCatalog(slackSchema, {
  components: slackComponentDefinitions,
});

const spec: Spec = {
  root: "message",
  elements: {
    message: { type: "SlackMessage", props: {}, children: ["status"] },
    status: {
      type: "SlackSection",
      props: {
        text: { type: "plain_text", text: "Deployment complete" },
      },
      children: [],
    },
  },
};

const blocks = toSlackBlocks(spec);
```

Pass `catalog.prompt()` to your model to generate native specs. With an existing Slack adapter, post the blocks through its Web API client:

```ts
await slack.webClient.chat.postMessage({
  channel: "C123",
  text: "Deployment complete",
  blocks,
});
```

The root is `SlackMessage`. Native block names use a `Slack` prefix: `SlackActions`, `SlackCard`, `SlackCarousel`, `SlackContainer`, `SlackContextActions`, `SlackContext`, `SlackDataTable`, `SlackDataVisualization`, `SlackDivider`, `SlackHeader`, `SlackImage`, `SlackLayout`, `SlackPlan`, `SlackSection`, `SlackTable`, and `SlackTaskCard`.

Each block is a leaf with `children: []`. Put nested elements and composition objects directly in `props`, using Slack's field names and nested `type` values. Buttons, select and multi-select menus, pickers, feedback controls, workflow buttons, and composition objects retain their native payloads. Rich text can still appear inside native payloads, such as task details and table cells. Unknown native fields are preserved. The component supplies the outer block's `type`; omit it from `props`.

Use `SlackGroup` to group blocks or repeat children over state. `$state`, `$item`, `$index`, `$template`, `visible`, and group `repeat` resolve before conversion. `maxElements` defaults to 1000 expanded spec elements. `maxBlocks` defaults to 50 top-level blocks. These budgets do not count native objects nested inside props; Slack enforces their limits.

`toSlackBlocks` throws `CardSpecError` for invalid block props, missing elements, cycles, invalid nesting, or an exceeded budget. Nested native objects are retained as JSON; Slack validates their component-specific rules, surface eligibility, and aggregate limits. Each source element must have a single child reference; use `SlackGroup` to repeat blocks. Native blocks go directly to Slack's Web API and cannot be passed to `thread.post()` or `streamCard()`.

The message catalog intentionally omits `alert`, `file`, and `input` blocks: [alerts are modal-only](https://docs.slack.dev/reference/block-kit/blocks/alert-block/), files require Slack's remote-files API, and input blocks belong to modal/Home views. Dedicated `markdown`, `rich_text`, and `video` components are also outside this catalog's scope.
