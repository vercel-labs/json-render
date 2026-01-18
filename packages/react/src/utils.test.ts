import { describe, it, expect, vi } from "vitest";
import { processPatch, parsePatchLine } from "./utils";
import type { UITree, JsonPatch } from "@json-render/core";

describe("processPatch", () => {
  it("calls onDataPatch when dataPath is present", () => {
    const tree: UITree = { root: "", elements: {} };
    const patch: JsonPatch = { op: "add", dataPath: "/user/name", value: "Alice" };
    const onDataPatch = vi.fn();

    const result = processPatch(patch, tree, onDataPatch);

    expect(onDataPatch).toHaveBeenCalledWith(patch);
    expect(result).toBe(tree); // Should not modify tree
  });

  it("applies patch to tree when dataPath is missing", () => {
    const tree: UITree = { root: "", elements: {} };
    const patch: JsonPatch = { op: "add", path: "/root", value: "newRoot" };
    const onDataPatch = vi.fn();

    const result = processPatch(patch, tree, onDataPatch);

    expect(onDataPatch).not.toHaveBeenCalled();
    expect(result.root).toBe("newRoot");
  });

  it("ignores patch if dataPath is present but onDataPatch is missing", () => {
     const tree: UITree = { root: "", elements: {} };
     const patch: JsonPatch = { op: "add", dataPath: "/user/name", value: "Alice" };

     const result = processPatch(patch, tree);

     // processPatch falls through to applyPatch, which ignores patches without path
     // If dataPath is present, path is undefined (in this test case).
     // applyPatch returns tree if path is missing.
     expect(result).toBe(tree);
     // However, what if path IS present?
  });

  it("applies patch to tree if dataPath is present but onDataPatch is missing, AND path is present", () => {
     // This behavior is debatable. Current implementation:
     /*
     if (patch.dataPath && onDataPatch) {
        onDataPatch(patch);
        return currentTree;
      }
      return applyPatch(currentTree, patch);
     */
     // So if onDataPatch is missing, it calls applyPatch.
     // applyPatch checks patch.path.

     const tree: UITree = { root: "", elements: {} };
     const patch: JsonPatch = { op: "add", dataPath: "/user/name", path: "/root", value: "Alice" };

     const result = processPatch(patch, tree);

     expect(result.root).toBe("Alice");
  });
});

describe("parsePatchLine", () => {
  it("parses valid JSON patch", () => {
    const line = '{"op": "add", "path": "/root", "value": "test"}';
    expect(parsePatchLine(line)).toEqual({
      op: "add",
      path: "/root",
      value: "test",
    });
  });

  it("returns null for comment lines", () => {
    expect(parsePatchLine("// comment")).toBeNull();
  });

  it("returns null for empty lines", () => {
    expect(parsePatchLine("   ")).toBeNull();
  });

  it("returns null for invalid JSON", () => {
    expect(parsePatchLine("{invalid}")).toBeNull();
  });
});
