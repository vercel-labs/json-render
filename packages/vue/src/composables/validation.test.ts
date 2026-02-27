import { describe, it, expect, vi } from "vitest";
import { defineComponent, h, type Component } from "vue";
import { mount } from "@vue/test-utils";
import { StateProvider } from "./state";
import {
  ValidationProvider,
  useOptionalValidation,
  useValidation,
  useFieldValidation,
} from "./validation";

/** Mount StateProvider → ValidationProvider with a child that captures context. */
function withProviders<T>(
  composable: () => T,
  initialState: Record<string, unknown> = {},
): { result: T } {
  let result!: T;
  const Child = defineComponent({
    setup() {
      result = composable();
      return () => h("div");
    },
  });
  mount(StateProvider as Component, {
    props: { initialState } as any,
    slots: {
      default: () =>
        h(ValidationProvider as Component, null, {
          default: () => h(Child),
        }),
    },
  });
  return { result };
}

/** Mount only inside StateProvider (no ValidationProvider) */
function withStateOnly<T>(composable: () => T): { result: T } {
  let result!: T;
  const Child = defineComponent({
    setup() {
      result = composable();
      return () => h("div");
    },
  });
  mount(StateProvider as Component, {
    props: { initialState: {} } as any,
    slots: { default: () => h(Child) },
  });
  return { result };
}

describe("ValidationProvider — provide/inject", () => {
  it("useValidation() throws outside a provider", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(() => useValidation()).toThrow(
      "useValidation must be used within a ValidationProvider",
    );
    warn.mockRestore();
  });
});

describe("useOptionalValidation", () => {
  it("returns null outside a ValidationProvider", () => {
    const { result } = withStateOnly(() => useOptionalValidation());
    expect(result).toBeNull();
  });

  it("returns context inside a ValidationProvider", () => {
    const { result } = withProviders(() => useOptionalValidation());
    expect(result).not.toBeNull();
    expect(typeof result!.validate).toBe("function");
    expect(typeof result!.validateAll).toBe("function");
  });
});

describe("useFieldValidation — lifecycle", () => {
  it("after validate(), isValid and errors reflect the result", () => {
    const { result } = withProviders(
      () =>
        useFieldValidation("/name", {
          checks: [{ type: "required", message: "Name is required" }],
        }),
      { name: "" },
    );
    const validationResult = result.validate();
    expect(validationResult.valid).toBe(false);
    expect(validationResult.errors).toContain("Name is required");
  });

  it("after validate() with valid value, isValid is true", () => {
    const { result } = withProviders(
      () =>
        useFieldValidation("/name", {
          checks: [{ type: "required", message: "Name is required" }],
        }),
      { name: "Alice" },
    );
    const validationResult = result.validate();
    expect(validationResult.valid).toBe(true);
    expect(validationResult.errors).toHaveLength(0);
  });

  it("touch() sets touched: true in the validation context", () => {
    let validationCtx!: ReturnType<typeof useValidation>;
    let fieldCtx!: ReturnType<typeof useFieldValidation>;

    const Child = defineComponent({
      setup() {
        validationCtx = useValidation();
        fieldCtx = useFieldValidation("/email");
        return () => h("div");
      },
    });

    mount(StateProvider as Component, {
      props: { initialState: {} } as any,
      slots: {
        default: () =>
          h(ValidationProvider as Component, null, {
            default: () => h(Child),
          }),
      },
    });

    fieldCtx.touch();
    expect(validationCtx.fieldStates["/email"]?.touched).toBe(true);
  });

  it("clear() resets the field state from the validation context", () => {
    let validationCtx!: ReturnType<typeof useValidation>;
    let fieldCtx!: ReturnType<typeof useFieldValidation>;

    const Child = defineComponent({
      setup() {
        validationCtx = useValidation();
        fieldCtx = useFieldValidation("/email", {
          checks: [{ type: "required", message: "Required" }],
        });
        return () => h("div");
      },
    });

    mount(StateProvider as Component, {
      props: { initialState: { email: "" } } as any,
      slots: {
        default: () =>
          h(ValidationProvider as Component, null, {
            default: () => h(Child),
          }),
      },
    });

    fieldCtx.validate(); // populate fieldStates
    fieldCtx.clear();
    expect(validationCtx.fieldStates["/email"]).toBeUndefined();
  });

  it("validateAll() returns true when all registered fields pass", () => {
    let validationCtx!: ReturnType<typeof useValidation>;

    const Child = defineComponent({
      setup() {
        validationCtx = useValidation();
        useFieldValidation("/name", {
          checks: [{ type: "required", message: "Required" }],
        });
        return () => h("div");
      },
    });

    mount(StateProvider as Component, {
      props: { initialState: { name: "Alice" } } as any,
      slots: {
        default: () =>
          h(ValidationProvider as Component, null, {
            default: () => h(Child),
          }),
      },
    });

    expect(validationCtx.validateAll()).toBe(true);
  });

  it("validateAll() returns false when any field fails", () => {
    let validationCtx!: ReturnType<typeof useValidation>;

    const Child = defineComponent({
      setup() {
        validationCtx = useValidation();
        useFieldValidation("/name", {
          checks: [{ type: "required", message: "Required" }],
        });
        return () => h("div");
      },
    });

    mount(StateProvider as Component, {
      props: { initialState: { name: "" } } as any,
      slots: {
        default: () =>
          h(ValidationProvider as Component, null, {
            default: () => h(Child),
          }),
      },
    });

    expect(validationCtx.validateAll()).toBe(false);
  });
});
