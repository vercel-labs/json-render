import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/svelte";
import type { Spec } from "@json-render/core";
import RendererWithProvider from "./RendererWithProvider.test.svelte";
import TestContainer from "./TestContainer.svelte";
import TestText from "./TestText.svelte";
import TestButton from "./TestButton.svelte";
import { defineRegistry } from "./renderer.js";

describe("Renderer", () => {
  afterEach(() => {
    cleanup();
  });

  const { registry } = defineRegistry(null as any, {
    components: {
      Container: TestContainer,
      Text: TestText,
      Button: TestButton,
    },
  });

  function mountRenderer(
    spec: Spec | null,
    options: { loading?: boolean } = {},
  ) {
    return render(RendererWithProvider, {
      props: {
        spec,
        registry,
        loading: options.loading ?? false,
        initialState: spec?.state ?? {},
      },
    });
  }

  it("renders nothing for null spec", () => {
    const { container } = mountRenderer(null);

    // Should have no content rendered from Renderer
    expect(container.querySelector(".test-container")).toBeNull();
    expect(container.querySelector(".test-text")).toBeNull();
  });

  it("renders nothing for spec with empty root", () => {
    const spec: Spec = { root: "", elements: {} };
    const { container } = mountRenderer(spec);

    expect(container.querySelector(".test-container")).toBeNull();
  });

  it("renders a single element", () => {
    const spec: Spec = {
      root: "text1",
      elements: {
        text1: {
          type: "Text",
          props: { text: "Hello World" },
          children: [],
        },
      },
    };
    const { container } = mountRenderer(spec);

    const textEl = container.querySelector(".test-text");
    expect(textEl).not.toBeNull();
    expect(textEl?.textContent).toBe("Hello World");
  });

  it("renders nested elements", () => {
    const spec: Spec = {
      root: "container",
      elements: {
        container: {
          type: "Container",
          props: { title: "My Container" },
          children: ["text1", "text2"],
        },
        text1: {
          type: "Text",
          props: { text: "First" },
          children: [],
        },
        text2: {
          type: "Text",
          props: { text: "Second" },
          children: [],
        },
      },
    };
    const { container } = mountRenderer(spec);

    const containerEl = container.querySelector(".test-container");
    expect(containerEl).not.toBeNull();
    expect(containerEl?.querySelector("h2")?.textContent).toBe("My Container");

    const texts = container.querySelectorAll(".test-text");
    expect(texts).toHaveLength(2);
    expect(texts[0]?.textContent).toBe("First");
    expect(texts[1]?.textContent).toBe("Second");
  });

  it("renders deeply nested elements", () => {
    const spec: Spec = {
      root: "outer",
      elements: {
        outer: {
          type: "Container",
          props: { title: "Outer" },
          children: ["inner"],
        },
        inner: {
          type: "Container",
          props: { title: "Inner" },
          children: ["text"],
        },
        text: {
          type: "Text",
          props: { text: "Deep text" },
          children: [],
        },
      },
    };
    const { container } = mountRenderer(spec);

    const containers = container.querySelectorAll(".test-container");
    expect(containers).toHaveLength(2);

    const text = container.querySelector(".test-text");
    expect(text?.textContent).toBe("Deep text");
  });

  it("passes loading prop to components", () => {
    const spec: Spec = {
      root: "container",
      elements: {
        container: {
          type: "Container",
          props: {},
          children: [],
        },
      },
    };
    const { container } = mountRenderer(spec, { loading: true });

    const containerEl = container.querySelector(".test-container");
    expect(containerEl?.getAttribute("data-loading")).toBe("true");
  });

  it("renders nothing for unknown component types without fallback", () => {
    const spec: Spec = {
      root: "unknown",
      elements: {
        unknown: {
          type: "UnknownType",
          props: {},
          children: [],
        },
      },
    };
    const { container } = mountRenderer(spec);

    // No elements should be rendered for unknown type
    expect(container.querySelector(".test-container")).toBeNull();
    expect(container.querySelector(".test-text")).toBeNull();
  });

  it("skips missing child elements gracefully", () => {
    const spec: Spec = {
      root: "container",
      elements: {
        container: {
          type: "Container",
          props: { title: "Parent" },
          children: ["existing", "missing"],
        },
        existing: {
          type: "Text",
          props: { text: "I exist" },
          children: [],
        },
        // "missing" element is not defined
      },
    };
    const { container } = mountRenderer(spec);

    const containerEl = container.querySelector(".test-container");
    expect(containerEl).not.toBeNull();

    const texts = container.querySelectorAll(".test-text");
    expect(texts).toHaveLength(1);
    expect(texts[0]?.textContent).toBe("I exist");
  });
});
