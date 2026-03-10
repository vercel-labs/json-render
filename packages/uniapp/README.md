# @json-render/uniapp

UniApp renderer for [@json-render/core](https://github.com/vercel-labs/json-render). JSON becomes UniApp components.

## Install

```bash
npm install @json-render/uniapp
# or
pnpm add @json-render/uniapp
```

## Usage

### 1. Define a catalog

```ts
import { z } from "zod";
import { schema } from "@json-render/uniapp/schema";

const catalog = schema.createCatalog({
    components: {
        View: {
            props: z.object({ style: z.string().optional() }),
            slots: ["default"],
            description: "A container view component",
        },
        Text: {
            props: z.object({ content: z.string(), style: z.string().optional() }),
            slots: [],
            description: "Displays text",
        },
        Button: {
            props: z.object({ label: z.string(), type: z.enum(["default", "primary", "warn"]).optional() }),
            slots: [],
            description: "A tappable button",
        },
    },
});
```

### 2. Create a renderer

```ts
import { h } from "vue";
import { createRenderer } from "@json-render/uniapp";

const MyRenderer = createRenderer(catalog, {
    View: ({ props, children }) => h("view", { style: props.style }, children),

    Text: ({ props }) => h("text", { style: props.style }, props.content),

    Button: ({ props, emit }) =>
        h(
            "button",
            {
                type: props.type ?? "default",
                onTap: () => emit("tap"),
            },
            props.label,
        ),
});
```

### 3. Use in your UniApp page

```vue
<template>
    <MyRenderer :spec="spec" :state="state" />
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useUIStream } from "@json-render/uniapp";

const { spec, isStreaming, send } = useUIStream({ api: "/api/gen-ui" });
const state = ref({});

send("Create a simple greeting card");
</script>
```

## Navigation Actions

In addition to the standard actions (`setState`, `pushState`, `removeState`, `validateForm`), the UniApp renderer provides UniApp-native navigation actions:

| Action         | Params               | Description                           |
| -------------- | -------------------- | ------------------------------------- |
| `navigateTo`   | `{ url: string }`    | Push a new page (uni.navigateTo)      |
| `navigateBack` | `{ delta?: number }` | Go back (uni.navigateBack)            |
| `redirectTo`   | `{ url: string }`    | Replace current page (uni.redirectTo) |
| `switchTab`    | `{ url: string }`    | Switch to a tab page (uni.switchTab)  |

## Confirmation Dialogs

Unlike the Vue package which renders an HTML overlay, the UniApp renderer uses `uni.showModal()` for confirmation dialogs. This provides a native-looking dialog on all supported platforms.

## Platform Support

| Feature                     | H5  | WeChat MP | Alipay MP | Other MP |
| --------------------------- | --- | --------- | --------- | -------- |
| Rendering                   | ✓   | ✓         | ✓         | ✓        |
| State management            | ✓   | ✓         | ✓         | ✓        |
| Streaming (useUIStream)     | ✓   | -         | -         | -        |
| Non-streaming (useUIStream) | ✓   | ✓         | ✓         | ✓        |
| Navigation actions          | ✓   | ✓         | ✓         | ✓        |
| Confirm dialogs             | ✓   | ✓         | ✓         | ✓        |

> On mini program platforms, `useUIStream` and `useChatUI` fall back to `uni.request` which returns the full response at once instead of streaming.
