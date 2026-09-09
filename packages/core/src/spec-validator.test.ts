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

  it("detects missing children in named slots", () => {
    const spec: Spec = {
      root: "root",
      elements: {
        root: {
          type: "Layout",
          props: {},
          slots: { header: ["nonexistent"] },
        },
      },
    };
    const result = validateSpec(spec);
    expect(result.valid).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        code: "missing_child",
        elementKey: "root",
        message: expect.stringContaining('slot "header"'),
      }),
    );
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

  it("detects action_in_props (legacy pattern)", () => {
    const spec: Spec = {
      root: "root",
      elements: {
        root: {
          type: "Button",
          props: { label: "Submit", action: "submitForm" },
          children: [],
        },
      },
    };
    const result = validateSpec(spec);
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.code === "action_in_props")).toBe(true);
  });

  it("detects actionParams_in_props (legacy pattern)", () => {
    const spec: Spec = {
      root: "root",
      elements: {
        root: {
          type: "Button",
          props: {
            label: "Submit",
            action: "submitForm",
            actionParams: { formId: "main" },
          },
          children: [],
        },
      },
    };
    const result = validateSpec(spec);
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.code === "actionParams_in_props")).toBe(
      true,
    );
  });

  it("detects children_in_props", () => {
    const spec: Spec = {
      root: "root",
      elements: {
        root: {
          type: "Stack",
          props: { children: ["child1", "child2"] },
          children: [],
        },
        child1: { type: "Text", props: {}, children: [] },
        child2: { type: "Text", props: {}, children: [] },
      },
    };
    const result = validateSpec(spec);
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.code === "children_in_props")).toBe(
      true,
    );
  });

  it("detects state_in_props", () => {
    const spec: Spec = {
      root: "root",
      elements: {
        root: {
          type: "Stack",
          props: { state: { count: 0 } },
          children: [],
        },
      },
    };
    const result = validateSpec(spec);
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.code === "state_in_props")).toBe(true);
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

  it("treats named slot children as reachable", () => {
    const spec: Spec = {
      root: "root",
      elements: {
        root: {
          type: "Layout",
          props: {},
          slots: { header: ["heading"] },
        },
        heading: { type: "Heading", props: {} },
      },
    };
    const result = validateSpec(spec, { checkOrphans: true });
    expect(result.valid).toBe(true);
    expect(result.issues).toHaveLength(0);
  });
});

// =============================================================================
// autoFixSpec
// =============================================================================

describe("repeat validation", () => {
  it("rejects repeat without children", () => {
    const result = validateSpec({
      root: "list",
      state: { items: [{ id: "1" }] },
      elements: {
        list: {
          type: "Stack",
          props: {},
          repeat: { statePath: "/items" },
          children: [],
        },
      },
    });
    expect(result.valid).toBe(false);
    expect(
      result.issues.some((i) => i.code === "repeat_without_children"),
    ).toBe(true);
  });

  it("rejects repeat over a non-array state value", () => {
    const result = validateSpec({
      root: "list",
      state: { items: { "1": { title: "x" } } },
      elements: {
        list: {
          type: "Stack",
          props: {},
          repeat: { statePath: "/items" },
          children: ["card"],
        },
        card: { type: "Text", props: {}, children: [] },
      },
    });
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.code === "repeat_state_mismatch")).toBe(
      true,
    );
  });

  it("rejects repeat over a missing state path when state is provided", () => {
    const result = validateSpec({
      root: "list",
      state: { other: [] },
      elements: {
        list: {
          type: "Stack",
          props: {},
          repeat: { statePath: "/items" },
          children: ["card"],
        },
        card: { type: "Text", props: {}, children: [] },
      },
    });
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.code === "repeat_state_mismatch")).toBe(
      true,
    );
  });

  it("accepts a well-formed repeat and skips state checks when no state is provided", () => {
    const withState = validateSpec({
      root: "list",
      state: { items: [{ id: "1" }] },
      elements: {
        list: {
          type: "Stack",
          props: {},
          repeat: { statePath: "/items" },
          children: ["card"],
        },
        card: { type: "Text", props: {}, children: [] },
      },
    });
    expect(withState.valid).toBe(true);
    const runtimeState = validateSpec({
      root: "list",
      elements: {
        list: {
          type: "Stack",
          props: {},
          repeat: { statePath: "/items" },
          children: ["card"],
        },
        card: { type: "Text", props: {}, children: [] },
      },
    });
    expect(runtimeState.valid).toBe(true);
  });

  it("accepts a nested repeat relative to the enclosing item", () => {
    const result = validateSpec({
      root: "groups",
      state: {
        groups: [{ subitems: [{ label: "a" }] }],
      },
      elements: {
        groups: {
          type: "Stack",
          props: {},
          repeat: { statePath: "/groups" },
          children: ["subitems"],
        },
        subitems: {
          type: "Stack",
          props: {},
          repeat: { statePath: { $item: "subitems" } },
          children: ["label"],
        },
        label: { type: "Text", props: {}, children: [] },
      },
    });

    expect(result.valid).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it("rejects a relative repeat outside repeat scope", () => {
    const result = validateSpec({
      root: "items",
      state: { items: [{ label: "root" }] },
      elements: {
        items: {
          type: "Stack",
          props: {},
          repeat: { statePath: { $item: "items" } },
          children: ["label"],
        },
        label: { type: "Text", props: {}, children: [] },
      },
    });

    expect(result.valid).toBe(false);
    expect(
      result.issues.some((issue) => issue.code === "repeat_item_outside_scope"),
    ).toBe(true);
  });

  it("does not give named slots the repeat scope created by their element", () => {
    const result = validateSpec({
      root: "items",
      state: { items: [{ nested: [] }] },
      elements: {
        items: {
          type: "Layout",
          props: {},
          repeat: { statePath: "/items" },
          children: ["body"],
          slots: { header: ["nested"] },
        },
        body: { type: "Text", props: {}, children: [] },
        nested: {
          type: "Stack",
          props: {},
          repeat: { statePath: { $item: "nested" } },
          children: ["label"],
        },
        label: { type: "Text", props: {}, children: [] },
      },
    });

    expect(
      result.issues.some((issue) => issue.code === "repeat_item_outside_scope"),
    ).toBe(true);
  });

  it("accepts relative repeat structure when the outer sample array is empty", () => {
    const result = validateSpec({
      root: "groups",
      state: { groups: [] },
      elements: {
        groups: {
          type: "Stack",
          props: {},
          repeat: { statePath: "/groups" },
          children: ["subitems"],
        },
        subitems: {
          type: "Stack",
          props: {},
          repeat: { statePath: { $item: "subitems" } },
          children: ["label"],
        },
        label: { type: "Text", props: {}, children: [] },
      },
    });

    expect(result.valid).toBe(true);
  });

  it("rejects a nested relative repeat that does not resolve to an array", () => {
    const result = validateSpec({
      root: "groups",
      state: { groups: [{ subitems: { label: "a" } }] },
      elements: {
        groups: {
          type: "Stack",
          props: {},
          repeat: { statePath: "/groups" },
          children: ["subitems"],
        },
        subitems: {
          type: "Stack",
          props: {},
          repeat: { statePath: { $item: "/subitems" } },
          children: ["label"],
        },
        label: { type: "Text", props: {}, children: [] },
      },
    });

    expect(result.valid).toBe(false);
    expect(
      result.issues.some((issue) => issue.code === "repeat_state_mismatch"),
    ).toBe(true);
  });

  it("does not duplicate repeat issues for the same structural context", () => {
    const result = validateSpec({
      root: "root",
      state: { items: [] },
      elements: {
        root: {
          type: "Stack",
          props: {},
          children: ["left", "right"],
        },
        left: {
          type: "Stack",
          props: {},
          children: ["shared"],
        },
        right: {
          type: "Stack",
          props: {},
          children: ["shared"],
        },
        shared: {
          type: "Stack",
          props: {},
          repeat: { statePath: { $item: "items" } },
          children: ["label"],
        },
        label: { type: "Text", props: {}, children: [] },
      },
    });

    expect(
      result.issues.filter(
        (issue) => issue.code === "repeat_item_outside_scope",
      ),
    ).toHaveLength(1);
  });

  it("validates a reused repeat separately inside and outside scope", () => {
    const result = validateSpec({
      root: "root",
      state: { groups: [{ items: [] }] },
      elements: {
        root: {
          type: "Stack",
          props: {},
          children: ["groups", "shared"],
        },
        groups: {
          type: "Stack",
          props: {},
          repeat: { statePath: "/groups" },
          children: ["shared"],
        },
        shared: {
          type: "Stack",
          props: {},
          repeat: { statePath: { $item: "items" } },
          children: ["label"],
        },
        label: { type: "Text", props: {}, children: [] },
      },
    });

    expect(
      result.issues.filter(
        (issue) => issue.code === "repeat_item_outside_scope",
      ),
    ).toHaveLength(1);
    expect(
      result.issues.filter((issue) => issue.code === "repeat_state_mismatch"),
    ).toHaveLength(0);
  });

  it("terminates repeat validation for cyclic child graphs", () => {
    const result = validateSpec({
      root: "groups",
      state: { groups: [{ items: [] }] },
      elements: {
        groups: {
          type: "Stack",
          props: {},
          repeat: { statePath: "/groups" },
          children: ["items"],
        },
        items: {
          type: "Stack",
          props: {},
          repeat: { statePath: { $item: "items" } },
          children: ["groups"],
        },
      },
    });

    expect(
      result.issues.filter((issue) => issue.code === "repeat_state_mismatch"),
    ).toHaveLength(0);
  });
});

describe("visible condition validation", () => {
  const base = (visible: unknown): Spec => ({
    root: "root",
    elements: {
      root: {
        type: "Text",
        props: { text: "hi" },
        children: [],
        visible: visible as Spec["elements"][string]["visible"],
      },
    },
  });

  it("accepts documented forms", () => {
    for (const visible of [
      true,
      false,
      { $state: "/tab", eq: "home" },
      { $item: "status", eq: "todo" },
      { $index: true, lt: 3 },
      [
        { $state: "/a", eq: 1 },
        { $item: "b", neq: 2 },
      ],
      { $or: [{ $state: "/a", eq: 1 }, { $and: [{ $item: "b", not: true }] }] },
    ]) {
      expect(validateSpec(base(visible)).valid).toBe(true);
    }
  });

  it("rejects conditions mixing $state and $item (silently hidden at runtime)", () => {
    const result = validateSpec(
      base([{ $state: "/tasks", $item: "status", eq: "todo" }]),
    );
    expect(result.valid).toBe(false);
    expect(
      result.issues.some((issue) => issue.code === "invalid_visible"),
    ).toBe(true);
  });

  it("rejects unknown condition shapes", () => {
    const result = validateSpec(base({ when: "/tasks", is: "todo" }));
    expect(result.valid).toBe(false);
    expect(result.issues[0]!.code).toBe("invalid_visible");
  });
});

describe("autoFixSpec", () => {
  it("prunes children references to undefined elements", () => {
    const spec: Spec = {
      root: "root",
      elements: {
        root: { type: "Card", props: {}, children: ["text", "ghost"] },
        text: { type: "Text", props: { text: "hi" }, children: [] },
      },
    };
    const { spec: fixed, fixes, fixDetails } = autoFixSpec(spec);
    expect(fixed.elements.root!.children).toEqual(["text"]);
    expect(fixes).toEqual([
      'Removed reference to undefined element "ghost" from children of "root".',
    ]);
    expect(fixDetails).toEqual([
      {
        message:
          'Removed reference to undefined element "ghost" from children of "root".',
        lossy: true,
      },
    ]);
    expect(validateSpec(fixed).valid).toBe(true);
  });

  it("leaves intact children untouched", () => {
    const spec: Spec = {
      root: "root",
      elements: {
        root: { type: "Card", props: {}, children: ["text"] },
        text: { type: "Text", props: { text: "hi" }, children: [] },
      },
    };
    const { spec: fixed, fixes } = autoFixSpec(spec);
    expect(fixed.elements.root!.children).toEqual(["text"]);
    expect(fixes).toEqual([]);
  });

  it("prunes undefined children from named slots", () => {
    const spec: Spec = {
      root: "root",
      elements: {
        root: {
          type: "Layout",
          props: {},
          slots: { header: ["heading", "ghost"] },
        },
        heading: { type: "Heading", props: {} },
      },
    };
    const { spec: fixed, fixDetails } = autoFixSpec(spec);
    expect(fixed.elements.root!.slots).toEqual({ header: ["heading"] });
    expect(fixDetails).toContainEqual({
      message:
        'Removed reference to undefined element "ghost" from slot "header" of "root".',
      lossy: true,
    });
    expect(validateSpec(fixed).valid).toBe(true);
  });

  it("does not prune a repeat container down to zero children", () => {
    const spec: Spec = {
      root: "list",
      state: { items: [{ id: "1" }] },
      elements: {
        list: {
          type: "Stack",
          props: {},
          repeat: { statePath: "/items" },
          children: ["ghost"],
        },
      },
    };
    const { spec: fixed, fixDetails } = autoFixSpec(spec);
    expect(fixed.elements.list!.children).toEqual(["ghost"]);
    expect(fixDetails).toEqual([]);
    // The real problem (missing template) stays visible to the repair loop.
    const result = validateSpec(fixed);
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.code === "missing_child")).toBe(true);
  });

  it("withholds lossy fixes when options.lossy is false", () => {
    const spec: Spec = {
      root: "root",
      elements: {
        root: {
          type: "Card",
          props: { visible: true },
          children: ["ghost"],
        },
      },
    };
    const { spec: fixed, fixDetails } = autoFixSpec(spec, { lossy: false });
    expect(fixed.elements.root!.children).toEqual(["ghost"]);
    expect(fixDetails.every((fix) => !fix.lossy)).toBe(true);
    expect(fixDetails.length).toBeGreaterThan(0);
  });

  it("classifies field relocations as lossless", () => {
    const { fixDetails } = autoFixSpec({
      root: "root",
      elements: {
        root: {
          type: "Text",
          props: { text: "hi", visible: true },
          children: [],
        },
      },
    });
    expect(fixDetails).toEqual([
      {
        message: 'Moved "visible" from props to element level on "root".',
        lossy: false,
      },
    ]);
  });

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

  it("moves children from props to element level", () => {
    const spec: Spec = {
      root: "root",
      elements: {
        root: {
          type: "Stack",
          props: { children: ["child1", "child2"] },
          children: [],
        },
        child1: { type: "Text", props: {}, children: [] },
        child2: { type: "Text", props: {}, children: [] },
      },
    };
    const { spec: fixed, fixes } = autoFixSpec(spec);
    expect(
      (fixed.elements.root.props as Record<string, unknown>).children,
    ).toBeUndefined();
    expect(fixed.elements.root.children).toEqual(["child1", "child2"]);
    expect(fixes.some((f) => f.includes('"children"'))).toBe(true);
  });

  it("converts legacy action/actionParams to on.press", () => {
    const spec: Spec = {
      root: "root",
      elements: {
        root: {
          type: "Button",
          props: {
            label: "Submit",
            action: "submitForm",
            actionParams: { formId: "main" },
          },
          children: [],
        },
      },
    };
    const { spec: fixed, fixes } = autoFixSpec(spec);
    const props = fixed.elements.root.props as Record<string, unknown>;
    expect(props.action).toBeUndefined();
    expect(props.actionParams).toBeUndefined();
    expect(fixed.elements.root.on).toEqual({
      press: {
        action: "submitForm",
        params: { formId: "main" },
      },
    });
    expect(fixes.some((f) => f.includes("legacy"))).toBe(true);
  });

  it("converts legacy action without params to on.press", () => {
    const spec: Spec = {
      root: "root",
      elements: {
        root: {
          type: "Button",
          props: { label: "OK", action: "confirm" },
          children: [],
        },
      },
    };
    const { spec: fixed, fixes } = autoFixSpec(spec);
    expect(fixed.elements.root.on).toEqual({
      press: { action: "confirm" },
    });
    expect(fixes.length).toBeGreaterThan(0);
  });
});
