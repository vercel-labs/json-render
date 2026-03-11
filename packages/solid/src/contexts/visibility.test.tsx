import { describe, it, expect } from "vitest";
import { render } from "@solidjs/testing-library";
import type { JSX } from "solid-js";
import { VisibilityProvider, useVisibility, useIsVisible } from "./visibility";
import { StateProvider } from "./state";

function renderWithVisibility<T>(
  hook: () => T,
  data: Record<string, unknown> = {},
): T {
  let result!: T;
  function TestComponent(): JSX.Element {
    result = hook();
    return (<div />) as unknown as JSX.Element;
  }
  render(() => (
    <StateProvider initialState={data}>
      <VisibilityProvider>
        <TestComponent />
      </VisibilityProvider>
    </StateProvider>
  ));
  return result;
}

describe("useVisibility", () => {
  it("provides isVisible function", () => {
    const ctx = renderWithVisibility(() => useVisibility());

    expect(typeof ctx.isVisible).toBe("function");
  });

  it("provides visibility context with stateModel", () => {
    const ctx = renderWithVisibility(() => useVisibility(), { test: true });

    expect(ctx.ctx.stateModel).toEqual({ test: true });
  });
});

describe("useIsVisible", () => {
  it("returns true for undefined condition", () => {
    const result = renderWithVisibility(() => useIsVisible(undefined));

    expect(result).toBe(true);
  });

  it("returns true for true condition", () => {
    const result = renderWithVisibility(() => useIsVisible(true));

    expect(result).toBe(true);
  });

  it("returns false for false condition", () => {
    const result = renderWithVisibility(() => useIsVisible(false));

    expect(result).toBe(false);
  });

  it("evaluates $state conditions against data", () => {
    const trueResult = renderWithVisibility(
      () => useIsVisible({ $state: "/isVisible" }),
      { isVisible: true },
    );
    expect(trueResult).toBe(true);

    const falseResult = renderWithVisibility(
      () => useIsVisible({ $state: "/isVisible" }),
      { isVisible: false },
    );
    expect(falseResult).toBe(false);
  });

  it("evaluates equality conditions", () => {
    const result = renderWithVisibility(
      () => useIsVisible({ $state: "/count", eq: 1 }),
      { count: 1 },
    );

    expect(result).toBe(true);
  });

  it("evaluates array conditions (implicit AND)", () => {
    const result = renderWithVisibility(
      () =>
        useIsVisible([
          { $state: "/user/isAdmin" },
          { $state: "/count", eq: 5 },
        ]),
      { user: { isAdmin: true }, count: 5 },
    );

    expect(result).toBe(true);
  });
});
