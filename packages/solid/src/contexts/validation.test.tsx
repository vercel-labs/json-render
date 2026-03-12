import { describe, it, expect } from "vitest";
import { render } from "@solidjs/testing-library";
import { createEffect, type JSX } from "solid-js";
import { StateProvider } from "./state";
import {
  ValidationProvider,
  useValidation,
  useOptionalValidation,
  useFieldValidation,
} from "./validation";

function withProviders<T>(
  hook: () => T,
  initialState: Record<string, unknown> = {},
): T {
  let result!: T;
  function TestComponent(): JSX.Element {
    result = hook();
    return (<div />) as JSX.Element;
  }
  render(() => (
    <StateProvider initialState={initialState}>
      <ValidationProvider>
        <TestComponent />
      </ValidationProvider>
    </StateProvider>
  ));
  return result;
}

function withStateOnly<T>(hook: () => T): T {
  let result!: T;
  function TestComponent(): JSX.Element {
    result = hook();
    return (<div />) as JSX.Element;
  }
  render(() => (
    <StateProvider initialState={{}}>
      <TestComponent />
    </StateProvider>
  ));
  return result;
}

function withBothContexts(
  initialState: Record<string, unknown> = {},
  fieldPath: string = "/name",
  config?: { checks: Array<{ type: string; message: string }> },
) {
  let validationCtx!: ReturnType<typeof useValidation>;
  let fieldCtx!: ReturnType<typeof useFieldValidation>;
  function TestComponent(): JSX.Element {
    validationCtx = useValidation();
    fieldCtx = useFieldValidation(fieldPath, config);
    return (<div />) as JSX.Element;
  }
  render(() => (
    <StateProvider initialState={initialState}>
      <ValidationProvider>
        <TestComponent />
      </ValidationProvider>
    </StateProvider>
  ));
  return { validationCtx, fieldCtx };
}

describe("ValidationProvider — provide/inject", () => {
  it("useValidation() throws outside a provider", () => {
    expect(() => useValidation()).toThrow(
      "useValidation must be used within a ValidationProvider",
    );
  });
});

describe("useOptionalValidation", () => {
  it("returns null outside ValidationProvider", () => {
    const result = withStateOnly(() => useOptionalValidation());
    expect(result).toBeNull();
  });

  it("returns context inside ValidationProvider", () => {
    const result = withProviders(() => useOptionalValidation());
    expect(result).not.toBeNull();
    expect(typeof result!.validate).toBe("function");
    expect(typeof result!.validateAll).toBe("function");
  });
});

describe("useFieldValidation — lifecycle", () => {
  it("validate() with empty required field returns valid:false and errors", () => {
    const { fieldCtx } = withBothContexts({ name: "" }, "/name", {
      checks: [{ type: "required", message: "Name is required" }],
    });

    const result = fieldCtx.validate();
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Name is required");
    expect(fieldCtx.errors()).toContain("Name is required");
    expect(fieldCtx.isValid()).toBe(false);
  });

  it("validate() with valid value returns valid:true and no errors", () => {
    const { fieldCtx } = withBothContexts({ name: "Alice" }, "/name", {
      checks: [{ type: "required", message: "Name is required" }],
    });

    const result = fieldCtx.validate();
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(fieldCtx.errors()).toHaveLength(0);
    expect(fieldCtx.isValid()).toBe(true);
  });

  it("touch() sets touched:true in fieldStates", () => {
    const { validationCtx, fieldCtx } = withBothContexts({}, "/email");

    fieldCtx.touch();
    expect(validationCtx.fieldStates["/email"]?.touched).toBe(true);
  });

  it("clear() resets field state from validation context", () => {
    const { validationCtx, fieldCtx } = withBothContexts(
      { email: "" },
      "/email",
      { checks: [{ type: "required", message: "Required" }] },
    );

    fieldCtx.validate();
    fieldCtx.clear();
    expect(validationCtx.fieldStates["/email"]).toBeUndefined();
  });

  it("useFieldValidation accessors stay reactive after validate/touch", () => {
    const observedErrors: string[][] = [];
    const observedTouched: boolean[] = [];

    function TestComponent(): JSX.Element {
      const field = useFieldValidation("/email", {
        checks: [{ type: "required", message: "Required" }],
      });

      createEffect(() => {
        observedErrors.push(field.errors());
      });

      createEffect(() => {
        observedTouched.push(field.state().touched);
      });

      return (
        <>
          <button data-testid="validate" onClick={() => field.validate()} />
          <button data-testid="touch" onClick={() => field.touch()} />
        </>
      ) as JSX.Element;
    }

    const { getByTestId } = render(() => (
      <StateProvider initialState={{ email: "" }}>
        <ValidationProvider>
          <TestComponent />
        </ValidationProvider>
      </StateProvider>
    ));

    expect(observedErrors).toEqual([[]]);
    expect(observedTouched).toEqual([false]);

    getByTestId("validate").click();
    expect(observedErrors).toEqual([[], ["Required"]]);
    expect(observedTouched).toEqual([false, true]);

    getByTestId("touch").click();
    expect(observedTouched).toEqual([false, true, true]);
  });
});

describe("validateAll", () => {
  it("returns true when all registered fields pass", () => {
    const { validationCtx } = withBothContexts({ name: "Alice" }, "/name", {
      checks: [{ type: "required", message: "Required" }],
    });

    expect(validationCtx.validateAll()).toBe(true);
  });

  it("returns false when any field fails", () => {
    const { validationCtx } = withBothContexts({ name: "" }, "/name", {
      checks: [{ type: "required", message: "Required" }],
    });

    expect(validationCtx.validateAll()).toBe(false);
  });
});
