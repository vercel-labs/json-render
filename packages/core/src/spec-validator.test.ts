import { describe, it, expect } from "vitest";
import type { Spec } from "./types";
import { validateSpec, autoFixSpec } from "./spec-validator";

// =============================================================================
// validateSpec
// =============================================================================

describe("validateSpec", () => {
  it("returns valid for a correct spec", () => {
    const spec: Spec = {
      root: "root",
      elements: {
        root: { type: "Stack", props: {}, children: ["child1"] },
        child1: { type: "Text", props: { text: "hello" }, children: [] },
      },
    };
    const result = validateSpec(spec);
    expect(result.valid).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it("detects missing root", () => {
    const spec = {
      root: "",
      elements: { a: { type: "T", props: {}, children: [] } },
    } as Spec;
    const result = validateSpec(spec);
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.code === "missing_root")).toBe(true);
  });

  it("detects root_not_found", () => {
    const spec: Spec = {
      root: "missing",
      elements: { a: { type: "T", props: {}, children: [] } },
    };
    const result = validateSpec(spec);
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.code === "root_not_found")).toBe(true);
  });

  it("detects empty spec", () => {
    const spec: Spec = { root: "r", elements: {} };
    const result = validateSpec(spec);
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.code === "empty_spec")).toBe(true);
  });

  it("detects missing_child", () => {
    const spec: Spec = {
      root: "root",
      elements: {
        root: { type: "Stack", props: {}, children: ["nonexistent"] },
      },
    };
    const result = validateSpec(spec);
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.code === "missing_child")).toBe(true);
  });

  it("detects visible_in_props", () => {
    const spec: Spec = {
      root: "root",
      elements: {
        root: {
          type: "Text",
          props: { visible: { $state: "/show" } },
          children: [],
        },
      },
    };
    const result = validateSpec(spec);
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.code === "visible_in_props")).toBe(true);
  });

  it("detects on_in_props", () => {
    const spec: Spec = {
      root: "root",
      elements: {
        root: {
          type: "Button",
          props: { on: { press: { action: "doSomething" } } },
          children: [],
        },
      },
    };
    const result = validateSpec(spec);
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.code === "on_in_props")).toBe(true);
  });

  it("detects repeat_in_props", () => {
    const spec: Spec = {
      root: "root",
      elements: {
        root: {
          type: "Stack",
          props: { repeat: { statePath: "/items" } },
          children: [],
        },
      },
    };
    const result = validateSpec(spec);
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.code === "repeat_in_props")).toBe(true);
  });

  it("detects watch_in_props", () => {
    const spec: Spec = {
      root: "root",
      elements: {
        root: {
          type: "Select",
          props: {
            watch: {
              "/form/country": { action: "loadCities" },
            },
          },
          children: [],
        },
      },
    };
    const result = validateSpec(spec);
    expect(result.valid).toBe(false);
    const watchIssue = result.issues.find((i) => i.code === "watch_in_props");
    expect(watchIssue).toBeDefined();
    expect(watchIssue!.elementKey).toBe("root");
  });

  it("detects orphaned elements when checkOrphans is true", () => {
    const spec: Spec = {
      root: "root",
      elements: {
        root: { type: "Stack", props: {}, children: [] },
        orphan: { type: "Text", props: {}, children: [] },
      },
    };
    const result = validateSpec(spec, { checkOrphans: true });
    expect(result.valid).toBe(true);
    expect(result.issues.some((i) => i.code === "orphaned_element")).toBe(true);
  });
});

// =============================================================================
// autoFixSpec
// =============================================================================

describe("autoFixSpec", () => {
  it("moves visible from props to element level", () => {
    const spec: Spec = {
      root: "root",
      elements: {
        root: {
          type: "Text",
          props: { text: "hi", visible: { $state: "/show" } },
          children: [],
        },
      },
    };
    const { spec: fixed, fixes } = autoFixSpec(spec);
    expect(
      (fixed.elements.root.props as Record<string, unknown>).visible,
    ).toBeUndefined();
    expect(fixed.elements.root.visible).toEqual({ $state: "/show" });
    expect(fixes.some((f) => f.includes("visible"))).toBe(true);
  });

  it("moves on from props to element level", () => {
    const spec: Spec = {
      root: "root",
      elements: {
        root: {
          type: "Button",
          props: { label: "OK", on: { press: { action: "submit" } } },
          children: [],
        },
      },
    };
    const { spec: fixed, fixes } = autoFixSpec(spec);
    expect(
      (fixed.elements.root.props as Record<string, unknown>).on,
    ).toBeUndefined();
    expect(fixed.elements.root.on).toEqual({ press: { action: "submit" } });
    expect(fixes.some((f) => f.includes('"on"'))).toBe(true);
  });

  it("moves repeat from props to element level", () => {
    const spec: Spec = {
      root: "root",
      elements: {
        root: {
          type: "Stack",
          props: { repeat: { statePath: "/items" } },
          children: ["child"],
        },
        child: { type: "Text", props: {}, children: [] },
      },
    };
    const { spec: fixed, fixes } = autoFixSpec(spec);
    expect(
      (fixed.elements.root.props as Record<string, unknown>).repeat,
    ).toBeUndefined();
    expect(fixed.elements.root.repeat).toEqual({ statePath: "/items" });
    expect(fixes.some((f) => f.includes('"repeat"'))).toBe(true);
  });

  it("moves watch from props to element level", () => {
    const spec: Spec = {
      root: "root",
      elements: {
        root: {
          type: "Select",
          props: {
            label: "Country",
            watch: {
              "/form/country": { action: "loadCities" },
            },
          },
          children: [],
        },
      },
    };
    const { spec: fixed, fixes } = autoFixSpec(spec);
    expect(
      (fixed.elements.root.props as Record<string, unknown>).watch,
    ).toBeUndefined();
    expect(fixed.elements.root.watch).toEqual({
      "/form/country": { action: "loadCities" },
    });
    expect(fixes.some((f) => f.includes('"watch"'))).toBe(true);
  });

  it("returns no fixes for a correct spec", () => {
    const spec: Spec = {
      root: "root",
      elements: {
        root: {
          type: "Stack",
          props: { direction: "vertical" },
          children: [],
          watch: { "/x": { action: "y" } },
        },
      },
    };
    const { fixes } = autoFixSpec(spec);
    expect(fixes).toHaveLength(0);
  });
});
