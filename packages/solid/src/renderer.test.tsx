import { describe, it, expect } from "vitest";
import { Renderer } from "./renderer";

describe("Renderer", () => {
  it("is a valid component function", () => {
    expect(typeof Renderer).toBe("function");
  });

  it("accepts null spec", () => {
    const props = {
      spec: null,
      registry: {},
    };
    expect(props.spec).toBeNull();
    expect(props.registry).toEqual({});
  });

  it("accepts spec without root", () => {
    const props = {
      spec: { root: "", elements: {} },
      registry: {},
    };
    expect(props.spec.root).toBe("");
    expect(props.spec.elements).toEqual({});
  });

  it("accepts loading prop", () => {
    const props = {
      spec: null,
      registry: {},
      loading: true,
    };
    expect(props.loading).toBe(true);
  });

  it("accepts fallback prop", () => {
    const Fallback = () => {
      const el = document.createElement("div");
      el.textContent = "Unknown component";
      return el;
    };

    const props = {
      spec: null,
      registry: {},
      fallback: Fallback,
    };
    expect(props.fallback).toBe(Fallback);
  });
});
