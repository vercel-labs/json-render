"use client";

import { useState } from "react";
import { defineCatalog } from "@json-render/core";
import type { ComputedFunction } from "@json-render/core";
import { schema, defineRegistry } from "@json-render/react";
import {
  threeComponentDefinitions,
  threeComponents,
  ThreeCanvas,
} from "@json-render/react-three-fiber";
import { scenes } from "./scenes";

const catalog = defineCatalog(schema, {
  components: {
    ...threeComponentDefinitions,
  },
  actions: {},
});

const { registry } = defineRegistry(catalog, {
  components: {
    ...threeComponents,
  },
});

function num(v: unknown, fallback: number): number {
  return typeof v === "number" ? v : fallback;
}

const computedFunctions: Record<string, ComputedFunction> = {
  halfHeight: (a) => num(a.h, 1) / 2,

  helixX: (a) => {
    const angle =
      (num(a.i, 0) / num(a.count, 40)) * num(a.turns, 3) * 2 * Math.PI +
      num(a.strand, 0) * Math.PI;
    return num(a.radius, 1.8) * Math.cos(angle);
  },
  helixY: (a) => num(a.i, 0) * num(a.spacing, 0.3) + num(a.offset, -6),
  helixZ: (a) => {
    const angle =
      (num(a.i, 0) / num(a.count, 40)) * num(a.turns, 3) * 2 * Math.PI +
      num(a.strand, 0) * Math.PI;
    return num(a.radius, 1.8) * Math.sin(angle);
  },
  helixHue: (a) => {
    const t = num(a.i, 0) / num(a.count, 40);
    return `hsl(${Math.round(t * 270 + 180)}, 85%, 60%)`;
  },

  spiralX: (a) => {
    const t = num(a.i, 0) / num(a.count, 60);
    const r = 0.5 + t * num(a.maxRadius, 7);
    const angle = t * num(a.turns, 4) * 2 * Math.PI;
    return r * Math.cos(angle);
  },
  spiralZ: (a) => {
    const t = num(a.i, 0) / num(a.count, 60);
    const r = 0.5 + t * num(a.maxRadius, 7);
    const angle = t * num(a.turns, 4) * 2 * Math.PI;
    return r * Math.sin(angle);
  },
  spiralY: (a) => {
    const i = num(a.i, 0);
    return Math.sin(i * 1.7) * 0.4;
  },
  spiralScale: (a) => {
    const t = num(a.i, 0) / num(a.count, 60);
    return 0.08 + (1 - t) * 0.25;
  },
  spiralEmissive: (a) => {
    const t = num(a.i, 0) / num(a.count, 60);
    return Math.max(0, 1 - t * 1.5);
  },

  circleX: (a) => {
    const angle = (num(a.i, 0) / num(a.count, 8)) * 2 * Math.PI;
    return num(a.radius, 3) * Math.cos(angle);
  },
  circleZ: (a) => {
    const angle = (num(a.i, 0) / num(a.count, 8)) * 2 * Math.PI;
    return num(a.radius, 3) * Math.sin(angle);
  },
  circleY: (a) => {
    const angle = (num(a.i, 0) / num(a.count, 8)) * 2 * Math.PI;
    return Math.sin(angle * num(a.freq, 3)) * num(a.amp, 0.3);
  },
  circleAngle: (a) => {
    return (num(a.i, 0) / num(a.count, 8)) * 2 * Math.PI;
  },
  circleHue: (a) => {
    const t = num(a.i, 0) / num(a.count, 8);
    return `hsl(${Math.round(t * 360)}, ${num(a.sat, 70)}%, ${num(a.lit, 80)}%)`;
  },
};

function highlightJson(json: string): string {
  return json.replace(
    /("(?:\\.|[^"\\])*")\s*(:)|("(?:\\.|[^"\\])*")|([-+]?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|(\btrue\b|\bfalse\b|\bnull\b)|([{}[\]:,])/g,
    (_, key, colon, str, num, lit, punct) => {
      if (key) return `<span style="color:#FF4D8D">${key}</span>${colon}`;
      if (str) return `<span style="color:#00CA50">${str}</span>`;
      if (num) return `<span style="color:#47A8FF">${num}</span>`;
      if (lit) return `<span style="color:#47A8FF">${lit}</span>`;
      if (punct) return `<span style="color:#666">${punct}</span>`;
      return _;
    },
  );
}

const LIST_WIDTH = 220;
const JSON_WIDTH = 380;
const HEADER_HEIGHT = 40;

const headerStyle: React.CSSProperties = {
  height: HEADER_HEIGHT,
  display: "flex",
  alignItems: "center",
  padding: "0 16px",
  fontSize: 11,
  fontWeight: 600,
  color: "#555",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  fontFamily: "ui-monospace, monospace",
  borderBottom: "1px solid #1e1e1e",
  flexShrink: 0,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
  boxSizing: "border-box",
};

export default function Page() {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const selected = scenes[selectedIndex]!;

  return (
    <div style={{ height: "100vh", display: "flex", background: "#0a0a0a" }}>
      <div
        style={{
          width: LIST_WIDTH,
          flexShrink: 0,
          display: "flex",
          flexDirection: "column",
          borderRight: "1px solid #1e1e1e",
          background: "#0f0f0f",
        }}
      >
        <div style={headerStyle}>Scenes</div>
        <div style={{ flex: 1, overflowY: "auto", padding: "6px 0" }}>
          {scenes.map((scene, i) => (
            <button
              key={scene.name}
              onClick={() => setSelectedIndex(i)}
              style={{
                display: "block",
                width: "100%",
                padding: "8px 16px",
                fontSize: 13,
                border: "none",
                textAlign: "left",
                background:
                  i === selectedIndex
                    ? "rgba(255,255,255,0.08)"
                    : "transparent",
                color: i === selectedIndex ? "#fff" : "#888",
                fontWeight: i === selectedIndex ? 500 : 400,
                cursor: "pointer",
                borderLeft:
                  i === selectedIndex
                    ? "2px solid #fff"
                    : "2px solid transparent",
                fontFamily: "inherit",
              }}
            >
              {scene.name}
            </button>
          ))}
        </div>
      </div>

      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minWidth: 0,
        }}
      >
        <div style={headerStyle}>{selected.description}</div>
        <div style={{ flex: 1, background: "#000", position: "relative" }}>
          <ThreeCanvas
            key={selectedIndex}
            spec={selected.spec}
            registry={registry}
            functions={computedFunctions}
            shadows
            camera={{ position: [0, 0, 5], fov: 50 }}
            style={{ width: "100%", height: "100%" }}
          />
        </div>
      </div>

      <div
        style={{
          width: JSON_WIDTH,
          flexShrink: 0,
          display: "flex",
          flexDirection: "column",
          borderLeft: "1px solid #1e1e1e",
          background: "#0d0d0d",
        }}
      >
        <div style={headerStyle}>Spec JSON</div>
        <pre
          style={{
            flex: 1,
            margin: 0,
            padding: 14,
            overflowY: "auto",
            overflowX: "auto",
            fontSize: 11,
            lineHeight: 1.6,
            fontFamily:
              "ui-monospace, 'Cascadia Code', 'Source Code Pro', Menlo, Consolas, monospace",
            color: "#EDEDED",
            tabSize: 2,
          }}
          dangerouslySetInnerHTML={{
            __html: highlightJson(JSON.stringify(selected.spec, null, 2)),
          }}
        />
      </div>
    </div>
  );
}
