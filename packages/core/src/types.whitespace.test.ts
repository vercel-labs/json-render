import { describe, it, expect } from "vitest";
import { createJsonRenderTransform, SPEC_DATA_PART_TYPE } from "./types";
import type { SpecStreamLine, StreamChunk } from "./types";

describe("createJsonRenderTransform leading whitespace", () => {
  /** Helper: push text-delta chunks through the transform and collect output */
  async function transformText(
    text: string | string[],
    endTextBlock = true,
  ): Promise<StreamChunk[]> {
    const transform = createJsonRenderTransform();
    const writer = transform.writable.getWriter();
    const reader = transform.readable.getReader();

    const chunks: StreamChunk[] = [];

    // Read and write concurrently to avoid backpressure deadlock
    const readAll = (async () => {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
      }
    })();

    await writer.write({ type: "text-start", id: "t1" });
    for (const delta of typeof text === "string" ? [text] : text) {
      await writer.write({ type: "text-delta", id: "t1", delta });
    }
    if (endTextBlock) {
      await writer.write({ type: "text-end", id: "t1" });
    }
    await writer.close();

    await readAll;
    return chunks;
  }

  const patch: SpecStreamLine = {
    op: "add",
    path: "/root",
    value: "report",
  };
  const patchLine = JSON.stringify(patch);

  function content(chunks: StreamChunk[]) {
    return {
      text: chunks
        .filter((chunk) => chunk.type === "text-delta")
        .map((chunk) => chunk.delta as string)
        .join(""),
      patches: chunks.filter((chunk) => chunk.type === SPEC_DATA_PART_TYPE),
    };
  }

  const expectedPatch = {
    type: SPEC_DATA_PART_TYPE,
    data: { type: "patch", patch },
  };

  it.each(["   ", "\t", " \t ", "\u00a0"])(
    "does not emit the indentation of a patch line (%j)",
    async (indent) => {
      const chunks = await transformText(`x\n${indent}${patchLine}\ny`);
      expect(content(chunks)).toEqual({
        text: "x\ny",
        patches: [expectedPatch],
      });
    },
  );

  it.each([true, false])(
    "discards patch indentation without a final newline (text-end: %s)",
    async (endTextBlock) => {
      const chunks = await transformText(`  ${patchLine}`, endTextBlock);
      expect(content(chunks)).toEqual({
        text: "",
        patches: [expectedPatch],
      });
    },
  );

  it("swallows indentation around spec fences", async () => {
    const chunks = await transformText(
      `x\n \t\`\`\`spec\n  ${patchLine}\n \t\`\`\`\ny`,
    );
    expect(content(chunks)).toEqual({
      text: "x\ny",
      patches: [expectedPatch],
    });
  });

  it.each([
    "  ordinary text\n\tmore text",
    '  {"not":"a patch"}\n',
    " \t{malformed JSON\n",
    "  ```js\n  code\n  ```\n",
    "a\n \t\nb\n  ",
    " \t\n  \n\t",
    "alpha  beta\n",
  ])("preserves whitespace in non-patch text (%j)", async (input) => {
    expect(content(await transformText(input))).toEqual({
      text: input,
      patches: [],
    });
  });

  it("preserves a whitespace-only suffix when the stream closes", async () => {
    expect(content(await transformText("x\n \t", false))).toEqual({
      text: "x\n \t",
      patches: [],
    });
  });

  it("classifies indented lines consistently across chunk boundaries", async () => {
    const input = `x\n \t${patchLine}\n \t\n  y`;
    const expected = {
      text: "x\n \t\n  y",
      patches: [expectedPatch],
    };

    for (let split = 0; split <= input.length; split++) {
      const chunks = await transformText([
        input.slice(0, split),
        input.slice(split),
      ]);
      expect(content(chunks)).toEqual(expected);
    }

    expect(content(await transformText(input.split("")))).toEqual(expected);
  });
});
