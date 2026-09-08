import { describe, expect, it } from "vitest";
import { startComponentDefinitions } from "./catalog";
import { schema, type StartSpec } from "./schema";

const catalog = schema.createCatalog({ components: {}, actions: {} });

describe("@json-render/tanstack-start schema", () => {
  it("accepts a minimal Start app spec", () => {
    const spec = {
      routes: {
        "/": {
          page: {
            root: "root",
            elements: {
              root: { type: "Card", props: {}, children: [] },
            },
          },
        },
      },
    };
    expect(catalog.validate(spec)).toMatchObject({ success: true, data: spec });
  });

  it("preserves metadata and React element features", () => {
    const spec = {
      metadata: { title: "Home", alternates: { canonical: "/" } },
      routes: {
        "/": {
          page: {
            root: "root",
            state: { active: true },
            elements: {
              root: {
                type: "Card",
                props: {},
                children: [],
                slots: { header: [] },
                visible: { $state: "/active" },
                on: { press: { action: "save" } },
                repeat: { statePath: "/items" },
                watch: { "/active": { action: "track" } },
              },
            },
          },
        },
      },
    };
    expect(catalog.validate(spec)).toMatchObject({ success: true, data: spec });
  });

  it("validates built-in Slot and Link elements in a real catalog", () => {
    const builtInCatalog = schema.createCatalog({
      components: startComponentDefinitions,
      actions: {},
    });
    const result = builtInCatalog.validate({
      routes: {
        "/": {
          page: {
            root: "link",
            elements: {
              link: {
                type: "Link",
                props: { href: "/about" },
                children: [],
              },
            },
          },
        },
      },
      layouts: {
        main: {
          root: "slot",
          elements: {
            slot: { type: "Slot", props: {}, children: [] },
          },
        },
      },
    });
    expect(result.success).toBe(true);
  });

  it("requires children on every element", () => {
    const result = catalog.validate({
      routes: {
        "/": {
          page: {
            root: "root",
            elements: { root: { type: "Card", props: {} } },
          },
        },
      },
    });
    expect(result.success).toBe(false);
  });

  it("infers optional top-level fields", () => {
    type InferredSpec = StartSpec<Parameters<typeof schema.createCatalog>[0]>;
    const spec: InferredSpec = {
      routes: {
        "/": {
          page: {
            root: "root",
            elements: {
              root: { type: "Card", props: {}, children: [] },
            },
          },
        },
      },
    };
    expect(spec.routes["/"]?.page.root).toBe("root");
  });
});
