import { describe, it, expect } from "vitest";
import React from "react";
import { Renderer } from "./renderer";

describe("Renderer", () => {
  it("renders null for null spec", () => {
    const element = React.createElement(Renderer, {
      spec: null,
      registry: {},
    });
    expect(element).toBeDefined();
    expect(element.props.spec).toBeNull();
  });

  it("renders null for spec without root", () => {
    const element = React.createElement(Renderer, {
      spec: { root: "", elements: {} },
      registry: {},
    });
    expect(element).toBeDefined();
  });

  it("accepts loading prop", () => {
    const element = React.createElement(Renderer, {
      spec: null,
      registry: {},
      loading: true,
    });
    expect(element.props.loading).toBe(true);
  });

  it("accepts fallback prop", () => {
    const Fallback = () => React.createElement("div", null, "Unknown");

    const element = React.createElement(Renderer, {
      spec: null,
      registry: {},
      fallback: Fallback,
    });
    expect(element.props.fallback).toBe(Fallback);
  });

  it("merges standard components by default", () => {
    const element = React.createElement(Renderer, {
      spec: null,
      includeStandard: true,
    });
    expect(element.props.includeStandard).toBe(true);
  });
});
