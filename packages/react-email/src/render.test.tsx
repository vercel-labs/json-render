import { describe, it, expect } from "vitest";
import type { Spec } from "@json-render/core";
import { renderToHtml, renderToPlainText } from "./render";
import { examples } from "./__fixtures__/examples";

// =============================================================================
// Helpers
// =============================================================================

/** Minimal valid email spec — Html > Head + Body */
function minimalSpec(bodyChildren: Spec["elements"] = {}): Spec {
  return {
    root: "html",
    elements: {
      html: {
        type: "Html",
        props: { lang: "en", dir: null },
        children: ["head", "body"],
      },
      head: { type: "Head", props: {}, children: [] },
      body: {
        type: "Body",
        props: { style: null },
        children: Object.keys(bodyChildren),
      },
      ...bodyChildren,
    },
  };
}

function validateSpecStructure(spec: Spec) {
  const errors: string[] = [];

  if (!spec.elements[spec.root]) {
    errors.push(`Root element "${spec.root}" not found in elements`);
  }

  for (const [id, element] of Object.entries(spec.elements)) {
    if (element.children) {
      for (const childId of element.children) {
        if (!spec.elements[childId]) {
          errors.push(
            `Element "${id}" references child "${childId}" which does not exist`,
          );
        }
      }
    }
  }

  const referencedIds = new Set<string>();
  referencedIds.add(spec.root);
  for (const element of Object.values(spec.elements)) {
    if (element.children) {
      for (const childId of element.children) {
        referencedIds.add(childId);
      }
    }
  }
  for (const id of Object.keys(spec.elements)) {
    if (!referencedIds.has(id)) {
      errors.push(`Element "${id}" is orphaned (not referenced by any parent)`);
    }
  }

  return errors;
}

// =============================================================================
// renderToHtml
// =============================================================================

describe("renderToHtml", () => {
  it("renders a minimal spec to valid HTML", async () => {
    const html = await renderToHtml(minimalSpec());
    expect(html).toContain("<!DOCTYPE");
    expect(html).toContain("<html");
    expect(html).toContain("</html>");
  });

  it("renders Text component content", async () => {
    const spec = minimalSpec({
      text: {
        type: "Text",
        props: { text: "Hello World", style: null },
        children: [],
      },
    });
    const html = await renderToHtml(spec);
    expect(html).toContain("Hello World");
  });

  it("renders Heading with correct tag level", async () => {
    const spec = minimalSpec({
      heading: {
        type: "Heading",
        props: { text: "Title", as: "h1", style: null },
        children: [],
      },
    });
    const html = await renderToHtml(spec);
    expect(html).toContain("<h1");
    expect(html).toContain("Title");
  });

  it("renders Link with href", async () => {
    const spec = minimalSpec({
      link: {
        type: "Link",
        props: {
          text: "Click here",
          href: "https://example.com",
          style: null,
        },
        children: [],
      },
    });
    const html = await renderToHtml(spec);
    expect(html).toContain("https://example.com");
    expect(html).toContain("Click here");
  });

  it("renders Button with href and text", async () => {
    const spec = minimalSpec({
      btn: {
        type: "Button",
        props: {
          text: "Get Started",
          href: "https://example.com/start",
          style: null,
        },
        children: [],
      },
    });
    const html = await renderToHtml(spec);
    expect(html).toContain("https://example.com/start");
    expect(html).toContain("Get Started");
  });

  it("renders Image with src and alt", async () => {
    const spec = minimalSpec({
      img: {
        type: "Image",
        props: {
          src: "https://example.com/logo.png",
          alt: "Logo",
          width: 100,
          height: 50,
          style: null,
        },
        children: [],
      },
    });
    const html = await renderToHtml(spec);
    expect(html).toContain("https://example.com/logo.png");
    expect(html).toContain('alt="Logo"');
  });

  it("renders Hr element", async () => {
    const spec = minimalSpec({
      divider: {
        type: "Hr",
        props: { style: { borderColor: "#eaeaea" } },
        children: [],
      },
    });
    const html = await renderToHtml(spec);
    expect(html).toContain("<hr");
  });

  it("renders Preview text", async () => {
    const spec: Spec = {
      root: "html",
      elements: {
        html: {
          type: "Html",
          props: { lang: "en", dir: null },
          children: ["head", "preview", "body"],
        },
        head: { type: "Head", props: {}, children: [] },
        preview: {
          type: "Preview",
          props: { text: "Inbox preview text" },
          children: [],
        },
        body: { type: "Body", props: { style: null }, children: [] },
      },
    };
    const html = await renderToHtml(spec);
    expect(html).toContain("Inbox preview text");
  });

  it("renders nested Container > Section > Text", async () => {
    const spec = minimalSpec({
      container: {
        type: "Container",
        props: { style: { maxWidth: "600px" } },
        children: ["section"],
      },
      section: {
        type: "Section",
        props: { style: null },
        children: ["text"],
      },
      text: {
        type: "Text",
        props: { text: "Nested content", style: null },
        children: [],
      },
    });
    const html = await renderToHtml(spec);
    expect(html).toContain("Nested content");
  });

  it("renders Row and Column layout", async () => {
    const spec = minimalSpec({
      section: {
        type: "Section",
        props: { style: null },
        children: ["row"],
      },
      row: {
        type: "Row",
        props: { style: null },
        children: ["col1", "col2"],
      },
      col1: {
        type: "Column",
        props: { style: { width: "50%" } },
        children: ["left-text"],
      },
      col2: {
        type: "Column",
        props: { style: { width: "50%" } },
        children: ["right-text"],
      },
      "left-text": {
        type: "Text",
        props: { text: "Left side", style: null },
        children: [],
      },
      "right-text": {
        type: "Text",
        props: { text: "Right side", style: null },
        children: [],
      },
    });
    const html = await renderToHtml(spec);
    expect(html).toContain("Left side");
    expect(html).toContain("Right side");
  });

  it("renders Markdown content", async () => {
    const spec = minimalSpec({
      md: {
        type: "Markdown",
        props: {
          content: "# Hello\n\nThis is **bold** text.",
          markdownContainerStyles: null,
          markdownCustomStyles: null,
        },
        children: [],
      },
    });
    const html = await renderToHtml(spec);
    expect(html).toContain("Hello");
    expect(html).toContain("bold");
  });

  it("applies inline styles", async () => {
    const spec = minimalSpec({
      text: {
        type: "Text",
        props: {
          text: "Styled",
          style: { color: "#ff0000", fontSize: "20px" },
        },
        children: [],
      },
    });
    const html = await renderToHtml(spec);
    expect(html).toContain("color:#ff0000");
    expect(html).toContain("font-size:20px");
  });

  it("skips unknown component types gracefully", async () => {
    const spec = minimalSpec({
      unknown: {
        type: "NonExistentComponent",
        props: {},
        children: [],
      },
    });
    const html = await renderToHtml(spec);
    expect(html).toContain("<!DOCTYPE");
  });

  it("handles missing child elements gracefully", async () => {
    const spec: Spec = {
      root: "html",
      elements: {
        html: {
          type: "Html",
          props: { lang: "en", dir: null },
          children: ["head", "body"],
        },
        head: { type: "Head", props: {}, children: [] },
        body: {
          type: "Body",
          props: { style: null },
          children: ["missing-child"],
        },
      },
    };
    const html = await renderToHtml(spec);
    expect(html).toContain("<!DOCTYPE");
  });
});

// =============================================================================
// renderToPlainText
// =============================================================================

describe("renderToPlainText", () => {
  it("extracts text content from spec", async () => {
    const spec = minimalSpec({
      text: {
        type: "Text",
        props: { text: "Plain text content", style: null },
        children: [],
      },
    });
    const text = await renderToPlainText(spec);
    expect(text).toContain("Plain text content");
  });

  it("extracts link text and URL", async () => {
    const spec = minimalSpec({
      link: {
        type: "Link",
        props: {
          text: "Visit site",
          href: "https://example.com",
          style: null,
        },
        children: [],
      },
    });
    const text = await renderToPlainText(spec);
    expect(text).toContain("Visit site");
    expect(text).toContain("https://example.com");
  });

  it("returns string for minimal spec", async () => {
    const text = await renderToPlainText(minimalSpec());
    expect(typeof text).toBe("string");
  });
});

// =============================================================================
// Example specs — structural validation + render smoke tests
// =============================================================================

describe("example specs", () => {
  it("has at least one example", () => {
    expect(examples.length).toBeGreaterThan(0);
  });

  for (const example of examples) {
    describe(example.name, () => {
      it("has required metadata", () => {
        expect(example.name).toBeTruthy();
        expect(example.label).toBeTruthy();
        expect(example.description).toBeTruthy();
      });

      it("has a valid spec structure (no dangling children, no orphans)", () => {
        const errors = validateSpecStructure(example.spec);
        expect(errors).toEqual([]);
      });

      it("root element is Html with Head and Body children", () => {
        const root = example.spec.elements[example.spec.root];
        expect(root).toBeDefined();
        expect(root!.type).toBe("Html");

        const childTypes = root!.children?.map(
          (id) => example.spec.elements[id]?.type,
        );
        expect(childTypes).toContain("Head");
        expect(childTypes).toContain("Body");
      });

      it("renders to HTML without errors", async () => {
        const html = await renderToHtml(example.spec);
        expect(html).toBeTruthy();
        expect(html).toContain("<!DOCTYPE");
        expect(html).toContain("</html>");
      });

      it("renders to plain text without errors", async () => {
        const text = await renderToPlainText(example.spec);
        expect(text).toBeTruthy();
        expect(typeof text).toBe("string");
      });
    });
  }
});
