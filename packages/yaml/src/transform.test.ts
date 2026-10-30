import { describe, it, expect } from "vitest";
import { SPEC_DATA_PART_TYPE, type StreamChunk } from "@json-render/core";
import { createYamlTransform } from "./transform";

/** Helper: feed text chunks through the transform and collect output. */
async function runTransform(
  lines: string[],
  options?: Parameters<typeof createYamlTransform>[0],
): Promise<StreamChunk[]> {
  const transform = createYamlTransform(options);
  const output: StreamChunk[] = [];

  // Build input chunks
  const inputChunks: StreamChunk[] = [
    { type: "text-start", id: "1" },
    ...lines.map((l) => ({ type: "text-delta" as const, id: "1", delta: l })),
    { type: "text-end", id: "1" },
  ];

  // Create a readable from the input chunks and pipe through
  const input = new ReadableStream<StreamChunk>({
    start(controller) {
      for (const chunk of inputChunks) {
        controller.enqueue(chunk);
      }
      controller.close();
    },
  });

  const outputStream = input.pipeThrough(transform);
  const reader = outputStream.getReader();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    output.push(value);
  }

  return output;
}

function extractPatches(output: StreamChunk[]) {
  return output
    .filter((c) => c.type === SPEC_DATA_PART_TYPE)
    .map((c) => (c as { data: { type: string; patch: unknown } }).data.patch);
}

function extractText(output: StreamChunk[]) {
  return output
    .filter((c) => c.type === "text-delta")
    .map((c) => (c as { delta: string }).delta)
    .join("");
}

describe("createYamlTransform", () => {
  it("passes through plain text outside fences", async () => {
    const output = await runTransform(["Hello world\n", "How are you?\n"]);
    const text = extractText(output);
    expect(text).toContain("Hello world");
    expect(text).toContain("How are you?");
  });

  it("parses yaml-spec fence into patches", async () => {
    const output = await runTransform([
      "Here is your UI:\n",
      "```yaml-spec\n",
      "root: main\n",
      "elements:\n",
      "  main:\n",
      "    type: Card\n",
      "    props:\n",
      "      title: Dashboard\n",
      "    children: []\n",
      "```\n",
    ]);

    const patches = extractPatches(output);
    expect(patches.length).toBeGreaterThan(0);

    // Should have patched the root
    const rootPatch = patches.find(
      (p: any) => p.path === "/root" && p.value === "main",
    );
    expect(rootPatch).toBeDefined();

    // Text before the fence should pass through
    const text = extractText(output);
    expect(text).toContain("Here is your UI:");
  });

  it("parses yaml-edit fence with merge semantics", async () => {
    const previousSpec = {
      root: "main",
      elements: {
        main: {
          type: "Card",
          props: { title: "Old Title" },
          children: [],
        },
      },
    };

    // Only send a yaml-edit block — previousSpec is the base
    const output = await runTransform(
      [
        "```yaml-edit\n",
        "elements:\n",
        "  main:\n",
        "    props:\n",
        "      title: New Title\n",
        "```\n",
      ],
      { previousSpec: previousSpec as any },
    );

    const patches = extractPatches(output);

    // Should have at least one patch
    expect(patches.length).toBeGreaterThan(0);

    // Should include a patch that updates the title — could be at
    // the leaf level or replacing the whole props object
    const hasTitleUpdate = patches.some(
      (p: any) =>
        (p.path === "/elements/main/props/title" && p.value === "New Title") ||
        (p.path === "/elements/main/props" &&
          (p.value as any)?.title === "New Title"),
    );
    expect(hasTitleUpdate).toBe(true);
  });

  it("applies yaml-patch moves before later yaml-edit fences", async () => {
    const output = await runTransform([
      "```yaml-patch\n",
      '{"op":"add","path":"/a","value":1}\n',
      "```\n",
      "```yaml-patch\n",
      '{"op":"move","from":"/a","path":"/b"}\n',
      "```\n",
      "```yaml-edit\n",
      "b: null\n",
      "```\n",
    ]);

    expect(extractPatches(output)).toEqual([
      { op: "add", path: "/a", value: 1 },
      { op: "move", from: "/a", path: "/b" },
      { op: "remove", path: "/b" },
    ]);
  });

  it("applies yaml-patch copies before later yaml-edit fences", async () => {
    const output = await runTransform([
      "```yaml-patch\n",
      '{"op":"add","path":"/a","value":1}\n',
      "```\n",
      "```yaml-patch\n",
      '{"op":"copy","from":"/a","path":"/b"}\n',
      "```\n",
      "```yaml-edit\n",
      "b: null\n",
      "```\n",
    ]);

    expect(extractPatches(output)).toEqual([
      { op: "add", path: "/a", value: 1 },
      { op: "copy", from: "/a", path: "/b" },
      { op: "remove", path: "/b" },
    ]);
  });

  it("does not mutate emitted array values when a later patch moves items", async () => {
    const output = await runTransform([
      "```yaml-patch\n",
      '{"op":"add","path":"/l","value":[1,2,3]}\n',
      '{"op":"move","from":"/l/0","path":"/l/-"}\n',
      "```\n",
    ]);

    expect(extractPatches(output)[0]).toEqual({
      op: "add",
      path: "/l",
      value: [1, 2, 3],
    });
  });

  it("drops copy patches that would grow the working spec past its limit", async () => {
    const copies = Array.from(
      { length: 40 },
      (_, i) => `{"op":"copy","from":"/a","path":"/a/c${i}"}\n`,
    );
    const output = await runTransform([
      "```yaml-patch\n",
      '{"op":"add","path":"/a","value":{"v":1}}\n',
      ...copies,
      "```\n",
    ]);

    const emitted = (extractPatches(output) as { op: string }[]).filter(
      (p) => p.op === "copy",
    );
    expect(emitted.length).toBeGreaterThan(0);
    expect(emitted.length).toBeLessThan(40);
  });

  it("drops copy patches once copied strings pass the byte budget", async () => {
    const big = "x".repeat(16 * 1024);
    const copies = Array.from(
      { length: 200 },
      (_, i) => `{"op":"copy","from":"/a","path":"/c${i}"}\n`,
    );
    const output = await runTransform([
      "```yaml-patch\n",
      `{"op":"add","path":"/a","value":"${big}"}\n`,
      ...copies,
      "```\n",
    ]);

    const emitted = (extractPatches(output) as { op: string }[]).filter(
      (p) => p.op === "copy",
    );
    expect(emitted.length).toBeGreaterThan(0);
    expect(emitted.length).toBeLessThan(200);
  });

  it("keeps copied objects independent in the working spec", async () => {
    const output = await runTransform([
      "```yaml-patch\n",
      '{"op":"add","path":"/a","value":{"x":1}}\n',
      '{"op":"copy","from":"/a","path":"/b"}\n',
      '{"op":"replace","path":"/b/x","value":2}\n',
      "```\n",
      "```yaml-edit\n",
      "a:\n  x: 2\n",
      "```\n",
    ]);

    expect(extractPatches(output).at(-1)).toEqual({
      op: "replace",
      path: "/a/x",
      value: 2,
    });
  });

  it("does not mutate patches emitted by yaml-edit when a later patch moves items", async () => {
    const output = await runTransform([
      "```yaml-edit\n",
      "l: [1, 2, 3]\n",
      "```\n",
      "```yaml-patch\n",
      '{"op":"move","from":"/l/0","path":"/l/-"}\n',
      "```\n",
    ]);

    expect(extractPatches(output)[0]).toEqual({
      op: "add",
      path: "/l",
      value: [1, 2, 3],
    });
  });

  it("applies yaml-patch copies split across single-character chunks", async () => {
    const text = [
      "```yaml-patch\n",
      '{"op":"add","path":"/a~1b","value":1}\n',
      '{"op":"copy","from":"/a~1b","path":"/c"}\n',
      "```\n",
      "```yaml-edit\n",
      "c: null\n",
      "```\n",
    ].join("");
    const output = await runTransform(text.split(""));

    expect(extractPatches(output).at(-1)).toEqual({
      op: "remove",
      path: "/c",
    });
  });

  it("swallows fence delimiters (not emitted as text)", async () => {
    const output = await runTransform([
      "```yaml-spec\n",
      "root: main\n",
      "```\n",
    ]);

    const text = extractText(output);
    expect(text).not.toContain("```yaml-spec");
    expect(text).not.toContain("```");
  });

  it("resets an open yaml-spec fence at the end of a text block", async () => {
    const transform = createYamlTransform();
    const inputChunks: StreamChunk[] = [
      { type: "text-start", id: "1" },
      { type: "text-delta", id: "1", delta: "```yaml-spec\nroot: main\n" },
      { type: "text-end", id: "1" },
      { type: "text-start", id: "2" },
      { type: "text-delta", id: "2", delta: "Plain prose.\n" },
      { type: "text-end", id: "2" },
    ];
    const input = new ReadableStream<StreamChunk>({
      start(controller) {
        for (const chunk of inputChunks) controller.enqueue(chunk);
        controller.close();
      },
    });
    const reader = input.pipeThrough(transform).getReader();
    const output: StreamChunk[] = [];

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      output.push(value);
    }

    expect(extractText(output)).toBe("Plain prose.\n");
    expect(extractPatches(output).length).toBeGreaterThan(0);
  });

  it("handles non-text chunks by passing them through", async () => {
    const transform = createYamlTransform();
    const input = new ReadableStream<StreamChunk>({
      start(controller) {
        controller.enqueue({ type: "tool-call", id: "t1", name: "getWeather" });
        controller.close();
      },
    });

    const reader = input.pipeThrough(transform).getReader();
    const { value } = await reader.read();
    expect(value).toEqual({
      type: "tool-call",
      id: "t1",
      name: "getWeather",
    });
  });
});
