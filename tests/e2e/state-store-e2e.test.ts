import { describe, it, expect } from "vitest";
import { streamText } from "ai";
import { z } from "zod";
import {
  defineCatalog,
  buildUserPrompt,
  createStateStore,
  createSpecStreamCompiler,
  type Spec,
  type StateStore,
} from "@json-render/core";
import { schema } from "@json-render/react/schema";
import { reduxStateStore } from "@json-render/redux";
import { zustandStateStore } from "@json-render/zustand";
import { jotaiStateStore } from "@json-render/jotai";
import { configureStore, createSlice } from "@reduxjs/toolkit";
import { createStore as createZustandStore } from "zustand/vanilla";
import { atom } from "jotai";
import { createStore as createJotaiStore } from "jotai/vanilla";

const HAS_API_KEY = !!process.env.AI_GATEWAY_API_KEY;

const catalog = defineCatalog(schema, {
  components: {
    Text: {
      props: z.object({ content: z.string() }),
      description: "Text content",
    },
    Input: {
      props: z.object({
        label: z.string().nullable(),
        value: z.string().nullable(),
        placeholder: z.string().nullable(),
      }),
      description:
        "Text input. Use value with $bindState for two-way state binding.",
      example: {
        label: "Name",
        value: { $bindState: "/form/name" },
        placeholder: "Enter name",
      },
    },
    Button: {
      props: z.object({
        label: z.string(),
        action: z.string().nullable(),
      }),
      description: "Clickable button",
    },
    Stack: {
      props: z.object({
        direction: z.enum(["horizontal", "vertical"]).nullable(),
      }),
      slots: ["default"],
      description: "Layout container",
    },
  },
  actions: {},
});

async function generateSpec(): Promise<Spec> {
  const prompt = buildUserPrompt({
    prompt:
      "Create a simple form with two text inputs bound to state: one for /form/name and one for /form/email. Include initial state with name set to 'Alice' and email set to 'alice@example.com'. Use a vertical Stack as the container.",
  });

  const result = streamText({
    model: "anthropic/claude-haiku-4.5",
    system: catalog.prompt(),
    prompt,
    temperature: 0,
  });

  const compiler = createSpecStreamCompiler<Spec>();

  for await (const chunk of result.textStream) {
    compiler.push(chunk);
  }

  return compiler.getResult();
}

function extractStatePaths(spec: Spec): string[] {
  const paths: string[] = [];

  function walk(obj: unknown) {
    if (obj === null || obj === undefined) return;
    if (typeof obj !== "object") return;
    if (Array.isArray(obj)) {
      for (const item of obj) walk(item);
      return;
    }
    const record = obj as Record<string, unknown>;
    if ("$bindState" in record && typeof record.$bindState === "string") {
      paths.push(record.$bindState);
    }
    if ("$state" in record && typeof record.$state === "string") {
      paths.push(record.$state);
    }
    for (const value of Object.values(record)) {
      walk(value);
    }
  }

  if (spec.elements) walk(spec.elements);
  return [...new Set(paths)];
}

function flattenState(
  obj: Record<string, unknown>,
  prefix = "",
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    const pointer = `${prefix}/${key}`;
    if (
      value !== null &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      Object.getPrototypeOf(value) === Object.prototype
    ) {
      Object.assign(
        result,
        flattenState(value as Record<string, unknown>, pointer),
      );
    } else {
      result[pointer] = value;
    }
  }
  return result;
}

function verifyStoreRoundTrip(store: StateStore, spec: Spec) {
  if (spec.state) {
    const flat = flattenState(spec.state);
    store.update(flat);
  }

  const paths = extractStatePaths(spec);
  expect(paths.length).toBeGreaterThan(0);

  for (const path of paths) {
    const original = store.get(path);
    const testValue = `test-${Date.now()}`;

    store.set(path, testValue);
    expect(store.get(path)).toBe(testValue);

    store.set(path, original);
    expect(store.get(path)).toBe(original);
  }

  const batchUpdate: Record<string, unknown> = {};
  for (const path of paths) {
    batchUpdate[path] = `batch-${Date.now()}`;
  }
  store.update(batchUpdate);
  for (const path of paths) {
    expect(store.get(path)).toBe(batchUpdate[path]);
  }
}

describe.skipIf(!HAS_API_KEY)(
  "e2e: Claude Haiku 4.5 + StateStore adapters",
  () => {
    let spec: Spec;

    it("generates a valid spec with state bindings from Claude Haiku 4.5", async () => {
      spec = await generateSpec();

      expect(spec.root).toBeTruthy();
      expect(spec.elements).toBeTruthy();
      expect(Object.keys(spec.elements).length).toBeGreaterThan(0);

      const paths = extractStatePaths(spec);
      expect(paths.length).toBeGreaterThan(0);
    });

    it("works with createStateStore (built-in)", () => {
      const store = createStateStore(spec.state ?? {});
      verifyStoreRoundTrip(store, spec);
    });

    it("works with reduxStateStore (Redux Toolkit)", () => {
      const uiSlice = createSlice({
        name: "ui",
        initialState: (spec.state ?? {}) as Record<string, unknown>,
        reducers: {
          replace: (_state, action) => action.payload,
        },
      });

      const reduxStore = configureStore({
        reducer: { ui: uiSlice.reducer },
      });

      const store = reduxStateStore({
        store: reduxStore,
        selector: (state) => state.ui as Record<string, unknown>,
        dispatch: (next, s) => s.dispatch(uiSlice.actions.replace(next)),
      });

      verifyStoreRoundTrip(store, spec);
    });

    it("works with zustandStateStore (Zustand)", () => {
      const zStore = createZustandStore<Record<string, unknown>>()(
        () => spec.state ?? {},
      );
      const store = zustandStateStore({ store: zStore });
      verifyStoreRoundTrip(store, spec);
    });

    it("works with jotaiStateStore (Jotai)", () => {
      const stateAtom = atom<Record<string, unknown>>(spec.state ?? {});
      const jStore = createJotaiStore();
      const store = jotaiStateStore({ atom: stateAtom, store: jStore });
      verifyStoreRoundTrip(store, spec);
    });
  },
);
