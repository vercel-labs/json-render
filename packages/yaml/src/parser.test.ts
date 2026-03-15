import { describe, it, expect } from "vitest";
import { createYamlStreamCompiler } from "./parser";

describe("createYamlStreamCompiler", () => {
  it("parses a simple YAML document incrementally", () => {
    const compiler = createYamlStreamCompiler();

    const r1 = compiler.push("root: main\n");
    expect(r1.newPatches.length).toBeGreaterThan(0);
    expect(r1.result).toHaveProperty("root", "main");
  });

  it("accumulates elements as lines arrive", () => {
    const compiler = createYamlStreamCompiler();

    compiler.push("root: main\n");
    compiler.push("elements:\n");
    compiler.push("  main:\n");
    compiler.push("    type: Card\n");

    const { result } = compiler.flush();
    expect(result).toHaveProperty("root", "main");

    const elements = result.elements as Record<string, Record<string, unknown>>;
    expect(elements.main).toBeDefined();
    expect(elements.main!.type).toBe("Card");
  });

  it("emits patches only for changes", () => {
    const compiler = createYamlStreamCompiler();

    const r1 = compiler.push("root: main\n");
    expect(r1.newPatches).toEqual([
      { op: "add", path: "/root", value: "main" },
    ]);

    // Pushing the same content again (no new complete line) should not emit patches
    const r2 = compiler.push("");
    expect(r2.newPatches).toEqual([]);
  });

  it("tracks all patches via getPatches()", () => {
    const compiler = createYamlStreamCompiler();

    compiler.push("a: 1\n");
    compiler.push("b: 2\n");

    const allPatches = compiler.getPatches();
    expect(allPatches.length).toBe(2);
    expect(allPatches[0]).toEqual({ op: "add", path: "/a", value: 1 });
    expect(allPatches[1]).toEqual({ op: "add", path: "/b", value: 2 });
  });

  it("resets to initial state", () => {
    const compiler = createYamlStreamCompiler();

    compiler.push("root: main\n");
    expect(compiler.getResult()).toHaveProperty("root", "main");

    compiler.reset();
    expect(compiler.getResult()).toEqual({});
    expect(compiler.getPatches()).toEqual([]);
  });

  it("resets with initial value and diffs from it", () => {
    const compiler = createYamlStreamCompiler();

    compiler.reset({ root: "existing", elements: {} });

    // The YAML includes root, so the initial value is preserved in the diff base
    const { newPatches } = compiler.push(
      "root: existing\nelements:\n  main:\n    type: Card\n",
    );
    const { result } = compiler.flush();

    expect(result).toHaveProperty("root", "existing");
    expect(result).toHaveProperty("elements");
    // Only the new element should be patched, not root (unchanged)
    expect(newPatches.find((p) => p.path === "/root")).toBeUndefined();
    expect(newPatches.find((p) => p.path === "/elements/main")).toBeDefined();
  });

  it("handles a full spec YAML", () => {
    const compiler = createYamlStreamCompiler();

    const yaml = [
      "root: main\n",
      "elements:\n",
      "  main:\n",
      "    type: Card\n",
      "    props:\n",
      "      title: Dashboard\n",
      "    children:\n",
      "      - metric-1\n",
      "  metric-1:\n",
      "    type: Metric\n",
      "    props:\n",
      "      label: Revenue\n",
      '      value: "$1.2M"\n',
      "    children: []\n",
      "state:\n",
      "  revenue: 1200000\n",
    ];

    for (const line of yaml) {
      compiler.push(line);
    }
    const { result } = compiler.flush();

    expect(result.root).toBe("main");
    expect(result.state).toEqual({ revenue: 1200000 });

    const elements = result.elements as Record<string, Record<string, unknown>>;
    expect(elements.main).toBeDefined();
    expect(elements["metric-1"]).toBeDefined();
    expect((elements["metric-1"]!.props as Record<string, unknown>).label).toBe(
      "Revenue",
    );
  });

  it("does not crash on invalid YAML mid-stream", () => {
    const compiler = createYamlStreamCompiler();

    // Partial YAML that won't parse
    compiler.push("elements:\n");
    compiler.push("  main:\n");
    compiler.push("    type: "); // incomplete value — no newline yet

    // Should not throw, result should still be from last successful parse
    const r = compiler.push("\n");
    expect(r.result).toBeDefined();
  });

  it("YAML 1.2 does not coerce yes/no/on/off to booleans", () => {
    const compiler = createYamlStreamCompiler();

    compiler.push("active: yes\n");
    compiler.push("disabled: no\n");
    compiler.push("on_value: on\n");
    compiler.push("off_value: off\n");

    const { result } = compiler.flush();
    // YAML 1.2 (yaml v2 default) treats these as strings, not booleans
    expect(result.active).toBe("yes");
    expect(result.disabled).toBe("no");
    expect(result.on_value).toBe("on");
    expect(result.off_value).toBe("off");
  });
});
