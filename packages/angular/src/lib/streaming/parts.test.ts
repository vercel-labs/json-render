import { describe, expect, it } from "vitest";
import { SPEC_DATA_PART_TYPE } from "@json-render/core";
import type { FlatElement } from "@json-render/core";

import { buildSpecFromParts, flatToTree, getTextFromParts } from "./parts";

describe("flatToTree", () => {
  it("builds a spec with root and children from a flat list", () => {
    const flat: FlatElement[] = [
      { key: "root", type: "Stack", props: {} },
      { key: "a", type: "Text", props: { value: "hi" }, parentKey: "root" },
      { key: "b", type: "Text", props: { value: "yo" }, parentKey: "root" },
    ];
    const spec = flatToTree(flat);
    expect(spec.root).toBe("root");
    expect(spec.elements["root"]?.children).toEqual(["a", "b"]);
    expect(spec.elements["a"]?.type).toBe("Text");
  });
});

describe("getTextFromParts", () => {
  it("joins text parts with double newlines and trims", () => {
    const text = getTextFromParts([
      { type: "text", text: "  hello  " },
      { type: "data", data: {} },
      { type: "text", text: "world" },
    ]);
    expect(text).toBe("hello\n\nworld");
  });

  it("returns empty string when no text parts", () => {
    expect(getTextFromParts([{ type: "data", data: {} }])).toBe("");
  });
});

describe("buildSpecFromParts", () => {
  it("returns null when there are no spec data parts", () => {
    expect(buildSpecFromParts([{ type: "text", text: "hi" }])).toBeNull();
  });

  it("replays a flat spec payload", () => {
    const spec = buildSpecFromParts([
      {
        type: SPEC_DATA_PART_TYPE,
        data: {
          type: "flat",
          spec: { root: "r", elements: { r: { type: "Box", props: {} } } },
        },
      },
    ]);
    expect(spec?.root).toBe("r");
    expect(spec?.elements["r"]?.type).toBe("Box");
  });

  it("ignores malformed spec data parts", () => {
    expect(
      buildSpecFromParts([
        { type: SPEC_DATA_PART_TYPE, data: { type: "bogus" } },
      ]),
    ).toBeNull();
  });
});
