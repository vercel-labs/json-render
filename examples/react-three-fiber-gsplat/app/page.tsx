"use client";

import { useState, useSyncExternalStore } from "react";
import { defineCatalog } from "@json-render/core";
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

const MOBILE_BREAKPOINT = 768;

function subscribeToResize(cb: () => void) {
  window.addEventListener("resize", cb);
  return () => window.removeEventListener("resize", cb);
}

function getIsMobile() {
  return typeof window !== "undefined"
    ? window.innerWidth < MOBILE_BREAKPOINT
    : false;
}

function useIsMobile() {
  return useSyncExternalStore(subscribeToResize, getIsMobile, () => false);
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

function DesktopLayout() {
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

function MobileLayout() {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showJson, setShowJson] = useState(false);
  const [showScenes, setShowScenes] = useState(false);
  const selected = scenes[selectedIndex]!;

  return (
    <div
      style={{
        height: "100dvh",
        display: "flex",
        flexDirection: "column",
        background: "#0a0a0a",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          height: 48,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 12px",
          borderBottom: "1px solid #1e1e1e",
          background: "#0f0f0f",
          flexShrink: 0,
          gap: 8,
        }}
      >
        <button
          onClick={() => {
            setShowScenes((v) => !v);
            setShowJson(false);
          }}
          style={{
            background: showScenes ? "rgba(255,255,255,0.1)" : "transparent",
            border: "1px solid #333",
            borderRadius: 6,
            color: "#ccc",
            fontSize: 12,
            fontWeight: 500,
            padding: "6px 10px",
            cursor: "pointer",
            fontFamily: "inherit",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            maxWidth: "50%",
          }}
        >
          {selected.name}
        </button>

        <span
          style={{
            flex: 1,
            fontSize: 10,
            color: "#555",
            textAlign: "center",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            fontFamily: "ui-monospace, monospace",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
          }}
        >
          {selected.description}
        </span>

        <button
          onClick={() => {
            setShowJson((v) => !v);
            setShowScenes(false);
          }}
          style={{
            background: showJson ? "rgba(255,255,255,0.1)" : "transparent",
            border: "1px solid #333",
            borderRadius: 6,
            color: "#ccc",
            fontSize: 11,
            fontWeight: 500,
            padding: "6px 10px",
            cursor: "pointer",
            fontFamily: "ui-monospace, monospace",
            whiteSpace: "nowrap",
            letterSpacing: "0.04em",
          }}
        >
          JSON
        </button>
      </div>

      <div style={{ flex: 1, position: "relative", minHeight: 0 }}>
        <ThreeCanvas
          key={selectedIndex}
          spec={selected.spec}
          registry={registry}
          shadows
          camera={{ position: [0, 0, 5], fov: 50 }}
          style={{ width: "100%", height: "100%" }}
        />

        {showScenes && (
          <>
            <div
              onClick={() => setShowScenes(false)}
              style={{
                position: "absolute",
                inset: 0,
                background: "rgba(0,0,0,0.5)",
                zIndex: 10,
              }}
            />
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                bottom: 0,
                width: "75%",
                maxWidth: 280,
                background: "#0f0f0f",
                borderRight: "1px solid #1e1e1e",
                zIndex: 11,
                display: "flex",
                flexDirection: "column",
                overflowY: "auto",
              }}
            >
              <div style={{ ...headerStyle, height: 36 }}>Scenes</div>
              <div style={{ padding: "6px 0" }}>
                {scenes.map((scene, i) => (
                  <button
                    key={scene.name}
                    onClick={() => {
                      setSelectedIndex(i);
                      setShowScenes(false);
                    }}
                    style={{
                      display: "block",
                      width: "100%",
                      padding: "10px 16px",
                      fontSize: 14,
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
          </>
        )}

        {showJson && (
          <>
            <div
              onClick={() => setShowJson(false)}
              style={{
                position: "absolute",
                inset: 0,
                background: "rgba(0,0,0,0.5)",
                zIndex: 10,
              }}
            />
            <div
              style={{
                position: "absolute",
                top: 0,
                right: 0,
                bottom: 0,
                width: "85%",
                maxWidth: 400,
                background: "#0d0d0d",
                borderLeft: "1px solid #1e1e1e",
                zIndex: 11,
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div style={{ ...headerStyle, height: 36 }}>Spec JSON</div>
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
          </>
        )}
      </div>
    </div>
  );
}

export default function Page() {
  const isMobile = useIsMobile();
  return isMobile ? <MobileLayout /> : <DesktopLayout />;
}
