import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { createCompactGeneration } from "../src/compact-generation";
import type { Spec } from "../src/types";

interface Options {
  api: string;
  onComplete: (spec: Spec) => void;
  onError: (error: Error) => void;
}
export function testCompactStream(
  name: string,
  mount: (options: Options) => {
    send: (prompt: string, context?: Record<string, unknown>) => Promise<void>;
    spec: () => Spec | null;
    dispose: () => void;
  },
) {
  const generation = createCompactGeneration({
    components: {
      Panel: { props: z.object({}), slots: ["default", "heading / title"] },
      Text: { props: z.object({ text: z.string() }) },
    },
  });
  describe(`${name} schema generation through the stock transport`, () => {
    let dispose: (() => void) | undefined;
    afterEach(() => {
      dispose?.();
      vi.unstubAllGlobals();
    });
    it("streams nested content, named slots and UTF-8, then accepts JSONL edits", async () => {
      const onComplete = vi.fn(),
        onError = vi.fn();
      let controller!: ReadableStreamDefaultController<string>;
      const fetch = vi.fn(
        async () =>
          new Response(
            new ReadableStream<string>({
              start(c) {
                controller = c;
              },
            })
              .pipeThrough(generation.createTransform())
              .pipeThrough(new TextEncoderStream()),
          ),
      );
      vi.stubGlobal("fetch", fetch);
      const stream = mount({ api: "/generate", onComplete, onError });
      dispose = stream.dispose;
      const sending = stream.send("Create a UI");
      await vi.waitFor(() => expect(controller).toBeDefined());
      controller.enqueue(
        '{"state":{"entries":[["title","雪"]]},"root":["Panel",[],[["Text",[{"$state":"/title"}]]',
      );
      await vi.waitFor(() =>
        expect(stream.spec()?.elements.e1?.props.text).toEqual({
          $state: "/title",
        }),
      );
      expect(onComplete).not.toHaveBeenCalled();
      for (const char of '],{"heading / title":[["Text",["Heading"]]]}]}')
        controller.enqueue(char);
      controller.close();
      await sending;
      expect(onError).not.toHaveBeenCalled();
      expect(onComplete).toHaveBeenCalledOnce();
      expect(onComplete.mock.calls[0]?.[0]).toEqual({
        root: "e0",
        state: { title: "雪" },
        elements: {
          e0: {
            type: "Panel",
            props: {},
            children: ["e1"],
            slots: { "heading / title": ["e2"] },
          },
          e1: { type: "Text", props: { text: { $state: "/title" } } },
          e2: { type: "Text", props: { text: "Heading" } },
        },
      });
      await vi.waitFor(() =>
        expect(stream.spec()).toEqual(onComplete.mock.calls[0]?.[0]),
      );
      fetch.mockImplementationOnce(
        async () =>
          new Response(
            new ReadableStream({
              start(c) {
                for (const byte of new TextEncoder().encode(
                  '{"op":"replace","path":"/elements/e2/props/text","value":"更新"}',
                ))
                  c.enqueue(Uint8Array.of(byte));
                c.close();
              },
            }),
          ),
      );
      await stream.send("Edit the heading", { previousSpec: stream.spec()! });
      expect(onError).not.toHaveBeenCalled();
      await vi.waitFor(() =>
        expect(stream.spec()?.elements.e2?.props.text).toBe("更新"),
      );
    });
    it("reports a truncated generation instead of completing a partial spec", async () => {
      const onComplete = vi.fn(),
        onError = vi.fn();
      vi.stubGlobal(
        "fetch",
        vi.fn(
          async () =>
            new Response(
              new ReadableStream<string>({
                start(c) {
                  c.enqueue('{"state":null,"root":["Text",["Incomplete"]');
                  c.close();
                },
              })
                .pipeThrough(generation.createTransform())
                .pipeThrough(new TextEncoderStream()),
            ),
        ),
      );
      const stream = mount({ api: "/generate", onComplete, onError });
      dispose = stream.dispose;
      await stream.send("Create a UI");
      expect(onError).toHaveBeenCalledOnce();
      expect(onComplete).not.toHaveBeenCalled();
    });
  });
}
