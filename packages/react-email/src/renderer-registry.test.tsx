import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { defineCatalog, type Spec } from "@json-render/core";
import { schema } from "./schema";
import { standardComponentDefinitions } from "./catalog";
import type { Components } from "./catalog-types";
import {
  JSONUIProvider,
  Renderer,
  defineRegistry,
  standardComponents,
} from "./index";

const catalog = defineCatalog(schema, {
  components: standardComponentDefinitions,
  actions: {},
});

describe("react-email defineRegistry", () => {
  it("supports ComponentRenderer-style components (element-based)", () => {
    const { registry } = defineRegistry(catalog, {
      // Reproduces the app wiring that passes standardComponents through defineRegistry.
      components: standardComponents as unknown as Components<typeof catalog>,
    });

    const spec: Spec = {
      root: "text",
      elements: {
        text: {
          type: "Text",
          props: { text: "Welcome email", style: {} },
          children: [],
        },
      },
    };

    render(
      <JSONUIProvider>
        <Renderer spec={spec} registry={registry} includeStandard={false} />
      </JSONUIProvider>,
    );

    expect(screen.getByText("Welcome email")).toBeTruthy();
  });
});
