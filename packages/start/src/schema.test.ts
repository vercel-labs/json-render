import { describe, expect, it } from "vitest";
import { schema, type StartSpec } from "./schema";

const catalog = schema.createCatalog({
  components: {},
  actions: {},
});

describe("@json-render/start schema", () => {
  it("accepts the minimal public Start app spec shape", () => {
    const spec = {
      routes: {
        "/": {
          page: {
            root: "root",
            elements: {
              root: {
                type: "Card",
                props: {},
                children: [],
              },
            },
          },
        },
      },
    };

    const result = catalog.validate(spec);
    expect(result.success).toBe(true);
    expect(result.data).toEqual(spec);
  });

  it("preserves optional metadata fields during validation", () => {
    const spec = {
      metadata: {
        title: "Home",
        alternates: {
          canonical: "https://example.com",
        },
      },
      routes: {
        "/": {
          page: {
            root: "root",
            elements: {
              root: {
                type: "Card",
                props: {},
                children: [],
              },
            },
          },
        },
      },
    };

    const result = catalog.validate(spec);
    expect(result.success).toBe(true);
    expect(result.data).toEqual(spec);
  });

  it("still requires children on every page element", () => {
    const result = catalog.validate({
      routes: {
        "/": {
          page: {
            root: "root",
            elements: {
              root: {
                type: "Card",
                props: {},
              },
            },
          },
        },
      },
    });

    expect(result.success).toBe(false);
  });

  it("infers documented Start fields as optional", () => {
    type InferredSpec = StartSpec<Parameters<typeof schema.createCatalog>[0]>;

    const spec: InferredSpec = {
      routes: {
        "/": {
          page: {
            root: "root",
            elements: {
              root: {
                type: "Card",
                props: {},
                children: [],
              },
            },
          },
        },
      },
    };

    expect(spec.routes["/"]?.page.root).toBe("root");
  });
});
