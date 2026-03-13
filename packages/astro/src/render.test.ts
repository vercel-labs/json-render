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
// SSR-specific concerns
// =============================================================================

describe("SSR safety", () => {
  it("works without DOM globals (no window, document, navigator)", () => {
    // The renderer is pure string concatenation — verify it never
    // touches browser globals by running in a plain Node/Vitest context
    const spec = simpleSpec({
      root: {
        type: "Container",
        props: {},
        children: ["heading", "text"],
      },
      heading: {
        type: "Heading",
        props: { text: "SSR", level: "h1" },
        children: [],
      },
      text: {
        type: "Text",
        props: { content: "Server-rendered" },
        children: [],
      },
    });
    // If this throws, the renderer depends on browser APIs
    const html = renderToHtml(spec, { registry: testRegistry });
    expect(html).toContain("<h1>SSR</h1>");
    expect(html).toContain("<p>Server-rendered</p>");
  });

  it("is synchronous (no promises, no async)", () => {
    const spec = simpleSpec({
      root: { type: "Text", props: { content: "sync" }, children: [] },
    });
    const result = renderToHtml(spec, { registry: testRegistry });
    // Result is a plain string, not a Promise
    expect(typeof result).toBe("string");
    expect(result).not.toBeInstanceOf(Promise);
  });

  it("produces no script tags or event handlers in output", () => {
    const spec = simpleSpec({
      root: {
        type: "Container",
        props: {},
        children: ["card", "link"],
      },
      card: {
        type: "Card",
        props: { title: "Test" },
        children: ["text"],
      },
      text: {
        type: "Text",
        props: { content: "Content" },
        children: [],
      },
      link: {
        type: "Link",
        props: { href: "https://example.com", text: "Click" },
        children: [],
      },
    });
    const html = renderToHtml(spec, { registry: testRegistry });
    expect(html).not.toMatch(/<script[\s>]/i);
    expect(html).not.toMatch(/\bon\w+\s*=/i); // no onclick, onload, etc.
  });

  it("escapes XSS attempts in HTML attributes (href, src, alt)", () => {
    const spec = simpleSpec({
      root: {
        type: "Container",
        props: {},
        children: ["evil-link", "evil-image"],
      },
      "evil-link": {
        type: "Link",
        props: {
          href: 'javascript:alert("xss")',
          text: "Click me",
        },
        children: [],
      },
      "evil-image": {
        type: "Image",
        props: {
          src: '" onerror="alert(1)',
          alt: '"><script>alert(2)</script>',
        },
        children: [],
      },
    });
    const html = renderToHtml(spec, { registry: testRegistry });
    // href should be escaped (quotes neutralized)
    expect(html).not.toContain('onerror="alert');
    expect(html).not.toContain("<script>");
    expect(html).toContain("&quot;");
  });

  it("handles unicode content correctly", () => {
    const spec = simpleSpec({
      root: {
        type: "Text",
        props: { content: "Cafe\u0301 \u2603 \u{1F680} \u4F60\u597D" },
        children: [],
      },
    });
    const html = renderToHtml(spec, { registry: testRegistry });
    expect(html).toContain("\u2603"); // snowman
    expect(html).toContain("\u{1F680}"); // rocket emoji
    expect(html).toContain("\u4F60\u597D"); // Chinese characters
  });

  it("resolves all state at render time (simulating request-time data)", () => {
    // Simulates an SSR scenario: different state per request
    const spec = simpleSpec({
      root: {
        type: "Container",
        props: {},
        children: ["greeting", "role-badge"],
      },
      greeting: {
        type: "Heading",
        props: {
          text: {
            $cond: { $state: "/isLoggedIn" },
            $then: { $state: "/userName" },
            $else: "Guest",
          },
          level: "h1",
        },
        children: [],
      },
      "role-badge": {
        type: "Text",
        props: { content: { $state: "/role" } },
        children: [],
        visible: { $state: "/isLoggedIn" },
      },
    });

    // Request 1: logged-in admin
    const admin = renderToHtml(spec, {
      registry: testRegistry,
      state: { isLoggedIn: true, userName: "Alice", role: "admin" },
    });
    expect(admin).toContain("Alice");
    expect(admin).toContain("admin");

    // Request 2: anonymous visitor
    const guest = renderToHtml(spec, {
      registry: testRegistry,
      state: { isLoggedIn: false, userName: "", role: "" },
    });
    expect(guest).toContain("Guest");
    expect(guest).not.toContain("admin");
  });

  it("renders different output for different state (no caching leak)", () => {
    const spec = simpleSpec({
      root: {
        type: "Text",
        props: { content: { $state: "/message" } },
        children: [],
      },
    });

    const a = renderToHtml(spec, {
      registry: testRegistry,
      state: { message: "Request A" },
    });
    const b = renderToHtml(spec, {
      registry: testRegistry,
      state: { message: "Request B" },
    });

    expect(a).toContain("Request A");
    expect(a).not.toContain("Request B");
    expect(b).toContain("Request B");
    expect(b).not.toContain("Request A");
  });

  it("handles repeat with $index for position-aware rendering", () => {
    const indexRegistry: ComponentRegistry = {
      ...testRegistry,
      IndexItem: ({ props }) =>
        `<li data-index="${escapeHtml(props.index)}">${escapeHtml(props.name)}</li>`,
    };

    const spec: Spec = {
      root: "list",
      elements: {
        list: {
          type: "List",
          props: {},
          children: ["item"],
          repeat: { statePath: "/users" },
        },
        item: {
          type: "IndexItem",
          props: {
            name: { $item: "name" },
            index: { $index: true },
          },
          children: [],
        },
      },
      state: {
        users: [{ name: "Alice" }, { name: "Bob" }],
      },
    };

    const html = renderToHtml(spec, { registry: indexRegistry });
    expect(html).toContain('data-index="0"');
    expect(html).toContain('data-index="1"');
    expect(html).toContain("Alice");
    expect(html).toContain("Bob");
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
