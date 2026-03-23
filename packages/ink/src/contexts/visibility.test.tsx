import { describe, it, expect } from "vitest";
import React from "react";
import { renderHook } from "@testing-library/react";
import { VisibilityProvider, useVisibility, useIsVisible } from "./visibility";
import { StateProvider } from "./state";

const createWrapper =
  (data: Record<string, unknown> = {}) =>
  ({ children }: { children: React.ReactNode }) => (
    <StateProvider initialState={data}>
      <VisibilityProvider>{children}</VisibilityProvider>
    </StateProvider>
  );

describe("useVisibility", () => {
  it("provides isVisible function", () => {
    const { result } = renderHook(() => useVisibility(), {
      wrapper: createWrapper(),
    });

    expect(typeof result.current.isVisible).toBe("function");
  });

  it("provides visibility context", () => {
    const { result } = renderHook(() => useVisibility(), {
      wrapper: createWrapper({ test: true }),
    });

    expect(result.current.ctx.stateModel).toEqual({ test: true });
  });
});

describe("useIsVisible", () => {
  it("returns true for undefined condition", () => {
    const { result } = renderHook(() => useIsVisible(undefined), {
      wrapper: createWrapper(),
    });

    expect(result.current).toBe(true);
  });

  it("returns true for true condition", () => {
    const { result } = renderHook(() => useIsVisible(true), {
      wrapper: createWrapper(),
    });

    expect(result.current).toBe(true);
  });

  it("returns false for false condition", () => {
    const { result } = renderHook(() => useIsVisible(false), {
      wrapper: createWrapper(),
    });

    expect(result.current).toBe(false);
  });

  it("evaluates $state conditions against data", () => {
    const { result: trueResult } = renderHook(
      () => useIsVisible({ $state: "/isVisible" }),
      { wrapper: createWrapper({ isVisible: true }) },
    );
    expect(trueResult.current).toBe(true);

    const { result: falseResult } = renderHook(
      () => useIsVisible({ $state: "/isVisible" }),
      { wrapper: createWrapper({ isVisible: false }) },
    );
    expect(falseResult.current).toBe(false);
  });

  it("evaluates equality conditions", () => {
    const { result } = renderHook(
      () => useIsVisible({ $state: "/count", eq: 1 }),
      { wrapper: createWrapper({ count: 1 }) },
    );

    expect(result.current).toBe(true);
  });

  it("evaluates array conditions (implicit AND)", () => {
    const { result } = renderHook(
      () =>
        useIsVisible([
          { $state: "/user/isAdmin" },
          { $state: "/count", eq: 5 },
        ]),
      { wrapper: createWrapper({ user: { isAdmin: true }, count: 5 }) },
    );

    expect(result.current).toBe(true);
  });
});
