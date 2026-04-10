"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { GaussianSplatViewer } from "./GaussianSplatViewer";
import { scenes } from "./scenes";

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

function SplatViewer({ sceneIndex }: { sceneIndex: number }) {
  const scene = scenes[sceneIndex]!;
  const v = scene.viewer;

  return (
    <GaussianSplatViewer
      width="100%"
      height="100%"
      backgroundColor={v.backgroundColor ?? "#0a0a0a"}
      controls={v.controls ?? true}
      autoRotate={v.autoRotate ?? true}
      autoRotateSpeed={v.autoRotateSpeed ?? 0.5}
      cameraPosition={v.cameraPosition ?? [0, 2, 5]}
      cameraTarget={v.cameraTarget ?? [0, 0, 0]}
      fov={v.fov ?? 50}
      splats={scene.splats}
    />
  );
}

function SceneListItem({
  scene,
  index,
  isSelected,
  onSelect,
}: {
  scene: (typeof scenes)[number];
  index: number;
  isSelected: boolean;
  onSelect: (i: number) => void;
}) {
  return (
    <button
      role="option"
      aria-selected={isSelected}
      onClick={() => onSelect(index)}
      style={{
        display: "block",
        width: "100%",
        padding: "8px 16px",
        fontSize: 13,
        border: "none",
        textAlign: "left",
        background: isSelected ? "rgba(255,255,255,0.08)" : "transparent",
        color: isSelected ? "#fff" : "#888",
        fontWeight: isSelected ? 500 : 400,
        cursor: "pointer",
        borderLeft: isSelected ? "2px solid #fff" : "2px solid transparent",
        fontFamily: "inherit",
      }}
    >
      {scene.name}
    </button>
  );
}

function DesktopLayout() {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const selected = scenes[selectedIndex]!;

  return (
    <div style={{ height: "100dvh", display: "flex", background: "#0a0a0a" }}>
      <nav
        aria-label="Splat scenes"
        style={{
          width: LIST_WIDTH,
          flexShrink: 0,
          display: "flex",
          flexDirection: "column",
          borderRight: "1px solid #1e1e1e",
          background: "#0f0f0f",
        }}
      >
        <div style={headerStyle}>Splat Scenes</div>
        <div
          role="listbox"
          aria-label="Scene list"
          style={{ flex: 1, overflowY: "auto", padding: "6px 0" }}
        >
          {scenes.map((scene, i) => (
            <SceneListItem
              key={scene.name}
              scene={scene}
              index={i}
              isSelected={i === selectedIndex}
              onSelect={setSelectedIndex}
            />
          ))}
        </div>
      </nav>

      <main
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minWidth: 0,
        }}
      >
        <div style={headerStyle}>{selected.description}</div>
        <div style={{ flex: 1, background: "#000", position: "relative" }}>
          <SplatViewer key={selectedIndex} sceneIndex={selectedIndex} />
        </div>
      </main>

      <aside
        aria-label="Spec JSON"
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
            __html: highlightJson(
              JSON.stringify(
                { spec: selected.spec, splats: selected.splats },
                null,
                2,
              ),
            ),
          }}
        />
      </aside>
    </div>
  );
}

function MobileLayout() {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showJson, setShowJson] = useState(false);
  const [showScenes, setShowScenes] = useState(false);
  const selected = scenes[selectedIndex]!;
  const scenePanelRef = useRef<HTMLDivElement>(null);
  const jsonPanelRef = useRef<HTMLDivElement>(null);

  const closeScenes = useCallback(() => setShowScenes(false), []);
  const closeJson = useCallback(() => setShowJson(false), []);

  // Close overlays on Escape
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (showScenes) closeScenes();
        if (showJson) closeJson();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [showScenes, showJson, closeScenes, closeJson]);

  // Focus the panel when it opens
  useEffect(() => {
    if (showScenes) scenePanelRef.current?.focus();
  }, [showScenes]);
  useEffect(() => {
    if (showJson) jsonPanelRef.current?.focus();
  }, [showJson]);

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
      <header
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
          aria-label={`Scene: ${selected.name}. Open scene list`}
          aria-expanded={showScenes}
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
          aria-label="Toggle JSON panel"
          aria-expanded={showJson}
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
      </header>

      <div style={{ flex: 1, position: "relative", minHeight: 0 }}>
        <SplatViewer key={selectedIndex} sceneIndex={selectedIndex} />

        {showScenes && (
          <>
            <div
              onClick={closeScenes}
              style={{
                position: "absolute",
                inset: 0,
                background: "rgba(0,0,0,0.5)",
                zIndex: 10,
              }}
            />
            <div
              ref={scenePanelRef}
              role="dialog"
              aria-modal="true"
              aria-label="Scene list"
              tabIndex={-1}
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
              <div style={{ ...headerStyle, height: 36 }}>Splat Scenes</div>
              <div
                role="listbox"
                aria-label="Scene list"
                style={{ padding: "6px 0" }}
              >
                {scenes.map((scene, i) => (
                  <SceneListItem
                    key={scene.name}
                    scene={scene}
                    index={i}
                    isSelected={i === selectedIndex}
                    onSelect={(idx) => {
                      setSelectedIndex(idx);
                      closeScenes();
                    }}
                  />
                ))}
              </div>
            </div>
          </>
        )}

        {showJson && (
          <>
            <div
              onClick={closeJson}
              style={{
                position: "absolute",
                inset: 0,
                background: "rgba(0,0,0,0.5)",
                zIndex: 10,
              }}
            />
            <div
              ref={jsonPanelRef}
              role="dialog"
              aria-modal="true"
              aria-label="Spec JSON"
              tabIndex={-1}
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
                  __html: highlightJson(
                    JSON.stringify(
                      { spec: selected.spec, splats: selected.splats },
                      null,
                      2,
                    ),
                  ),
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
