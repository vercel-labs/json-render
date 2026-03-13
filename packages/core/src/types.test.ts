import { describe, it, expect } from "vitest";
import {
  resolveDynamicValue,
  getByPath,
  setByPath,
  addByPath,
  removeByPath,
  applySpecStreamPatch,
  applySpecPatch,
  nestedToFlat,
  compileSpecStream,
  createSpecStreamCompiler,
  createMixedStreamParser,
  createJsonRenderTransform,
  SPEC_DATA_PART_TYPE,
} from "./types";
import type { Spec, SpecStreamLine, StreamChunk } from "./types";

describe("getByPath", () => {
  it("gets nested values with JSON pointer paths", () => {
    const data = { user: { name: "John", scores: [10, 20, 30] } };

    expect(getByPath(data, "/user/name")).toBe("John");
    expect(getByPath(data, "/user/scores/0")).toBe(10);
    expect(getByPath(data, "/user/scores/1")).toBe(20);
  });

  it("returns root object for empty or root path", () => {
    const data = { value: 42 };

    expect(getByPath(data, "/")).toBe(data);
    expect(getByPath(data, "")).toBe(data);
  });

  it("returns undefined for missing paths", () => {
    const data = { user: { name: "John" } };

    expect(getByPath(data, "/user/missing")).toBeUndefined();
    expect(getByPath(data, "/nonexistent/path")).toBeUndefined();
  });

  it("handles paths without leading slash", () => {
    const data = { user: { name: "John" } };

    expect(getByPath(data, "user/name")).toBe("John");
  });

  it("returns undefined when traversing through non-object", () => {
    const data = { value: "string" };

    expect(getByPath(data, "/value/nested")).toBeUndefined();
  });

  it("handles null values in path", () => {
    const data = { user: null };

    expect(getByPath(data, "/user/name")).toBeUndefined();
  });
});

describe("setByPath", () => {
  it("sets value at existing path", () => {
    const data: Record<string, unknown> = { user: { name: "John" } };

    setByPath(data, "/user/name", "Alice");

    expect((data.user as Record<string, unknown>).name).toBe("Alice");
  });

  it("creates intermediate objects for deep paths", () => {
    const data: Record<string, unknown> = {};

    setByPath(data, "/a/b/c", "deep");

    expect(
      ((data.a as Record<string, unknown>).b as Record<string, unknown>).c,
    ).toBe("deep");
  });

  it("handles paths without leading slash", () => {
    const data: Record<string, unknown> = {};

    setByPath(data, "user/name", "John");

    expect((data.user as Record<string, unknown>).name).toBe("John");
  });

  it("overwrites existing values", () => {
    const data: Record<string, unknown> = { count: 5 };

    setByPath(data, "/count", 10);

    expect(data.count).toBe(10);
  });

  it("handles array-like paths", () => {
    const data: Record<string, unknown> = { items: {} };

    setByPath(data, "/items/0", "first");

    expect((data.items as Record<string, unknown>)["0"]).toBe("first");
  });
});

describe("resolveDynamicValue", () => {
  it("resolves literal string values", () => {
    expect(resolveDynamicValue("hello", {})).toBe("hello");
  });

  it("resolves literal number values", () => {
    expect(resolveDynamicValue(42, {})).toBe(42);
  });

  it("resolves literal boolean values", () => {
    expect(resolveDynamicValue(true, {})).toBe(true);
    expect(resolveDynamicValue(false, {})).toBe(false);
  });

  it("resolves $state references", () => {
    const data = { user: { name: "Alice" } };

    expect(resolveDynamicValue({ $state: "/user/name" }, data)).toBe("Alice");
  });

  it("returns undefined for missing $state references", () => {
    const data = { user: { name: "Alice" } };

    expect(resolveDynamicValue({ $state: "/missing" }, data)).toBeUndefined();
  });

  it("returns undefined for null value", () => {
    expect(resolveDynamicValue(null as unknown as string, {})).toBeUndefined();
  });

  it("returns undefined for undefined value", () => {
    expect(
      resolveDynamicValue(undefined as unknown as string, {}),
    ).toBeUndefined();
  });
});

// =============================================================================
// JSON Pointer (RFC 6901) escaping
// =============================================================================

describe("JSON Pointer escaping (RFC 6901)", () => {
  it("getByPath unescapes ~1 to /", () => {
    const data = { "a/b": { c: 42 } };
    expect(getByPath(data, "/a~1b/c")).toBe(42);
  });

  it("getByPath unescapes ~0 to ~", () => {
    const data = { "a~b": 99 };
    expect(getByPath(data, "/a~0b")).toBe(99);
  });

  it("getByPath handles combined ~0 and ~1 escaping", () => {
    const data = { "a~/b": "found" };
    expect(getByPath(data, "/a~0~1b")).toBe("found");
  });

  it("setByPath unescapes ~1 to / in keys", () => {
    const data: Record<string, unknown> = {};
    setByPath(data, "/a~1b", "value");
    expect(data["a/b"]).toBe("value");
  });

  it("setByPath unescapes ~0 to ~ in keys", () => {
    const data: Record<string, unknown> = {};
    setByPath(data, "/a~0b", "value");
    expect(data["a~b"]).toBe("value");
  });

  it("getByPath reads array elements properly", () => {
    const data = { items: [10, 20, 30] };
    expect(getByPath(data, "/items/0")).toBe(10);
    expect(getByPath(data, "/items/2")).toBe(30);
  });
});

// =============================================================================
// addByPath (RFC 6902 "add" semantics)
// =============================================================================

describe("addByPath", () => {
  it("adds a property to an object", () => {
    const data: Record<string, unknown> = { a: 1 };
    addByPath(data, "/b", 2);
    expect(data.b).toBe(2);
  });

  it("replaces an existing object property (add semantics)", () => {
    const data: Record<string, unknown> = { a: 1 };
    addByPath(data, "/a", 99);
    expect(data.a).toBe(99);
  });

  it("inserts into an array at a specific index", () => {
    const data: Record<string, unknown> = { arr: [1, 2, 3] };
    addByPath(data, "/arr/1", 99);
    expect(data.arr).toEqual([1, 99, 2, 3]);
  });

  it("appends to an array with - (end-of-array)", () => {
    const data: Record<string, unknown> = { arr: [1, 2] };
    addByPath(data, "/arr/-", 3);
    expect(data.arr).toEqual([1, 2, 3]);
  });

  it("inserts at index 0 of an array", () => {
    const data: Record<string, unknown> = { arr: ["b", "c"] };
    addByPath(data, "/arr/0", "a");
    expect(data.arr).toEqual(["a", "b", "c"]);
  });

  it("creates intermediate objects", () => {
    const data: Record<string, unknown> = {};
    addByPath(data, "/x/y/z", "deep");
    expect(
      ((data.x as Record<string, unknown>).y as Record<string, unknown>).z,
    ).toBe("deep");
  });
});

// =============================================================================
// removeByPath (RFC 6902 "remove" semantics)
// =============================================================================

describe("removeByPath", () => {
  it("deletes an object property", () => {
    const data: Record<string, unknown> = { a: 1, b: 2 };
    removeByPath(data, "/a");
    expect(data).toEqual({ b: 2 });
    expect("a" in data).toBe(false);
  });

  it("removes an element from an array by index", () => {
    const data: Record<string, unknown> = { arr: [1, 2, 3] };
    removeByPath(data, "/arr/1");
    expect(data.arr).toEqual([1, 3]);
  });

  it("removes nested properties", () => {
    const data: Record<string, unknown> = { user: { name: "John", age: 30 } };
    removeByPath(data, "/user/age");
    expect(data.user).toEqual({ name: "John" });
  });

  it("is a no-op for non-existent paths", () => {
    const data: Record<string, unknown> = { a: 1 };
    removeByPath(data, "/b/c/d");
    expect(data).toEqual({ a: 1 });
  });
});

// =============================================================================
// applySpecStreamPatch - RFC 6902 operations
// =============================================================================

describe("applySpecStreamPatch", () => {
  describe("add operation", () => {
    it("adds a new object property", () => {
      const obj: Record<string, unknown> = {};
      applySpecStreamPatch(obj, { op: "add", path: "/name", value: "Alice" });
      expect(obj.name).toBe("Alice");
    });

    it("adds nested properties creating intermediates", () => {
      const obj: Record<string, unknown> = {};
      applySpecStreamPatch(obj, {
        op: "add",
        path: "/user/name",
        value: "Bob",
      });
      expect((obj.user as Record<string, unknown>).name).toBe("Bob");
    });

    it("inserts into array at index", () => {
      const obj: Record<string, unknown> = { items: [1, 3] };
      applySpecStreamPatch(obj, { op: "add", path: "/items/1", value: 2 });
      expect(obj.items).toEqual([1, 2, 3]);
    });

    it("appends to array with -", () => {
      const obj: Record<string, unknown> = { items: [1, 2] };
      applySpecStreamPatch(obj, { op: "add", path: "/items/-", value: 3 });
      expect(obj.items).toEqual([1, 2, 3]);
    });
  });

  describe("remove operation", () => {
    it("removes an object property", () => {
      const obj: Record<string, unknown> = { name: "Alice", age: 30 };
      applySpecStreamPatch(obj, { op: "remove", path: "/age" });
      expect(obj).toEqual({ name: "Alice" });
      expect("age" in obj).toBe(false);
    });

    it("removes from array by index", () => {
      const obj: Record<string, unknown> = { items: ["a", "b", "c"] };
      applySpecStreamPatch(obj, { op: "remove", path: "/items/1" });
      expect(obj.items).toEqual(["a", "c"]);
    });
  });

  describe("replace operation", () => {
    it("replaces an existing value", () => {
      const obj: Record<string, unknown> = { name: "Alice" };
      applySpecStreamPatch(obj, {
        op: "replace",
        path: "/name",
        value: "Bob",
      });
      expect(obj.name).toBe("Bob");
    });

    it("replaces nested values", () => {
      const obj: Record<string, unknown> = { user: { name: "Alice" } };
      applySpecStreamPatch(obj, {
        op: "replace",
        path: "/user/name",
        value: "Bob",
      });
      expect((obj.user as Record<string, unknown>).name).toBe("Bob");
    });
  });

  describe("move operation", () => {
    it("moves a value from one path to another", () => {
      const obj: Record<string, unknown> = { a: 1, b: 2 };
      applySpecStreamPatch(obj, { op: "move", path: "/c", from: "/a" });
      expect(obj).toEqual({ b: 2, c: 1 });
      expect("a" in obj).toBe(false);
    });

    it("moves nested values", () => {
      const obj: Record<string, unknown> = {
        source: { val: 42 },
        target: {},
      };
      applySpecStreamPatch(obj, {
        op: "move",
        path: "/target/val",
        from: "/source/val",
      });
      expect((obj.target as Record<string, unknown>).val).toBe(42);
      expect("val" in (obj.source as Record<string, unknown>)).toBe(false);
    });

    it("is a no-op if from is missing", () => {
      const obj: Record<string, unknown> = { a: 1 };
      applySpecStreamPatch(obj, { op: "move", path: "/b" });
      expect(obj).toEqual({ a: 1 });
    });
  });

  describe("copy operation", () => {
    it("copies a value from one path to another", () => {
      const obj: Record<string, unknown> = { a: 1 };
      applySpecStreamPatch(obj, { op: "copy", path: "/b", from: "/a" });
      expect(obj).toEqual({ a: 1, b: 1 });
    });

    it("copies complex values", () => {
      const obj: Record<string, unknown> = {
        source: { nested: { value: 42 } },
      };
      applySpecStreamPatch(obj, {
        op: "copy",
        path: "/dest",
        from: "/source/nested",
      });
      expect(obj.dest).toEqual({ value: 42 });
      // Source should still exist
      expect((obj.source as Record<string, unknown>).nested).toEqual({
        value: 42,
      });
    });

    it("is a no-op if from is missing", () => {
      const obj: Record<string, unknown> = { a: 1 };
      applySpecStreamPatch(obj, { op: "copy", path: "/b" });
      expect(obj).toEqual({ a: 1 });
    });
  });

  describe("test operation", () => {
    it("succeeds when values match", () => {
      const obj: Record<string, unknown> = { name: "Alice" };
      expect(() =>
        applySpecStreamPatch(obj, {
          op: "test",
          path: "/name",
          value: "Alice",
        }),
      ).not.toThrow();
    });

    it("succeeds for matching objects", () => {
      const obj: Record<string, unknown> = { user: { name: "Alice", age: 30 } };
      expect(() =>
        applySpecStreamPatch(obj, {
          op: "test",
          path: "/user",
          value: { name: "Alice", age: 30 },
        }),
      ).not.toThrow();
    });

    it("succeeds for matching arrays", () => {
      const obj: Record<string, unknown> = { items: [1, 2, 3] };
      expect(() =>
        applySpecStreamPatch(obj, {
          op: "test",
          path: "/items",
          value: [1, 2, 3],
        }),
      ).not.toThrow();
    });

    it("throws when values do not match", () => {
      const obj: Record<string, unknown> = { name: "Alice" };
      expect(() =>
        applySpecStreamPatch(obj, {
          op: "test",
          path: "/name",
          value: "Bob",
        }),
      ).toThrow('Test operation failed: value at "/name" does not match');
    });

    it("throws when path does not exist", () => {
      const obj: Record<string, unknown> = {};
      expect(() =>
        applySpecStreamPatch(obj, {
          op: "test",
          path: "/missing",
          value: "anything",
        }),
      ).toThrow();
    });
  });
});

// =============================================================================
// compileSpecStream
// =============================================================================

describe("compileSpecStream", () => {
  it("compiles a series of add patches", () => {
    const stream = `{"op":"add","path":"/name","value":"Alice"}
{"op":"add","path":"/age","value":30}`;
    const result = compileSpecStream(stream);
    expect(result).toEqual({ name: "Alice", age: 30 });
  });

  it("handles remove operations", () => {
    const stream = `{"op":"add","path":"/a","value":1}
{"op":"add","path":"/b","value":2}
{"op":"remove","path":"/a"}`;
    const result = compileSpecStream(stream);
    expect(result).toEqual({ b: 2 });
    expect("a" in result).toBe(false);
  });

  it("handles replace operations", () => {
    const stream = `{"op":"add","path":"/name","value":"Alice"}
{"op":"replace","path":"/name","value":"Bob"}`;
    const result = compileSpecStream(stream);
    expect(result).toEqual({ name: "Bob" });
  });

  it("handles move operations", () => {
    const stream = `{"op":"add","path":"/old","value":"data"}
{"op":"move","path":"/new","from":"/old"}`;
    const result = compileSpecStream(stream);
    expect(result).toEqual({ new: "data" });
  });

  it("handles copy operations", () => {
    const stream = `{"op":"add","path":"/original","value":"data"}
{"op":"copy","path":"/duplicate","from":"/original"}`;
    const result = compileSpecStream(stream);
    expect(result).toEqual({ original: "data", duplicate: "data" });
  });

  it("skips empty lines", () => {
    const stream = `{"op":"add","path":"/a","value":1}

{"op":"add","path":"/b","value":2}`;
    const result = compileSpecStream(stream);
    expect(result).toEqual({ a: 1, b: 2 });
  });

  it("uses initial value", () => {
    const stream = `{"op":"add","path":"/b","value":2}`;
    const result = compileSpecStream(stream, { a: 1 });
    expect(result).toEqual({ a: 1, b: 2 });
  });
});

// =============================================================================
// createSpecStreamCompiler
// =============================================================================

describe("createSpecStreamCompiler", () => {
  it("processes chunks incrementally", () => {
    const compiler = createSpecStreamCompiler();
    const { result, newPatches } = compiler.push(
      '{"op":"add","path":"/name","value":"Alice"}\n',
    );
    expect(newPatches).toHaveLength(1);
    expect(result).toEqual({ name: "Alice" });
  });

  it("handles partial lines across chunks", () => {
    const compiler = createSpecStreamCompiler();

    // First chunk is incomplete
    const r1 = compiler.push('{"op":"add","path":"/na');
    expect(r1.newPatches).toHaveLength(0);

    // Complete the line
    const r2 = compiler.push('me","value":"Alice"}\n');
    expect(r2.newPatches).toHaveLength(1);
    expect(r2.result).toEqual({ name: "Alice" });
  });

  it("processes remaining buffer on getResult", () => {
    const compiler = createSpecStreamCompiler();
    compiler.push('{"op":"add","path":"/name","value":"Alice"}');
    // No newline, so not processed yet
    const result = compiler.getResult();
    expect(result).toEqual({ name: "Alice" });
  });

  it("resets to clean state", () => {
    const compiler = createSpecStreamCompiler();
    compiler.push('{"op":"add","path":"/name","value":"Alice"}\n');
    compiler.reset();
    const result = compiler.getResult();
    expect(result).toEqual({});
  });

  it("tracks all applied patches", () => {
    const compiler = createSpecStreamCompiler();
    compiler.push('{"op":"add","path":"/a","value":1}\n');
    compiler.push('{"op":"add","path":"/b","value":2}\n');
    const patches = compiler.getPatches();
    expect(patches).toHaveLength(2);
    expect(patches[0]!.op).toBe("add");
    expect(patches[1]!.op).toBe("add");
  });

  it("handles all RFC 6902 operations", () => {
    const compiler = createSpecStreamCompiler();
    compiler.push('{"op":"add","path":"/x","value":1}\n');
    compiler.push('{"op":"add","path":"/y","value":2}\n');
    compiler.push('{"op":"move","path":"/z","from":"/x"}\n');
    compiler.push('{"op":"copy","path":"/w","from":"/y"}\n');
    compiler.push('{"op":"remove","path":"/y"}\n');
    const result = compiler.getResult();
    expect(result).toEqual({ z: 1, w: 2 });
  });

  describe("onError callback", () => {
    it("calls onError for malformed JSON", () => {
      const errors: string[] = [];
      const compiler = createSpecStreamCompiler({
        onError: (line) => errors.push(line),
      });

      compiler.push('{"op":"add"\n'); // Missing closing brace
      compiler.push('not-json\n');
      compiler.push('{"invalid":}\n'); // Invalid JSON

      expect(errors).toHaveLength(2);
      expect(errors[0]).toContain('{"op":"add"');
      expect(errors[1]).toContain('{"invalid":}');
    });

    it("calls onError when patch application fails", () => {
      const errors: Array<{ line: string; error?: unknown }> = [];
      const compiler = createSpecStreamCompiler({
        onError: (line, error) => errors.push({ line, error }),
      });

      // Valid JSON but test operation fails
      compiler.push('{"op":"test","path":"/x","value":"wrong"}\n');

      expect(errors).toHaveLength(1);
      expect(errors[0]?.error).toBeDefined();
    });

    it("does not call onError for valid patches", () => {
      const errors: string[] = [];
      const compiler = createSpecStreamCompiler({
        onError: (line) => errors.push(line),
      });

      compiler.push('{"op":"add","path":"/x","value":1}\n');
      const result = compiler.getResult();

      expect(errors).toHaveLength(0);
      expect(result).toEqual({ x: 1 });
    });

    it("continues processing after errors", () => {
      const errors: string[] = [];
      const compiler = createSpecStreamCompiler({
        onError: (line) => errors.push(line),
      });

      compiler.push('{"invalid"}\n');
      compiler.push('{"op":"add","path":"/x","value":1}\n');
      compiler.push('{broken\n');
      compiler.push('{"op":"add","path":"/y","value":2}\n');

      expect(errors).toHaveLength(2);
      const result = compiler.getResult();
      expect(result).toEqual({ x: 1, y: 2 });
    });
  });
});

// =============================================================================
// applySpecPatch
// =============================================================================

describe("applySpecPatch", () => {
  it("sets the root element", () => {
    const spec: Spec = { root: "", elements: {} };
    applySpecPatch(spec, { op: "add", path: "/root", value: "main" });
    expect(spec.root).toBe("main");
  });

  it("adds an element to the elements map", () => {
    const spec: Spec = { root: "main", elements: {} };
    applySpecPatch(spec, {
      op: "add",
      path: "/elements/main",
      value: { type: "Card", props: { title: "Hello" }, children: [] },
    });
    expect(spec.elements.main).toEqual({
      type: "Card",
      props: { title: "Hello" },
      children: [],
    });
  });

  it("replaces an existing element", () => {
    const spec: Spec = {
      root: "main",
      elements: {
        main: { type: "Card", props: { title: "Old" }, children: [] },
      },
    };
    applySpecPatch(spec, {
      op: "replace",
      path: "/elements/main/props/title",
      value: "New",
    });
    expect(spec.elements.main!.props.title).toBe("New");
  });

  it("removes an element", () => {
    const spec: Spec = {
      root: "main",
      elements: {
        main: { type: "Card", props: {}, children: [] },
        child: { type: "Text", props: {}, children: [] },
      },
    };
    applySpecPatch(spec, { op: "remove", path: "/elements/child" });
    expect(spec.elements.child).toBeUndefined();
    expect(spec.elements.main).toBeDefined();
  });

  it("adds state data", () => {
    const spec: Spec = { root: "main", elements: {} };
    applySpecPatch(spec, {
      op: "add",
      path: "/state",
      value: { count: 0 },
    });
    expect(spec.state).toEqual({ count: 0 });
  });

  it("returns the mutated spec", () => {
    const spec: Spec = { root: "", elements: {} };
    const result = applySpecPatch(spec, {
      op: "add",
      path: "/root",
      value: "main",
    });
    expect(result).toBe(spec);
  });
});

// =============================================================================
// createMixedStreamParser
// =============================================================================

describe("createMixedStreamParser", () => {
  it("classifies JSONL lines as patches", () => {
    const patches: SpecStreamLine[] = [];
    const texts: string[] = [];
    const parser = createMixedStreamParser({
      onPatch: (p) => patches.push(p),
      onText: (t) => texts.push(t),
    });

    parser.push('{"op":"add","path":"/root","value":"main"}\n');
    expect(patches).toHaveLength(1);
    expect(patches[0]!.op).toBe("add");
    expect(patches[0]!.path).toBe("/root");
    expect(texts).toHaveLength(0);
  });

  it("classifies non-JSONL lines as text", () => {
    const patches: SpecStreamLine[] = [];
    const texts: string[] = [];
    const parser = createMixedStreamParser({
      onPatch: (p) => patches.push(p),
      onText: (t) => texts.push(t),
    });

    parser.push("Hello, here is your UI:\n");
    expect(texts).toHaveLength(1);
    expect(texts[0]).toBe("Hello, here is your UI:");
    expect(patches).toHaveLength(0);
  });

  it("handles mixed text and JSONL", () => {
    const patches: SpecStreamLine[] = [];
    const texts: string[] = [];
    const parser = createMixedStreamParser({
      onPatch: (p) => patches.push(p),
      onText: (t) => texts.push(t),
    });

    parser.push(
      'Here is the dashboard:\n{"op":"add","path":"/root","value":"dash"}\n',
    );
    expect(texts).toHaveLength(1);
    expect(texts[0]).toBe("Here is the dashboard:");
    expect(patches).toHaveLength(1);
    expect(patches[0]!.path).toBe("/root");
  });

  it("buffers partial lines across chunks", () => {
    const patches: SpecStreamLine[] = [];
    const texts: string[] = [];
    const parser = createMixedStreamParser({
      onPatch: (p) => patches.push(p),
      onText: (t) => texts.push(t),
    });

    parser.push('{"op":"add","path":"/ro');
    expect(patches).toHaveLength(0);

    parser.push('ot","value":"main"}\n');
    expect(patches).toHaveLength(1);
    expect(patches[0]!.path).toBe("/root");
  });

  it("flushes remaining buffer on flush()", () => {
    const patches: SpecStreamLine[] = [];
    const texts: string[] = [];
    const parser = createMixedStreamParser({
      onPatch: (p) => patches.push(p),
      onText: (t) => texts.push(t),
    });

    // No trailing newline — stuck in buffer
    parser.push('{"op":"add","path":"/root","value":"main"}');
    expect(patches).toHaveLength(0);

    parser.flush();
    expect(patches).toHaveLength(1);
  });

  it("flushes text buffer on flush()", () => {
    const patches: SpecStreamLine[] = [];
    const texts: string[] = [];
    const parser = createMixedStreamParser({
      onPatch: (p) => patches.push(p),
      onText: (t) => texts.push(t),
    });

    parser.push("Some trailing text");
    expect(texts).toHaveLength(0);

    parser.flush();
    expect(texts).toHaveLength(1);
    expect(texts[0]).toBe("Some trailing text");
  });

  it("skips empty lines", () => {
    const patches: SpecStreamLine[] = [];
    const texts: string[] = [];
    const parser = createMixedStreamParser({
      onPatch: (p) => patches.push(p),
      onText: (t) => texts.push(t),
    });

    parser.push("\n\n\n");
    expect(patches).toHaveLength(0);
    expect(texts).toHaveLength(0);
  });
});

// =============================================================================
// nestedToFlat
// =============================================================================

describe("nestedToFlat", () => {
  it("converts a single node with no children", () => {
    const spec = nestedToFlat({
      type: "Text",
      props: { content: "Hello" },
    });
    expect(spec.root).toBe("el-0");
    expect(spec.elements["el-0"]).toEqual({
      type: "Text",
      props: { content: "Hello" },
      children: [],
    });
  });

  it("converts a tree with children", () => {
    const spec = nestedToFlat({
      type: "Card",
      props: { title: "Hello" },
      children: [
        { type: "Text", props: { content: "World" }, children: [] },
        { type: "Button", props: { label: "Click" } },
      ],
    });

    expect(spec.root).toBe("el-0");
    expect(Object.keys(spec.elements)).toHaveLength(3);
    expect(spec.elements["el-0"]!.type).toBe("Card");
    expect(spec.elements["el-0"]!.children).toEqual(["el-1", "el-2"]);
    expect(spec.elements["el-1"]!.type).toBe("Text");
    expect(spec.elements["el-1"]!.children).toEqual([]);
    expect(spec.elements["el-2"]!.type).toBe("Button");
    expect(spec.elements["el-2"]!.children).toEqual([]);
  });

  it("hoists state from root node", () => {
    const spec = nestedToFlat({
      type: "Card",
      props: { title: "Hello" },
      children: [],
      state: { count: 0, items: [] },
    });

    expect(spec.state).toEqual({ count: 0, items: [] });
    // state should not appear as a field on the element
    expect(
      (spec.elements["el-0"] as Record<string, unknown>).state,
    ).toBeUndefined();
  });

  it("preserves extra fields like visible and on", () => {
    const spec = nestedToFlat({
      type: "Panel",
      props: {},
      visible: { $state: "/showPanel" },
      on: {
        press: { action: "setState", params: { statePath: "/x", value: 1 } },
      },
      children: [],
    });

    const el = spec.elements["el-0"] as Record<string, unknown>;
    expect(el.visible).toEqual({ $state: "/showPanel" });
    expect(el.on).toEqual({
      press: { action: "setState", params: { statePath: "/x", value: 1 } },
    });
  });

  it("handles deeply nested trees", () => {
    const spec = nestedToFlat({
      type: "A",
      props: {},
      children: [
        {
          type: "B",
          props: {},
          children: [
            {
              type: "C",
              props: {},
              children: [{ type: "D", props: {} }],
            },
          ],
        },
      ],
    });

    expect(Object.keys(spec.elements)).toHaveLength(4);
    expect(spec.elements["el-0"]!.children).toEqual(["el-1"]);
    expect(spec.elements["el-1"]!.children).toEqual(["el-2"]);
    expect(spec.elements["el-2"]!.children).toEqual(["el-3"]);
    expect(spec.elements["el-3"]!.children).toEqual([]);
  });

  it("returns empty elements for empty children array", () => {
    const spec = nestedToFlat({
      type: "Empty",
      props: {},
      children: [],
    });

    expect(Object.keys(spec.elements)).toHaveLength(1);
    expect(spec.elements["el-0"]!.children).toEqual([]);
  });

  it("does not hoist state from non-root nodes", () => {
    const spec = nestedToFlat({
      type: "Root",
      props: {},
      children: [{ type: "Child", props: {}, state: { shouldNotHoist: true } }],
    });

    // Only root state hoists to spec.state
    expect(spec.state).toBeUndefined();
    // The child's state is not a standard field, so it should not leak
    expect(
      (spec.elements["el-1"] as Record<string, unknown>).state,
    ).toBeUndefined();
  });
});

// =============================================================================
// createJsonRenderTransform
// =============================================================================

describe("createJsonRenderTransform", () => {
  /** Helper: push text-delta chunks through the transform and collect output */
  async function transformText(text: string): Promise<StreamChunk[]> {
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
    await writer.write({ type: "text-delta", id: "t1", delta: text });
    await writer.write({ type: "text-end", id: "t1" });
    await writer.close();

    await readAll;
    return chunks;
  }

  it("passes prose text through as text-delta", async () => {
    const chunks = await transformText("Hello world\n");
    const textChunks = chunks.filter((c) => c.type === "text-delta");
    const text = textChunks.map((c) => (c as { delta: string }).delta).join("");
    expect(text).toContain("Hello world");
  });

  it("classifies valid JSONL patches as data-spec (heuristic mode)", async () => {
    const patch = '{"op":"add","path":"/root","value":"main"}\n';
    const chunks = await transformText(patch);
    const specChunks = chunks.filter((c) => c.type === SPEC_DATA_PART_TYPE);
    expect(specChunks.length).toBe(1);
    expect((specChunks[0] as { data: { type: string } }).data.type).toBe(
      "patch",
    );
  });

  it("lines starting with { that are NOT patches are flushed as text", async () => {
    const line = '{"not":"a patch"}\n';
    const chunks = await transformText(line);
    const specChunks = chunks.filter((c) => c.type === SPEC_DATA_PART_TYPE);
    const textChunks = chunks.filter((c) => c.type === "text-delta");
    expect(specChunks.length).toBe(0);
    const text = textChunks.map((c) => (c as { delta: string }).delta).join("");
    expect(text).toContain('{"not":"a patch"}');
  });

  it("parses content inside ```spec fence as patches", async () => {
    const input = [
      "Here is some UI:\n",
      "```spec\n",
      '{"op":"add","path":"/root","value":"main"}\n',
      '{"op":"add","path":"/elements/main","value":{"type":"Card","props":{},"children":[]}}\n',
      "```\n",
      "Done!\n",
    ].join("");

    const chunks = await transformText(input);
    const specChunks = chunks.filter((c) => c.type === SPEC_DATA_PART_TYPE);
    expect(specChunks.length).toBe(2);

    // Prose before and after should come through
    const textChunks = chunks.filter((c) => c.type === "text-delta");
    const text = textChunks.map((c) => (c as { delta: string }).delta).join("");
    expect(text).toContain("Here is some UI:");
    expect(text).toContain("Done!");
    // Fence delimiters should NOT appear in text
    expect(text).not.toContain("```spec");
  });

  it("handles mixed text + heuristic patches in single stream", async () => {
    const input = [
      "Some text\n",
      '{"op":"add","path":"/root","value":"r"}\n',
      "More text\n",
    ].join("");

    const chunks = await transformText(input);
    const specChunks = chunks.filter((c) => c.type === SPEC_DATA_PART_TYPE);
    expect(specChunks.length).toBe(1);

    const textChunks = chunks.filter((c) => c.type === "text-delta");
    const text = textChunks.map((c) => (c as { delta: string }).delta).join("");
    expect(text).toContain("Some text");
    expect(text).toContain("More text");
  });

  it("non-text chunks pass through unchanged", async () => {
    const transform = createJsonRenderTransform();
    const writer = transform.writable.getWriter();
    const reader = transform.readable.getReader();

    const toolChunk = {
      type: "tool-call",
      toolCallId: "abc",
      toolName: "test",
    };

    const readPromise = reader.read();
    await writer.write(toolChunk as StreamChunk);
    await writer.close();

    const { value } = await readPromise;
    expect(value).toEqual(toolChunk);
  });

  it("flush behavior at end of stream", async () => {
    const transform = createJsonRenderTransform();
    const writer = transform.writable.getWriter();
    const reader = transform.readable.getReader();

    const chunks: StreamChunk[] = [];
    const readAll = (async () => {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
      }
    })();

    // Write a text delta with no trailing newline
    await writer.write({ type: "text-start", id: "t1" });
    await writer.write({
      type: "text-delta",
      id: "t1",
      delta: '{"op":"add","path":"/root","value":"main"}',
    });
    await writer.write({ type: "text-end", id: "t1" });
    await writer.close();

    await readAll;

    // The buffered patch should be flushed on text-end
    const specChunks = chunks.filter((c) => c.type === SPEC_DATA_PART_TYPE);
    expect(specChunks.length).toBe(1);
  });

  // ===========================================================================
  // Text block splitting around spec data
  // ===========================================================================

  it("splits text blocks around spec data (text-start/text-end pairs)", async () => {
    const input = [
      "Some text\n",
      '{"op":"add","path":"/root","value":"r"}\n',
      "More text\n",
    ].join("");

    const chunks = await transformText(input);

    const textStarts = chunks.filter((c) => c.type === "text-start");
    const textEnds = chunks.filter((c) => c.type === "text-end");

    // There should be two text blocks: one before the patch and one after
    expect(textStarts.length).toBe(2);
    expect(textEnds.length).toBe(2);

    // Spec data should appear between the two text blocks
    const specChunks = chunks.filter((c) => c.type === SPEC_DATA_PART_TYPE);
    expect(specChunks.length).toBe(1);

    // Find the indices of the first text-end and the spec chunk
    const firstTextEndIdx = chunks.findIndex((c) => c.type === "text-end");
    const specIdx = chunks.findIndex((c) => c.type === SPEC_DATA_PART_TYPE);
    const secondTextStartIdx = chunks.findIndex(
      (c, i) => i > specIdx && c.type === "text-start",
    );
    expect(firstTextEndIdx).toBeLessThan(specIdx);
    expect(specIdx).toBeLessThan(secondTextStartIdx);
  });

  it("flush closes an open text block when stream ends without text-end", async () => {
    const transform = createJsonRenderTransform();
    const writer = transform.writable.getWriter();
    const reader = transform.readable.getReader();

    const chunks: StreamChunk[] = [];
    const readAll = (async () => {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
      }
    })();

    // Write text-start + text-delta, then close WITHOUT text-end
    await writer.write({ type: "text-start", id: "t1" });
    await writer.write({
      type: "text-delta",
      id: "t1",
      delta: "Hello world\n",
    });
    await writer.close();

    await readAll;

    // The transform's flush should have emitted a text-end to close the block
    const textEnds = chunks.filter((c) => c.type === "text-end");
    expect(textEnds.length).toBe(1);

    // Text content should still be present
    const textChunks = chunks.filter((c) => c.type === "text-delta");
    const text = textChunks.map((c) => (c as { delta: string }).delta).join("");
    expect(text).toContain("Hello world");
  });

  it("consecutive patches do not produce empty text blocks", async () => {
    const input = [
      '{"op":"add","path":"/root","value":"r"}\n',
      '{"op":"add","path":"/elements/r","value":{"type":"Card","props":{},"children":[]}}\n',
    ].join("");

    const chunks = await transformText(input);

    const specChunks = chunks.filter((c) => c.type === SPEC_DATA_PART_TYPE);
    expect(specChunks.length).toBe(2);

    // There should be no text-start/text-end pairs between the two spec chunks
    // (the initial text-start from the upstream is forwarded, but no new empty ones)
    const textDeltas = chunks.filter((c) => c.type === "text-delta");
    const textContent = textDeltas
      .map((c) => (c as { delta: string }).delta)
      .join("")
      .trim();
    // No meaningful text content between the patches
    expect(textContent).toBe("");

    // Count text blocks: there should be at most 1 (the initial upstream one),
    // not extra empty ones inserted between patches
    const textStarts = chunks.filter((c) => c.type === "text-start");
    const textEnds = chunks.filter((c) => c.type === "text-end");
    expect(textStarts.length).toBeLessThanOrEqual(1);
    expect(textEnds.length).toBeLessThanOrEqual(1);
  });
});

// =============================================================================
// createMixedStreamParser - fence mode
// =============================================================================

describe("createMixedStreamParser - fence mode", () => {
  it("parses patches inside ```spec fence", () => {
    const patches: SpecStreamLine[] = [];
    const texts: string[] = [];
    const parser = createMixedStreamParser({
      onPatch: (p) => patches.push(p),
      onText: (t) => texts.push(t),
    });

    parser.push("Hello\n");
    parser.push("```spec\n");
    parser.push('{"op":"add","path":"/root","value":"main"}\n');
    parser.push("```\n");
    parser.push("Goodbye\n");
    parser.flush();

    expect(patches.length).toBe(1);
    expect(patches[0].op).toBe("add");
    expect(texts).toContain("Hello");
    expect(texts).toContain("Goodbye");
  });

  it("fence delimiters are not emitted as text or patches", () => {
    const patches: SpecStreamLine[] = [];
    const texts: string[] = [];
    const parser = createMixedStreamParser({
      onPatch: (p) => patches.push(p),
      onText: (t) => texts.push(t),
    });

    parser.push("```spec\n");
    parser.push('{"op":"add","path":"/root","value":"r"}\n');
    parser.push("```\n");
    parser.flush();

    expect(patches.length).toBe(1);
    expect(texts.length).toBe(0);
  });
});
