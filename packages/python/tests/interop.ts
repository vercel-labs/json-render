import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { defineCatalog } from "../../core/src/schema";
import { ActionBindingSchema, resolveAction } from "../../core/src/actions";
import { schema } from "../../react/src/schema";
import type { Spec } from "../../core/src/types";

const wire: Spec = JSON.parse(
  execFileSync(
    process.env.JSON_RENDER_PYTHON ?? "python",
    [fileURLToPath(new URL("../examples/events.py", import.meta.url))],
    {
      encoding: "utf8",
      env: { ...process.env, PYTHONIOENCODING: "utf-8" },
    },
  ),
);
const catalog = defineCatalog(schema, {
  components: {
    Card: {
      props: z.object({ title: z.string() }),
      slots: ["default", "footer"],
    },
    Button: { props: z.object({ label: z.string() }) },
    Text: { props: z.object({ text: z.string() }) },
  },
  actions: { save: { params: z.object({ count: z.number() }) } },
});

describe("Python authoring wire compatibility", () => {
  it("passes the current React spec schema and component prop schemas", () => {
    expect(catalog.zodSchema().safeParse(wire).success).toBe(true);
    expect(
      catalog.data.components.Card.props.safeParse(wire.elements.card?.props)
        .success,
    ).toBe(true);
    expect(
      catalog.data.components.Button.props.safeParse(
        wire.elements.button?.props,
      ).success,
    ).toBe(true);
    expect(
      catalog.data.components.Text.props.safeParse(wire.elements.note?.props)
        .success,
    ).toBe(true);
    expect(wire.elements.card?.props.title).toBe("Café");
    expect(wire.elements.card?.slots?.footer).toEqual(["note"]);
    const invalid = structuredClone(wire);
    invalid.elements.card!.props.title = 7;
    expect(
      catalog.data.components.Card.props.safeParse(invalid.elements.card!.props)
        .success,
    ).toBe(false);
  });

  it("uses top-level event bindings accepted by the action schema and resolver", () => {
    const raw = wire.elements.button?.on?.press;
    const action = ActionBindingSchema.parse(raw);
    expect(action.preventDefault).toBe(false);
    expect(resolveAction(action, wire.state ?? {}).params).toEqual({
      count: 2,
    });
    expect(wire.elements.button?.props).not.toHaveProperty("on");
    expect(wire.elements.button?.visible).toBe(false);
  });

  it("preserves watch action arrays and empty children", () => {
    const watch = wire.elements.button?.watch?.["/count"];
    expect(Array.isArray(watch)).toBe(true);
    if (!Array.isArray(watch)) throw new Error("watch must be an array");
    expect(
      resolveAction(ActionBindingSchema.parse(watch[0]), wire.state ?? {})
        .params.count,
    ).toBe(2);
    expect(wire.elements.note?.children).toEqual([]);
  });

  it("validates an actual TypeScript JSON Schema export in Python", () => {
    const textCatalog = defineCatalog(schema, {
      components: { Text: { props: z.object({ text: z.string() }) } },
      actions: {},
    });
    const directory = mkdtempSync(join(tmpdir(), "json-render-python-"));
    try {
      const path = join(directory, "catalog.json");
      writeFileSync(path, JSON.stringify(textCatalog.jsonSchema()));
      const result = JSON.parse(
        execFileSync(
          process.env.JSON_RENDER_PYTHON ?? "python",
          [
            fileURLToPath(new URL("./validate_export.py", import.meta.url)),
            path,
          ],
          {
            encoding: "utf8",
            env: { ...process.env, PYTHONIOENCODING: "utf-8" },
          },
        ),
      );
      expect(textCatalog.validate(result.valid).success).toBe(true);
      expect(result.valid.elements.text.props.text).toBe("Café");
      // The supplied export rejects wrong/missing props, unknown components,
      // and fields it doesn't declare. Python must not strip these silently.
      expect(result.rejected).toEqual([true, true, true, true]);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
