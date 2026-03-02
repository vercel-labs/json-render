import { describe, it, expect } from "vitest";
import type { Spec } from "@json-render/core";
import { renderToSvg, renderToPng } from "./render";

const minimalSpec: Spec = {
  root: "frame",
  elements: {
    frame: {
      type: "Frame",
      props: {
        width: 400,
        height: 200,
        backgroundColor: "#ffffff",
      },
      children: ["box"],
    },
    box: {
      type: "Box",
      props: {
        width: 100,
        height: 50,
        backgroundColor: "#ff0000",
        borderRadius: 8,
      },
      children: [],
    },
  },
};

describe("renderToSvg", () => {
  it("produces a valid SVG string", async () => {
    const svg = await renderToSvg(minimalSpec);
    expect(svg).toContain("<svg");
    expect(svg).toContain("</svg>");
  });

  it("respects width/height from Frame props", async () => {
    const svg = await renderToSvg(minimalSpec);
    expect(svg).toContain('width="400"');
    expect(svg).toContain('height="200"');
  });

  it("uses explicit width/height options over Frame props", async () => {
    const svg = await renderToSvg(minimalSpec, { width: 800, height: 600 });
    expect(svg).toContain('width="800"');
    expect(svg).toContain('height="600"');
  });

  it("falls back to defaults when Frame has no dimensions", async () => {
    const spec: Spec = {
      root: "frame",
      elements: {
        frame: {
          type: "Frame",
          props: { backgroundColor: "#000" },
          children: [],
        },
      },
    };
    const svg = await renderToSvg(spec);
    expect(svg).toContain('width="1200"');
    expect(svg).toContain('height="630"');
  });

  it("gracefully skips unknown component types", async () => {
    const spec: Spec = {
      root: "frame",
      elements: {
        frame: {
          type: "Frame",
          props: { width: 400, height: 200 },
          children: ["unknown"],
        },
        unknown: {
          type: "NonExistent",
          props: {},
          children: [],
        },
      },
    };
    const svg = await renderToSvg(spec);
    expect(svg).toContain("<svg");
  });

  it("renders without standard components when includeStandard is false", async () => {
    const spec: Spec = {
      root: "frame",
      elements: {
        frame: {
          type: "Frame",
          props: { width: 400, height: 200 },
          children: [],
        },
      },
    };
    const svg = await renderToSvg(spec, { includeStandard: false });
    expect(svg).toContain("<svg");
  });
});

describe("renderToPng", () => {
  it("produces a buffer with content", async () => {
    const png = await renderToPng(minimalSpec);
    expect(png.length).toBeGreaterThan(0);
    expect(png.byteLength).toBeGreaterThan(0);
  });

  it("starts with PNG magic bytes", async () => {
    const png = await renderToPng(minimalSpec);
    expect(png[0]).toBe(0x89);
    expect(png[1]).toBe(0x50); // P
    expect(png[2]).toBe(0x4e); // N
    expect(png[3]).toBe(0x47); // G
  });
});
