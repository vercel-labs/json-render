import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
} from "react";
import { JsonEditor, type JsonValue } from "@visual-json/react";
import type { StartAppSpec } from "@json-render/start";
import { StartAppProvider, PageRenderer } from "@json-render/start";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import { AddressBar } from "@/components/route-tabs";
import { registry } from "@/lib/registry";

export function Editor() {
  const [spec, setSpec] = useState<StartAppSpec | null>(null);
  const [activeRoute, setActiveRoute] = useState("/");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetch("/api/spec")
      .then((r) => r.json())
      .then((data: StartAppSpec) => setSpec(data));
  }, []);

  const handleChange = useCallback((value: JsonValue) => {
    const updated = value as unknown as StartAppSpec;
    setSpec(updated);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetch("/api/spec", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated),
      });
    }, 500);
  }, []);

  const handlePreviewClick = useCallback((e: MouseEvent<HTMLDivElement>) => {
    const anchor = (e.target as HTMLElement).closest("a");
    if (!anchor) return;
    const href = anchor.getAttribute("href");
    if (!href || href.startsWith("http") || href.startsWith("mailto:")) return;
    e.preventDefault();
    setActiveRoute(href);
  }, []);

  const currentRoute = useMemo(() => {
    if (!spec) return null;
    return spec.routes[activeRoute] ?? null;
  }, [spec, activeRoute]);

  const layoutSpec = useMemo(() => {
    if (!spec || !currentRoute?.layout || !spec.layouts) return null;
    return spec.layouts[currentRoute.layout] ?? null;
  }, [spec, currentRoute]);

  const initialState = useMemo(() => {
    if (!spec || !currentRoute) return undefined;
    const merged: Record<string, unknown> = {};
    if (spec.state) Object.assign(merged, spec.state);
    if (currentRoute.page.state) Object.assign(merged, currentRoute.page.state);
    return Object.keys(merged).length > 0 ? merged : undefined;
  }, [spec, currentRoute]);

  if (!spec) {
    return (
      <div className="flex items-center justify-center h-screen text-muted-foreground">
        Loading...
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      <div className="flex items-center justify-between px-4 h-12 border-b border-border bg-background shrink-0">
        <span className="text-sm font-semibold">Start Website Builder</span>
        <a
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          View Website
        </a>
      </div>
      <ResizablePanelGroup orientation="horizontal" className="flex-1">
        <ResizablePanel defaultSize={45} minSize={25}>
          <div className="h-full flex flex-col">
            <div className="flex items-center justify-between px-3 h-10 border-b border-border bg-muted/30">
              <span className="text-xs font-mono text-muted-foreground">
                spec.json
              </span>
              <button
                onClick={() => setSidebarOpen((v) => !v)}
                className="flex items-center justify-center w-6 h-6 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                title={sidebarOpen ? "Hide sidebar" : "Show sidebar"}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <path d="M9 3v18" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-auto">
              <JsonEditor
                value={spec as unknown as JsonValue}
                onChange={handleChange}
                sidebarOpen={sidebarOpen}
                height="100%"
                className="h-full"
                style={
                  {
                    "--vj-bg": "var(--background)",
                    "--vj-bg-panel": "var(--background)",
                    "--vj-bg-hover": "var(--muted)",
                    "--vj-bg-selected": "var(--primary)",
                    "--vj-bg-selected-muted": "var(--muted)",
                    "--vj-text": "var(--foreground)",
                    "--vj-text-selected": "var(--primary-foreground)",
                    "--vj-text-muted": "var(--muted-foreground)",
                    "--vj-text-dim": "var(--muted-foreground)",
                    "--vj-border": "var(--border)",
                    "--vj-border-subtle": "var(--border)",
                    "--vj-accent": "var(--primary)",
                    "--vj-accent-muted": "var(--muted)",
                    "--vj-input-bg": "var(--secondary)",
                    "--vj-input-border": "var(--border)",
                  } as React.CSSProperties
                }
              />
            </div>
          </div>
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={55} minSize={30}>
          <div className="h-full flex flex-col">
            <AddressBar route={activeRoute} onNavigate={setActiveRoute} />
            <div
              className="flex-1 overflow-auto bg-background"
              onClick={handlePreviewClick}
            >
              {currentRoute ? (
                <StartAppProvider registry={registry}>
                  <PageRenderer
                    spec={currentRoute.page}
                    initialState={initialState}
                    layoutSpec={layoutSpec}
                  />
                </StartAppProvider>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                  Route not found
                </div>
              )}
            </div>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
