import { describe, it, expect } from "vitest";
import type { Spec } from "@json-render/core";
import { renderToHtml, escapeHtml } from "./render";
import type { ComponentRegistry } from "./catalog-types";

// =============================================================================
// Test registry — minimal HTML components
// =============================================================================

const testRegistry: ComponentRegistry = {
  Container: ({ props, children }) =>
    `<div class="container"${props.maxWidth ? ` style="max-width:${props.maxWidth}"` : ""}>${children}</div>`,
  Heading: ({ props }) =>
    `<${props.level || "h2"}>${escapeHtml(props.text)}</${props.level || "h2"}>`,
  Text: ({ props }) => `<p>${escapeHtml(props.content)}</p>`,
  Image: ({ props }) =>
    `<img src="${escapeHtml(props.src)}" alt="${escapeHtml(props.alt)}"${props.width ? ` width="${props.width}"` : ""} />`,
  Card: ({ props, children }) =>
    `<article class="card"><h3>${escapeHtml(props.title)}</h3>${children}</article>`,
  Link: ({ props, children }) =>
    `<a href="${escapeHtml(props.href)}">${children || escapeHtml(props.text)}</a>`,
  Section: ({ props, children }) =>
    `<section${props.id ? ` id="${escapeHtml(props.id)}"` : ""}>${children}</section>`,
  List: ({ children }) => `<ul>${children}</ul>`,
  ListItem: ({ props }) => `<li>${escapeHtml(props.text)}</li>`,
};

// =============================================================================
// Helpers
// =============================================================================

function simpleSpec(elements: Spec["elements"], root = "root"): Spec {
  return { root, elements };
}

// =============================================================================
// renderToHtml
// =============================================================================

describe("renderToHtml", () => {
  it("renders a single element", () => {
    const spec = simpleSpec({
      root: { type: "Text", props: { content: "Hello World" }, children: [] },
    });
    const html = renderToHtml(spec, { registry: testRegistry });
    expect(html).toBe("<p>Hello World</p>");
  });

  it("renders nested elements", () => {
    const spec = simpleSpec({
      root: {
        type: "Container",
        props: {},
        children: ["heading", "text"],
      },
      heading: {
        type: "Heading",
        props: { text: "Title", level: "h1" },
        children: [],
      },
      text: { type: "Text", props: { content: "Body text" }, children: [] },
    });
    const html = renderToHtml(spec, { registry: testRegistry });
    expect(html).toContain("<h1>Title</h1>");
    expect(html).toContain("<p>Body text</p>");
    expect(html).toContain('<div class="container">');
  });

  it("renders deeply nested elements", () => {
    const spec = simpleSpec({
      root: {
        type: "Container",
        props: {},
        children: ["card"],
      },
      card: {
        type: "Card",
        props: { title: "My Card" },
        children: ["inner-text"],
      },
      "inner-text": {
        type: "Text",
        props: { content: "Nested content" },
        children: [],
      },
    });
    const html = renderToHtml(spec, { registry: testRegistry });
    expect(html).toContain("My Card");
    expect(html).toContain("Nested content");
    expect(html).toContain('<div class="container">');
    expect(html).toContain('<article class="card">');
  });

  it("returns empty string for null/missing spec", () => {
    expect(renderToHtml(null as any, { registry: testRegistry })).toBe("");
    expect(
      renderToHtml(
        { root: "missing", elements: {} },
        { registry: testRegistry },
      ),
    ).toBe("");
  });

  it("skips unknown component types gracefully", () => {
    const spec = simpleSpec({
      root: { type: "Unknown", props: {}, children: [] },
    });
    const html = renderToHtml(spec, { registry: testRegistry });
    expect(html).toBe("");
  });

  it("skips missing child elements gracefully", () => {
    const spec = simpleSpec({
      root: {
        type: "Container",
        props: {},
        children: ["exists", "does-not-exist"],
      },
      exists: { type: "Text", props: { content: "I exist" }, children: [] },
    });
    const html = renderToHtml(spec, { registry: testRegistry });
    expect(html).toContain("I exist");
  });

  it("escapes HTML in props via registry components", () => {
    const spec = simpleSpec({
      root: {
        type: "Text",
        props: { content: '<script>alert("xss")</script>' },
        children: [],
      },
    });
    const html = renderToHtml(spec, { registry: testRegistry });
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("merges spec.state with options.state (options wins)", () => {
    const spec: Spec = {
      root: "root",
      elements: {
        root: {
          type: "Heading",
          props: { text: { $state: "/title" }, level: "h1" },
          children: [],
        },
      },
      state: { title: "From Spec" },
    };

    const html = renderToHtml(spec, {
      registry: testRegistry,
      state: { title: "From Options" },
    });
    expect(html).toContain("From Options");
  });

  // ---------------------------------------------------------------------------
  // Visibility
  // ---------------------------------------------------------------------------

  describe("visibility", () => {
    it("hides elements with visible: false", () => {
      const spec = simpleSpec({
        root: {
          type: "Container",
          props: {},
          children: ["visible", "hidden"],
        },
        visible: {
          type: "Text",
          props: { content: "Visible" },
          children: [],
        },
        hidden: {
          type: "Text",
          props: { content: "Hidden" },
          children: [],
          visible: false,
        },
      });
      const html = renderToHtml(spec, { registry: testRegistry });
      expect(html).toContain("Visible");
      expect(html).not.toContain("Hidden");
    });

    it("shows elements with visible: true", () => {
      const spec = simpleSpec({
        root: {
          type: "Text",
          props: { content: "Shown" },
          children: [],
          visible: true,
        },
      });
      const html = renderToHtml(spec, { registry: testRegistry });
      expect(html).toContain("Shown");
    });

    it("evaluates $state visibility conditions", () => {
      const spec = simpleSpec({
        root: {
          type: "Container",
          props: {},
          children: ["conditional"],
        },
        conditional: {
          type: "Text",
          props: { content: "Conditional" },
          children: [],
          visible: { $state: "/isOpen" },
        },
      });

      const hidden = renderToHtml(spec, {
        registry: testRegistry,
        state: { isOpen: false },
      });
      expect(hidden).not.toContain("Conditional");

      const shown = renderToHtml(spec, {
        registry: testRegistry,
        state: { isOpen: true },
      });
      expect(shown).toContain("Conditional");
    });

    it("evaluates $state equality conditions", () => {
      const spec = simpleSpec({
        root: {
          type: "Text",
          props: { content: "Admin only" },
          children: [],
          visible: { $state: "/role", eq: "admin" },
        },
      });

      expect(
        renderToHtml(spec, {
          registry: testRegistry,
          state: { role: "admin" },
        }),
      ).toContain("Admin only");
      expect(
        renderToHtml(spec, {
          registry: testRegistry,
          state: { role: "user" },
        }),
      ).toBe("");
    });
  });

  // ---------------------------------------------------------------------------
  // Prop expressions
  // ---------------------------------------------------------------------------

  describe("prop expressions", () => {
    it("resolves $state expressions in props", () => {
      const spec = simpleSpec({
        root: {
          type: "Heading",
          props: { text: { $state: "/title" }, level: "h1" },
          children: [],
        },
      });
      const html = renderToHtml(spec, {
        registry: testRegistry,
        state: { title: "Dynamic Title" },
      });
      expect(html).toContain("Dynamic Title");
    });

    it("resolves $cond/$then/$else expressions", () => {
      const spec = simpleSpec({
        root: {
          type: "Text",
          props: {
            content: {
              $cond: { $state: "/premium" },
              $then: "Welcome, VIP!",
              $else: "Welcome!",
            },
          },
          children: [],
        },
      });

      const vip = renderToHtml(spec, {
        registry: testRegistry,
        state: { premium: true },
      });
      expect(vip).toContain("Welcome, VIP!");

      const regular = renderToHtml(spec, {
        registry: testRegistry,
        state: { premium: false },
      });
      expect(regular).toContain("Welcome!");
      expect(regular).not.toContain("VIP");
    });
  });

  // ---------------------------------------------------------------------------
  // Repeat
  // ---------------------------------------------------------------------------

  describe("repeat", () => {
    it("renders children once per item in state array", () => {
      const spec: Spec = {
        root: "list",
        elements: {
          list: {
            type: "List",
            props: {},
            children: ["item"],
            repeat: { statePath: "/items", key: "id" },
          },
          item: {
            type: "ListItem",
            props: { text: { $item: "name" } },
            children: [],
          },
        },
        state: {
          items: [
            { id: "1", name: "Alice" },
            { id: "2", name: "Bob" },
            { id: "3", name: "Charlie" },
          ],
        },
      };

      const html = renderToHtml(spec, { registry: testRegistry });
      expect(html).toContain("Alice");
      expect(html).toContain("Bob");
      expect(html).toContain("Charlie");
    });

    it("renders empty string for empty state array", () => {
      const spec: Spec = {
        root: "list",
        elements: {
          list: {
            type: "List",
            props: {},
            children: ["item"],
            repeat: { statePath: "/items" },
          },
          item: {
            type: "ListItem",
            props: { text: { $item: "name" } },
            children: [],
          },
        },
        state: { items: [] },
      };

      const html = renderToHtml(spec, { registry: testRegistry });
      expect(html).toBe("");
    });

    it("renders empty string for missing state path", () => {
      const spec: Spec = {
        root: "list",
        elements: {
          list: {
            type: "List",
            props: {},
            children: ["item"],
            repeat: { statePath: "/nonexistent" },
          },
          item: {
            type: "ListItem",
            props: { text: "fallback" },
            children: [],
          },
        },
      };

      const html = renderToHtml(spec, { registry: testRegistry });
      expect(html).toBe("");
    });
  });
});

// =============================================================================
// escapeHtml
// =============================================================================

describe("escapeHtml", () => {
  it("escapes all HTML special characters", () => {
    expect(escapeHtml("&<>\"'")).toBe("&amp;&lt;&gt;&quot;&#39;");
  });

  it("handles null and undefined", () => {
    expect(escapeHtml(null)).toBe("");
    expect(escapeHtml(undefined)).toBe("");
  });

  it("converts numbers to strings", () => {
    expect(escapeHtml(42)).toBe("42");
  });

  it("passes through safe strings unchanged", () => {
    expect(escapeHtml("Hello World")).toBe("Hello World");
  });
});
