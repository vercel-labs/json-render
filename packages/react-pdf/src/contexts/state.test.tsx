import { describe, it, expect } from "vitest";
import React from "react";
import { renderHook, act } from "@testing-library/react";
import {
  StateProvider,
  useStateStore,
  useStateValue,
  useStateBinding,
} from "./state";

describe("state re-exports (smoke test)", () => {
  it("StateProvider + useStateStore round-trip", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <StateProvider initialState={{ count: 0 }}>{children}</StateProvider>
    );

    const { result } = renderHook(() => useStateStore(), { wrapper });

    expect(result.current.get("/count")).toBe(0);

    act(() => {
      result.current.set("/count", 42);
    });

    expect(result.current.state.count).toBe(42);
  });

  it("useStateValue reads from state", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <StateProvider initialState={{ name: "Alice" }}>{children}</StateProvider>
    );

    const { result } = renderHook(() => useStateValue("/name"), { wrapper });

    expect(result.current).toBe("Alice");
  });

  it("useStateBinding returns value and setter", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <StateProvider initialState={{ x: 1 }}>{children}</StateProvider>
    );

    const { result } = renderHook(() => useStateBinding("/x"), { wrapper });

    const [value, setValue] = result.current;
    expect(value).toBe(1);
    expect(typeof setValue).toBe("function");
  });
});
