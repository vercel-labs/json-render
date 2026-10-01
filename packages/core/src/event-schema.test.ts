import { describe, expect, it } from "vitest";
import { z } from "zod";
import { schema } from "../../react/src/schema";
import { defineCatalog, defineSchema } from "./schema";

const catalog = defineCatalog(schema, {
  components: {
    Button: { props: z.object({ label: z.string() }), events: ["press"] },
    Input: { props: z.object({}), events: ["change", "press"] },
    Text: { props: z.object({}) },
  },
  actions: { save: { description: "Save the form" } },
});

function spec(on?: unknown) {
  return {
    root: "button",
    elements: {
      button: {
        type: "Button",
        props: { label: "Save" },
        children: [],
        ...(on === undefined ? {} : { on }),
      },
    },
  };
}

describe("React catalog event schema", () => {
  it("exports optional declared events with catalog and built-in actions", () => {
    expect(catalog.jsonSchema()).toMatchObject({
      properties: {
        elements: {
          additionalProperties: {
            properties: {
              on: {
                type: "object",
                properties: {
                  press: {
                    anyOf: [
                      {
                        properties: {
                          action: {
                            enum: [
                              "save",
                              "setState",
                              "pushState",
                              "removeState",
                              "validateForm",
                            ],
                          },
                        },
                        required: ["action"],
                      },
                      { type: "array", items: { required: ["action"] } },
                    ],
                  },
                  change: {},
                },
                additionalProperties: false,
              },
            },
            required: ["type", "props", "children"],
          },
        },
      },
    });
  });

  it("preserves single bindings and optional action metadata during validation", () => {
    const on = {
      press: {
        action: "save",
        params: { name: { $state: "/name" } },
        confirm: {
          title: "Save?",
          message: "Save this form?",
          variant: "default",
        },
        onSuccess: { navigate: "/saved" },
        onError: { set: { "/error": true } },
        preventDefault: true,
      },
    };
    const input = spec(on);
    expect(catalog.validate(input)).toMatchObject({
      success: true,
      data: input,
    });
    expect(catalog.zodSchema().parse(input)).toEqual(input);
  });

  it("preserves action arrays and allows built-ins without catalog handlers", () => {
    const input = spec({
      press: [
        { action: "setState", params: { statePath: "/saved", value: true } },
        { action: "save" },
      ],
    });
    expect(catalog.validate(input)).toMatchObject({
      success: true,
      data: input,
    });
  });

  it("preserves nested JSON and dynamic expressions in invocation and callback params", () => {
    const input = spec({
      press: {
        action: "pushState",
        params: {
          statePath: "/todos",
          value: {
            title: { $state: "/title" },
            tags: ["new"],
            item: { $item: "id" },
          },
        },
        onSuccess: { action: "save", params: { rows: [{ id: 1 }] } },
        onError: {
          action: "setState",
          params: { statePath: "/error", value: { message: "Failed" } },
        },
      },
    });
    expect(catalog.validate(input)).toMatchObject({
      success: true,
      data: input,
    });
  });

  it.each([
    { click: { action: "save" } },
    { press: { action: "missing" } },
    { press: {} },
    { press: "save" },
    { press: [{ action: "save" }, { action: "missing" }] },
    { press: { action: "save", onSuccess: { action: "missing" } } },
    { press: { action: "save", onError: { action: "missing" } } },
  ])("rejects undeclared events and invalid bindings: %j", (on) => {
    expect(catalog.validate(spec(on)).success).toBe(false);
  });

  it("keeps on optional", () => {
    const input = spec();
    expect(catalog.validate(input)).toMatchObject({
      success: true,
      data: input,
    });
  });

  it("allows built-ins when the catalog has no custom actions", () => {
    const builtInCatalog = defineCatalog(schema, {
      components: {
        Button: { props: z.object({ label: z.string() }), events: ["press"] },
      },
      actions: {},
    });
    const input = spec({ press: { action: "setState" } });
    expect(builtInCatalog.validate(input)).toMatchObject({
      success: true,
      data: input,
    });
  });

  it("supports catalogs without events", () => {
    const staticCatalog = defineCatalog(schema, {
      components: { Button: { props: z.object({ label: z.string() }) } },
      actions: {},
    });
    expect(staticCatalog.validate(spec()).success).toBe(true);
    expect(
      staticCatalog.validate(spec({ press: { action: "setState" } })).success,
    ).toBe(false);
  });

  it("exports strict optional event bindings without dynamic event keys", () => {
    const flatSchema = defineSchema((s) => ({
      spec: s.object({
        on: { ...s.eventsOf("catalog.controls"), ...s.optional() },
      }),
      catalog: s.object({
        controls: s.map({ events: s.array(s.string()) }),
        actions: s.map({ description: s.string() }),
      }),
    }));
    const flatCatalog = defineCatalog(flatSchema, {
      controls: { Button: { events: ["press"] } },
      actions: { save: {} },
    });
    expect(flatCatalog.jsonSchema({ strict: true })).toMatchObject({
      properties: {
        on: {
          anyOf: [
            {
              type: "object",
              properties: { press: { anyOf: [{}, { type: "null" }] } },
              required: ["press"],
              additionalProperties: false,
            },
            { type: "null" },
          ],
        },
      },
      required: ["on"],
      additionalProperties: false,
    });
    expect(
      flatCatalog.validate({ on: { press: { action: "save" } } }).success,
    ).toBe(true);
  });
});
