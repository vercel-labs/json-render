import { afterEach, describe, expect, it, vi } from "vitest";
import { MockLanguageModelV3, MockProviderV3 } from "ai/test";
import { z } from "zod";
import { createCompactResponse } from "./compact-response";
import { compactGeneration } from "./render/compact";

afterEach(() => vi.unstubAllGlobals());

function useModel(text: string, failure?: Error) {
  const model = new MockLanguageModelV3({
    doStream: async () => ({
      stream: new ReadableStream({
        start(controller) {
          controller.enqueue({ type: "stream-start", warnings: [] });
          controller.enqueue({ type: "text-start", id: "text" });
          for (let index = 0; index < text.length; index += 7)
            controller.enqueue({
              type: "text-delta",
              id: "text",
              delta: text.slice(index, index + 7),
            });
          if (failure) {
            controller.enqueue({ type: "error", error: failure });
          } else {
            controller.enqueue({ type: "text-end", id: "text" });
            controller.enqueue({
              type: "finish",
              finishReason: { unified: "stop", raw: "stop" },
              usage: {
                inputTokens: {
                  total: 12,
                  noCache: 12,
                  cacheRead: 0,
                  cacheWrite: 0,
                },
                outputTokens: { total: 5, text: 5, reasoning: 0 },
              },
            });
          }
          controller.close();
        },
      }),
    }),
  });
  vi.stubGlobal(
    "AI_SDK_DEFAULT_PROVIDER",
    new MockProviderV3({ languageModels: { "test/compact": model } }),
  );
  return model;
}

describe("compact generation response", () => {
  const fields = {
    children: [],
    slots: {},
    visible: null,
    on: null,
    watch: null,
    repeat: null,
  };
  it.each([undefined, null])(
    "accepts %s for defaulted props while streaming a nested layout",
    (empty) => {
      const document = {
        state: null,
        root: {
          ...fields,
          type: "Stack",
          props: {
            direction: { value: "vertical" },
            gap: { value: "md" },
            align: empty === undefined ? null : { value: null },
            justify: empty === undefined ? null : { value: null },
          },
          children: [
            {
              ...fields,
              type: "Card",
              props: {
                title: { value: "Welcome" },
                description: null,
                maxWidth: null,
                centered: null,
              },
              children: [
                {
                  ...fields,
                  type: "Text",
                  props: {
                    text: "Hello",
                    variant: empty === undefined ? null : { value: null },
                  },
                },
              ],
            },
          ],
        },
      };
      expect(
        z.fromJSONSchema(compactGeneration.jsonSchema).safeParse(document)
          .success,
      ).toBe(true);
      const compiler = compactGeneration.createCompiler();
      for (const character of JSON.stringify(document))
        compiler.push(character);
      expect(compiler.getResult().elements.e2?.props).toEqual({
        text: "Hello",
        ...(empty === undefined ? {} : { variant: null }),
      });
    },
  );

  it.each([
    { type: "Text", props: {} },
    {
      type: "Stack",
      props: {
        direction: null,
        gap: null,
        align: { value: "sideways" },
        justify: null,
      },
    },
    {
      type: "Stack",
      props: {
        direction: null,
        gap: null,
        align: null,
        justify: null,
        invented: true,
      },
    },
  ])("still rejects invalid component props: %j", (root) => {
    const document = { state: null, root: { ...fields, ...root } };
    expect(
      z.fromJSONSchema(compactGeneration.jsonSchema).safeParse(document)
        .success,
    ).toBe(false);
    expect(() =>
      compactGeneration.createCompiler().push(JSON.stringify(document)),
    ).toThrow();
  });

  it("streams exact model JSON into the real compiler and retains usage and follow-up context", async () => {
    const source = JSON.stringify({
      state: null,
      root: {
        ...fields,
        type: "Text",
        props: { text: "Updated\n雪", variant: { value: null } },
      },
    });
    const model = useModel(source);
    const previousSpec = {
      root: "old",
      elements: {
        old: { type: "Text", props: { text: "Before", variant: null } },
      },
    };
    const response = createCompactResponse(
      new Request("http://localhost/api/generate"),
      "Update the text",
      previousSpec,
      "test/compact",
      ["Keep the UI small."],
    );
    const events = (await response.text())
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line));
    const compiler = compactGeneration.createCompiler();
    let raw = "";
    for (const event of events) {
      if (event.__meta === "compact") {
        raw += event.text;
        compiler.push(event.text);
      }
    }
    expect(raw).toBe(source);
    expect(compiler.getResult()).toEqual({
      root: "e0",
      elements: {
        e0: {
          type: "Text",
          props: { text: "Updated\n雪", variant: null },
          children: [],
          slots: {},
        },
      },
    });
    expect(events.at(-1)).toMatchObject({
      __meta: "usage",
      promptTokens: 12,
      completionTokens: 5,
      totalTokens: 17,
    });
    const request = model.doStreamCalls[0]!;
    expect(request.providerOptions).toMatchObject({
      openai: { reasoningEffort: "none", strictJsonSchema: true },
    });
    expect(request.responseFormat?.type).toBe("json");
    expect(request.responseFormat).toHaveProperty("schema");
    expect(JSON.stringify(request.prompt)).toContain("Before");
    expect(JSON.stringify(request.prompt)).toContain("complete updated UI");
  });

  it("reports provider failure after a partial stream without claiming successful usage", async () => {
    const source = '{"root":{"type":"Text","props":';
    useModel(source, new Error("Provider failed"));
    const response = createCompactResponse(
      new Request("http://localhost/api/generate"),
      "Show text",
      undefined,
      "test/compact",
      [],
    );
    const events = (await response.text())
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line));
    const partial = events
      .filter((event) => event.__meta === "compact")
      .map((event) => event.text)
      .join("");
    expect(partial.length).toBeGreaterThan(0);
    expect(source.startsWith(partial)).toBe(true);
    expect(events.at(-1)).toEqual({
      __meta: "error",
      message: "Provider failed",
    });
    expect(events.some((event) => event.__meta === "usage")).toBe(false);
  });

  it("rejects invalid requests before contacting the provider", () => {
    const model = useModel("");
    for (const [prompt, previousSpec] of [
      ["", undefined],
      ["Hello", {}],
    ]) {
      const response = createCompactResponse(
        new Request("http://localhost/api/generate"),
        prompt,
        previousSpec,
        "test/compact",
        [],
      );
      expect(response.status).toBe(400);
    }
    expect(model.doStreamCalls).toHaveLength(0);
  });
});
