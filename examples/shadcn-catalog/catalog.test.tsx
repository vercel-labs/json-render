import { describe, it, expect } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import { JSONUIProvider, Renderer, defineRegistry } from "@json-render/react";
import { shadcnComponents } from "@json-render/shadcn";
import { catalog } from "./catalog/catalog";
import { pageSpec } from "./catalog/spec";

describe("shadcn catalog example", () => {
  it("validates the page spec against the catalog", () => {
    const result = catalog.validate(pageSpec);
    expect(result.success).toBe(true);
  });

  it("renders the page spec without error", () => {
    const { registry, handlers } = defineRegistry(catalog, {
      components: {
        Card: shadcnComponents.Card,
        Stack: shadcnComponents.Stack,
        Heading: shadcnComponents.Heading,
        Text: shadcnComponents.Text,
        Badge: shadcnComponents.Badge,
        Alert: shadcnComponents.Alert,
        Button: shadcnComponents.Button,
        Metric: ({ props }) => (
          <div data-testid="metric">
            {props.label}: {props.value}
          </div>
        ),
      },
      actions: {
        trackMetric: async () => {},
      },
    });

    render(
      <JSONUIProvider
        registry={registry}
        handlers={handlers(
          () => undefined,
          () => ({}),
        )}
      >
        <Renderer spec={pageSpec} registry={registry} />
      </JSONUIProvider>,
    );

    expect(screen.getByText("Account overview")).toBeDefined();
    const metric = screen.getByTestId("metric");
    expect(metric.textContent).toContain("Revenue");
    expect(metric.textContent).toContain("$12,480");
  });
});
