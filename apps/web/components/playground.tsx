"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { flushSync } from "react-dom";
import type { Spec } from "@json-render/core";
import { collectUsedComponents, serializeProps } from "@json-render/codegen";
import { toast } from "sonner";
import { stringify as yamlStringify } from "yaml";
import type { EditMode } from "@json-render/core";
import {
  usePlaygroundStream,
  type StreamFormat,
  type TokenUsage,
} from "@/lib/use-playground-stream";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import { CodeBlock } from "./code-block";
import { CopyButton } from "./copy-button";
import { Toaster } from "./ui/sonner";
import { Header } from "./header";
import { Sheet, SheetContent, SheetTitle } from "./ui/sheet";
import { JsonEditor } from "@visual-json/react";
import type { JsonValue } from "@visual-json/react";
import { PlaygroundRenderer } from "@/lib/render/renderer";
import { playgroundCatalog } from "@/lib/render/catalog";
import { buildCatalogDisplayData } from "@/lib/render/catalog-display";

type Tab = "spec" | "nested" | "stream" | "catalog" | "visual";
type RenderView = "preview" | "code";
type MobileView =
  | "spec"
  | "nested"
  | "stream"
  | "catalog"
  | "visual"
  | "preview"
  | "generated-code";

interface Version {
  id: string;
  prompt: string;
  tree: Spec | null;
  status: "generating" | "complete" | "error";
  usage: TokenUsage | null;
  rawLines: string[];
  format: StreamFormat;
}

function formatTokens(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  return String(n);
}

function PlaygroundControls({
  format,
  setFormat,
  editModes,
  setEditModes,
  showClear,
  onClear,
}: {
  format: StreamFormat;
  setFormat: (f: StreamFormat) => void;
  editModes: EditMode[];
  setEditModes: React.Dispatch<React.SetStateAction<EditMode[]>>;
  showClear: boolean;
  onClear: () => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center rounded border border-border text-[10px] font-mono overflow-hidden">
        {(["jsonl", "yaml"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFormat(f)}
            className={`px-1.5 py-0.5 transition-colors ${
              format === f
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {f}
          </button>
        ))}
      </div>
      <div className="flex items-center rounded border border-border text-[10px] font-mono overflow-hidden">
        {(["patch", "merge", "diff"] as const).map((m) => (
          <button
            key={m}
            onClick={() => {
              setEditModes((prev) =>
                prev.includes(m)
                  ? prev.length > 1
                    ? prev.filter((x) => x !== m)
                    : prev
                  : [...prev, m],
              );
            }}
            className={`px-1.5 py-0.5 transition-colors ${
              editModes.includes(m)
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {m}
          </button>
        ))}
      </div>
      {showClear && (
        <button
          onClick={onClear}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Clear
        </button>
      )}
    </div>
  );
}

/**
 * Convert a flat Spec into a nested tree structure that is easier for humans
 * to read. Children keys are resolved recursively into inline objects.
 */
function specToNested(spec: Spec): Record<string, unknown> {
  function resolve(key: string): Record<string, unknown> {
    const el = spec.elements[key];
    if (!el) return { _key: key, _missing: true };

    const node: Record<string, unknown> = { type: el.type };

    if (el.props && Object.keys(el.props).length > 0) {
      node.props = el.props;
    }

    if (el.visible !== undefined) {
      node.visible = el.visible;
    }

    if (el.on && Object.keys(el.on).length > 0) {
      node.on = el.on;
    }

    if (el.repeat) {
      node.repeat = el.repeat;
    }

    if (el.children && el.children.length > 0) {
      node.children = el.children.map(resolve);
    }

    return node;
  }

  const result: Record<string, unknown> = {};

  if (spec.state && Object.keys(spec.state).length > 0) {
    result.state = spec.state;
  }

  result.elements = resolve(spec.root);

  return result;
}

const EXAMPLE_PROMPTS = [
  "Create a login form",
  "Build a pricing page",
  "Design a user profile card",
  "Make a contact form",
];

export function Playground() {
  const [versions, setVersions] = useState<Version[]>([]);
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(
    null,
  );
  const [inputValue, setInputValue] = useState("");
  const [activeTab, setActiveTab] = useState<Tab>("spec");
  const [catalogSection, setCatalogSection] = useState<
    "components" | "actions"
  >("components");
  const [renderView, setRenderView] = useState<RenderView>("preview");
  const [mobileView, setMobileView] = useState<MobileView>("preview");
  const [versionsSheetOpen, setVersionsSheetOpen] = useState(false);
  const [format, setFormat] = useState<StreamFormat>("jsonl");
  const [editModes, setEditModes] = useState<EditMode[]>(["patch"]);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const mobileInputRef = useRef<HTMLTextAreaElement>(null);
  const versionsEndRef = useRef<HTMLDivElement>(null);

  // Track the currently generating version ID
  const generatingVersionIdRef = useRef<string | null>(null);

  // Track the current tree for use as previousSpec in next generation
  const currentTreeRef = useRef<Spec | null>(null);

  const {
    spec: apiSpec,
    isStreaming,
    usage: streamUsage,
    rawLines: streamRawLines,
    send,
    clear,
  } = usePlaygroundStream({
    api: "/api/generate",
    format,
    editModes,
    onError: (err: Error) => {
      console.error("Generation error:", err);
      toast.error(err.message || "Generation failed. Please try again.");
      if (generatingVersionIdRef.current) {
        const erroredVersionId = generatingVersionIdRef.current;
        setVersions((prev) =>
          prev.map((v) =>
            v.id === erroredVersionId ? { ...v, status: "error" as const } : v,
          ),
        );
        generatingVersionIdRef.current = null;
      }
    },
  });

  // Get the selected version
  const selectedVersion = versions.find((v) => v.id === selectedVersionId);

  // Determine which tree to display:
  // - If streaming and selected version is the generating one, show apiSpec
  // - Otherwise show the selected version's tree
  const isSelectedVersionGenerating =
    selectedVersionId === generatingVersionIdRef.current && isStreaming;
  const hasValidApiTree =
    apiSpec && apiSpec.root && Object.keys(apiSpec.elements).length > 0;

  const currentTree =
    isSelectedVersionGenerating && hasValidApiTree
      ? apiSpec
      : (selectedVersion?.tree ??
        (isSelectedVersionGenerating ? apiSpec : null));

  // Raw JSONL lines: live from stream during generation, or stored per version
  const currentRawLines = isSelectedVersionGenerating
    ? streamRawLines
    : (selectedVersion?.rawLines ?? []);

  // Keep the ref updated with the current tree for use in handleSubmit
  if (
    currentTree &&
    currentTree.root &&
    Object.keys(currentTree.elements).length > 0
  ) {
    currentTreeRef.current = currentTree;
  }

  // Scroll to bottom when versions change
  useEffect(() => {
    versionsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [versions]);

  // Update version when streaming completes
  useEffect(() => {
    if (
      !isStreaming &&
      apiSpec &&
      apiSpec.root &&
      generatingVersionIdRef.current
    ) {
      const completedVersionId = generatingVersionIdRef.current;
      setVersions((prev) =>
        prev.map((v) =>
          v.id === completedVersionId
            ? {
                ...v,
                tree: apiSpec,
                status: "complete" as const,
                usage: streamUsage,
                rawLines: streamRawLines,
              }
            : v,
        ),
      );
      generatingVersionIdRef.current = null;
    }
  }, [isStreaming, apiSpec, streamUsage, streamRawLines]);

  const handleSubmit = useCallback(async () => {
    if (!inputValue.trim() || isStreaming) return;

    const newVersionId = Date.now().toString();
    const newVersion: Version = {
      id: newVersionId,
      prompt: inputValue.trim(),
      tree: null,
      status: "generating",
      usage: null,
      rawLines: [],
      format,
    };

    generatingVersionIdRef.current = newVersionId;
    setVersions((prev) => [...prev, newVersion]);
    setSelectedVersionId(newVersionId);
    setInputValue("");

    // Pass the current tree as context so the API can iterate on it
    await send(inputValue.trim(), { previousSpec: currentTreeRef.current });
  }, [inputValue, isStreaming, send, format]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit],
  );

  const handleVisualChange = useCallback(
    (value: JsonValue) => {
      if (!selectedVersionId || isStreaming) return;
      setVersions((prev) =>
        prev.map((v) =>
          v.id === selectedVersionId
            ? { ...v, tree: value as unknown as Spec }
            : v,
        ),
      );
    },
    [selectedVersionId, isStreaming],
  );

  const specCode = useMemo(() => {
    if (!currentTree)
      return format === "yaml" ? "# waiting..." : "// waiting...";
    if (format === "yaml") {
      return yamlStringify(currentTree, { indent: 2 }).trimEnd();
    }
    return JSON.stringify(currentTree, null, 2);
  }, [currentTree, format]);

  const specLang = format === "yaml" ? "yaml" : "json";

  const nestedCode = useMemo(() => {
    if (!currentTree || !currentTree.root) return "// waiting...";
    return JSON.stringify(specToNested(currentTree), null, 2);
  }, [currentTree]);

  const generatedCode = useMemo(() => {
    if (!currentTree || !currentTree.root) {
      return "// Generate a UI to see the code";
    }

    const tree = currentTree;
    const components = collectUsedComponents(tree);

    function generateJSX(key: string, indent: number): string {
      const element = tree.elements[key];
      if (!element) return "";

      const spaces = "  ".repeat(indent);
      const componentName = element.type;

      const propsObj: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(element.props ?? {})) {
        if (v !== null && v !== undefined) {
          propsObj[k] = v;
        }
      }

      const propsStr = serializeProps(propsObj);
      const hasChildren = element.children && element.children.length > 0;

      if (!hasChildren) {
        return propsStr
          ? `${spaces}<${componentName} ${propsStr} />`
          : `${spaces}<${componentName} />`;
      }

      const lines: string[] = [];
      lines.push(
        propsStr
          ? `${spaces}<${componentName} ${propsStr}>`
          : `${spaces}<${componentName}>`,
      );

      for (const childKey of element.children!) {
        lines.push(generateJSX(childKey, indent + 1));
      }

      lines.push(`${spaces}</${componentName}>`);
      return lines.join("\n");
    }

    const jsx = generateJSX(tree.root, 2);
    const imports = Array.from(components).sort().join(", ");

    return `"use client";

import { ${imports} } from "@/components/ui";

export default function Page() {
  return (
    <div className="min-h-screen p-8 flex items-center justify-center">
${jsx}
    </div>
  );
}`;
  }, [currentTree]);

  // Determine syntax lang for raw stream based on selected version's format
  const streamLang = isSelectedVersionGenerating
    ? format === "yaml"
      ? "yaml"
      : "json"
    : selectedVersion?.format === "yaml"
      ? "yaml"
      : "json";

  // Chat pane content
  const chatPane = (
    <div className="h-full flex flex-col border-t border-border">
      <div className="border-b border-border px-3 h-9 flex items-center">
        <span className="text-xs font-mono text-muted-foreground">
          versions
        </span>
      </div>
      <div
        className={`flex-1 p-2 min-h-0 ${versions.length > 0 ? "overflow-y-auto space-y-1" : "flex"}`}
      >
        {versions.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
            <p className="text-sm text-muted-foreground mb-4">
              Describe what you want to build, then iterate on it.
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {EXAMPLE_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    flushSync(() => setInputValue(prompt));
                    // chatPane is rendered in both desktop and mobile layouts,
                    // so inputRef may point to the hidden instance. Find the
                    // textarea in the same layout container as the clicked button.
                    const container = (e.currentTarget as HTMLElement).closest(
                      ".h-full.flex.flex-col",
                    );
                    const el =
                      container?.querySelector<HTMLTextAreaElement>(
                        "textarea",
                      ) ?? inputRef.current;
                    if (el) {
                      el.focus();
                      el.setSelectionRange(prompt.length, prompt.length);
                    }
                  }}
                  className="text-xs px-2 py-1 rounded border border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          versions.map((version, index) => (
            <button
              key={version.id}
              onClick={() => setSelectedVersionId(version.id)}
              className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
                selectedVersionId === version.id
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-muted-foreground/70 shrink-0">
                  v{index + 1}
                </span>
                <span className="truncate flex-1">{version.prompt}</span>
                {version.status === "generating" && (
                  <span className="text-xs text-muted-foreground shrink-0 animate-pulse">
                    ...
                  </span>
                )}
                {version.status === "error" && (
                  <span className="text-xs text-red-500 shrink-0">failed</span>
                )}
              </div>
              {version.usage && (
                <div className="mt-1 ml-6">
                  <span className="text-[10px] font-mono text-muted-foreground/60">
                    {formatTokens(
                      version.usage.promptTokens - version.usage.cachedTokens,
                    )}{" "}
                    in · {formatTokens(version.usage.completionTokens)} out
                    {version.usage.cachedTokens > 0
                      ? ` · ${formatTokens(version.usage.cachedTokens)} cached`
                      : ""}
                  </span>
                </div>
              )}
            </button>
          ))
        )}
        <div ref={versionsEndRef} />
      </div>
      <div
        className="border-t border-border p-3 cursor-text"
        onMouseDown={(e) => {
          // Focus textarea unless clicking a button or the textarea itself
          const target = e.target as HTMLElement;
          if (!target.closest("button") && target.tagName !== "TEXTAREA") {
            e.preventDefault();
            inputRef.current?.focus();
          }
        }}
      >
        <textarea
          ref={inputRef}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Describe changes..."
          className="w-full bg-background text-base sm:text-sm resize-none outline-none placeholder:text-muted-foreground/50"
          rows={2}
          autoFocus
        />
        <div className="flex justify-between items-center mt-2">
          <PlaygroundControls
            format={format}
            setFormat={setFormat}
            editModes={editModes}
            setEditModes={setEditModes}
            showClear={versions.length > 0}
            onClear={() => {
              setVersions([]);
              setSelectedVersionId(null);
              clear();
            }}
          />
          {isStreaming ? (
            <button
              onClick={() => clear()}
              className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-colors"
              aria-label="Stop"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="currentColor"
                stroke="none"
              >
                <rect x="6" y="6" width="12" height="12" />
              </svg>
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={!inputValue.trim()}
              className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-colors disabled:opacity-30"
              aria-label="Send"
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
                <path d="M5 12h14" />
                <path d="m12 5 7 7-7 7" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );

  // Catalog data for the catalog tab
  const catalogData = useMemo(
    () => buildCatalogDisplayData(playgroundCatalog.data),
    [],
  );

  // Code pane content
  const copyText =
    activeTab === "stream"
      ? currentRawLines.join("\n")
      : activeTab === "spec"
        ? specCode
        : activeTab === "nested"
          ? nestedCode
          : activeTab === "visual"
            ? specCode
            : "";

  const codePane = (
    <div className="h-full flex flex-col border-t border-border">
      <div className="border-b border-border px-3 h-9 flex items-center gap-3">
        {(["spec", "visual", "nested", "stream", "catalog"] as const).map(
          (tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`text-xs font-mono transition-colors ${
                activeTab === tab
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab === "spec" ? (format === "yaml" ? "yaml" : "json") : tab}
            </button>
          ),
        )}
        <div className="flex-1" />
        {activeTab !== "catalog" && activeTab !== "visual" && (
          <CopyButton text={copyText} className="text-muted-foreground" />
        )}
      </div>
      <div className="flex-1 overflow-auto">
        {activeTab === "visual" ? (
          currentTree ? (
            <JsonEditor
              value={currentTree as unknown as JsonValue}
              onChange={handleVisualChange}
              readOnly={isStreaming}
              sidebarOpen={false}
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
          ) : (
            <div className="text-muted-foreground/50 p-3 text-sm font-mono">
              {"// generate a spec to edit visually"}
            </div>
          )
        ) : activeTab === "catalog" ? (
          <div className="h-full flex flex-col text-sm">
            <div className="flex items-center gap-3 px-3 h-9 border-b border-border">
              {(
                [
                  {
                    key: "components",
                    label: `components (${catalogData.components.length})`,
                  },
                  {
                    key: "actions",
                    label: `actions (${catalogData.actions.length})`,
                  },
                ] as const
              ).map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setCatalogSection(key)}
                  className={`text-xs font-mono transition-colors ${
                    catalogSection === key
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="flex-1 overflow-auto p-3">
              {catalogSection === "components" ? (
                <div className="space-y-3">
                  {catalogData.components.map((comp) => (
                    <div
                      key={comp.name}
                      className="pb-3 border-b border-border last:border-b-0"
                    >
                      <div className="flex items-baseline gap-2 mb-1">
                        <span className="font-mono font-medium text-foreground">
                          {comp.name}
                        </span>
                        {comp.slots.length > 0 && (
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                            slots: {comp.slots.join(", ")}
                          </span>
                        )}
                      </div>
                      {comp.description && (
                        <p className="text-xs text-muted-foreground mb-2">
                          {comp.description}
                        </p>
                      )}
                      {comp.props.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-1">
                          {comp.props.map((p) => (
                            <span
                              key={p.name}
                              className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-green-500/10 text-green-700 dark:text-green-400"
                            >
                              {p.name}
                              <span className="text-green-700/50 dark:text-green-400/50">
                                : {p.type}
                              </span>
                            </span>
                          ))}
                        </div>
                      )}
                      {comp.events.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {comp.events.map((e) => (
                            <span
                              key={e}
                              className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400"
                            >
                              on.{e}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {catalogData.actions.map((action) => (
                    <div
                      key={action.name}
                      className="pb-3 border-b border-border last:border-b-0"
                    >
                      <span className="font-mono font-medium text-foreground">
                        {action.name}
                      </span>
                      {action.description && (
                        <p className="text-xs text-muted-foreground mt-1 mb-2">
                          {action.description}
                        </p>
                      )}
                      {action.params.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {action.params.map((p) => (
                            <span
                              key={p.name}
                              className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-green-500/10 text-green-700 dark:text-green-400"
                            >
                              {p.name}
                              <span className="text-green-700/50 dark:text-green-400/50">
                                : {p.type}
                              </span>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : activeTab === "stream" ? (
          currentRawLines.length > 0 ? (
            <CodeBlock
              code={currentRawLines.join("\n")}
              lang={streamLang}
              fillHeight
              hideCopyButton
            />
          ) : (
            <div className="text-muted-foreground/50 p-3 text-sm font-mono">
              {isStreaming ? "streaming..." : "// waiting for generation"}
            </div>
          )
        ) : activeTab === "nested" ? (
          <CodeBlock code={nestedCode} lang="json" fillHeight hideCopyButton />
        ) : (
          <CodeBlock
            code={specCode}
            lang={specLang}
            fillHeight
            hideCopyButton
          />
        )}
      </div>
    </div>
  );

  // Preview pane content
  const previewPane = (
    <div className="h-full flex flex-col border-t border-border">
      <div className="border-b border-border px-3 h-9 flex items-center gap-3">
        {(
          [
            { key: "preview", label: "preview" },
            { key: "code", label: "code" },
          ] as const
        ).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setRenderView(key)}
            className={`text-xs font-mono transition-colors ${
              renderView === key
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
        <div className="flex-1" />
        {renderView === "code" && (
          <CopyButton text={generatedCode} className="text-muted-foreground" />
        )}
      </div>
      <div className="flex-1 overflow-auto">
        {renderView === "preview" ? (
          currentTree && currentTree.root ? (
            <div className="w-full min-h-full flex items-center justify-center p-6">
              <PlaygroundRenderer
                spec={currentTree}
                data={currentTree.state}
                loading={isStreaming}
              />
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground/50 text-sm">
              {isStreaming
                ? "generating..."
                : "// enter a prompt to generate UI"}
            </div>
          )
        ) : (
          <CodeBlock
            code={generatedCode}
            lang="tsx"
            fillHeight
            hideCopyButton
          />
        )}
      </div>
    </div>
  );

  return (
    <div className="h-full flex flex-col">
      <Header />

      {/* Desktop: 3-pane resizable layout */}
      <div className="hidden lg:flex flex-1 min-h-0">
        <ResizablePanelGroup className="flex-1">
          <ResizablePanel defaultSize={25} minSize={15}>
            {chatPane}
          </ResizablePanel>
          <ResizableHandle />
          <ResizablePanel defaultSize={35} minSize={20}>
            {codePane}
          </ResizablePanel>
          <ResizableHandle />
          <ResizablePanel defaultSize={40} minSize={20}>
            {previewPane}
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      {/* Mobile: toolbar + content + prompt input */}
      <div className="flex lg:hidden flex-col flex-1 min-h-0">
        {/* Top toolbar */}
        <div className="border-b border-border px-3 h-9 flex items-center gap-3 shrink-0 overflow-x-auto">
          {/* Version badge */}
          <button
            onClick={() => setVersionsSheetOpen(true)}
            className="text-xs font-mono font-medium px-1.5 py-0.5 rounded bg-muted text-foreground shrink-0"
          >
            v
            {versions.length > 0
              ? versions.findIndex((v) => v.id === selectedVersionId) + 1 ||
                versions.length
              : 0}
          </button>
          {/* Code tabs */}
          {(["spec", "visual", "nested", "stream", "catalog"] as const).map(
            (tab) => (
              <button
                key={tab}
                onClick={() => setMobileView(tab)}
                className={`text-xs font-mono transition-colors shrink-0 ${
                  mobileView === tab
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab === "spec" ? (format === "yaml" ? "yaml" : "json") : tab}
              </button>
            ),
          )}
          <div className="flex-1" />
          {/* Preview / code toggle */}
          {[
            { key: "preview" as const, label: "preview" },
            { key: "generated-code" as const, label: "code" },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setMobileView(key)}
              className={`text-xs font-mono transition-colors shrink-0 ${
                mobileView === key
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Main content area */}
        <div className="flex-1 min-h-0 overflow-auto">
          {mobileView === "visual" ? (
            currentTree ? (
              <JsonEditor
                value={currentTree as unknown as JsonValue}
                onChange={handleVisualChange}
                readOnly={isStreaming}
                sidebarOpen={false}
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
            ) : (
              <div className="text-muted-foreground/50 p-3 text-sm font-mono">
                {"// generate a spec to edit visually"}
              </div>
            )
          ) : mobileView === "catalog" ? (
            <div className="h-full flex flex-col text-sm">
              <div className="flex items-center gap-3 px-3 h-9 border-b border-border">
                {(
                  [
                    {
                      key: "components",
                      label: `components (${catalogData.components.length})`,
                    },
                    {
                      key: "actions",
                      label: `actions (${catalogData.actions.length})`,
                    },
                  ] as const
                ).map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => setCatalogSection(key)}
                    className={`text-xs font-mono transition-colors ${
                      catalogSection === key
                        ? "text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="flex-1 overflow-auto p-3">
                {catalogSection === "components" ? (
                  <div className="space-y-3">
                    {catalogData.components.map((comp) => (
                      <div
                        key={comp.name}
                        className="pb-3 border-b border-border last:border-b-0"
                      >
                        <div className="flex items-baseline gap-2 mb-1">
                          <span className="font-mono font-medium text-foreground">
                            {comp.name}
                          </span>
                          {comp.slots.length > 0 && (
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                              slots: {comp.slots.join(", ")}
                            </span>
                          )}
                        </div>
                        {comp.description && (
                          <p className="text-xs text-muted-foreground mb-2">
                            {comp.description}
                          </p>
                        )}
                        {comp.props.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-1">
                            {comp.props.map((p) => (
                              <span
                                key={p.name}
                                className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-green-500/10 text-green-700 dark:text-green-400"
                              >
                                {p.name}
                                <span className="text-green-700/50 dark:text-green-400/50">
                                  : {p.type}
                                </span>
                              </span>
                            ))}
                          </div>
                        )}
                        {comp.events.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {comp.events.map((e) => (
                              <span
                                key={e}
                                className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400"
                              >
                                on.{e}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {catalogData.actions.map((action) => (
                      <div
                        key={action.name}
                        className="pb-3 border-b border-border last:border-b-0"
                      >
                        <span className="font-mono font-medium text-foreground">
                          {action.name}
                        </span>
                        {action.description && (
                          <p className="text-xs text-muted-foreground mt-1 mb-2">
                            {action.description}
                          </p>
                        )}
                        {action.params.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {action.params.map((p) => (
                              <span
                                key={p.name}
                                className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-green-500/10 text-green-700 dark:text-green-400"
                              >
                                {p.name}
                                <span className="text-green-700/50 dark:text-green-400/50">
                                  : {p.type}
                                </span>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : mobileView === "stream" ? (
            currentRawLines.length > 0 ? (
              <CodeBlock
                code={currentRawLines.join("\n")}
                lang={streamLang}
                fillHeight
                hideCopyButton
              />
            ) : (
              <div className="text-muted-foreground/50 p-3 text-sm font-mono">
                {isStreaming ? "streaming..." : "// waiting for generation"}
              </div>
            )
          ) : mobileView === "nested" ? (
            <CodeBlock
              code={nestedCode}
              lang="json"
              fillHeight
              hideCopyButton
            />
          ) : mobileView === "spec" ? (
            <CodeBlock
              code={specCode}
              lang={specLang}
              fillHeight
              hideCopyButton
            />
          ) : mobileView === "preview" ? (
            currentTree && currentTree.root ? (
              <div className="w-full min-h-full flex items-center justify-center p-6">
                <PlaygroundRenderer
                  spec={currentTree}
                  data={currentTree.state}
                  loading={isStreaming}
                />
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center px-4">
                {isStreaming ? (
                  <p className="text-sm text-muted-foreground/50">
                    generating...
                  </p>
                ) : (
                  <>
                    <p className="text-sm text-muted-foreground mb-4">
                      Describe what you want to build, then iterate on it.
                    </p>
                    <div className="flex flex-wrap gap-2 justify-center">
                      {EXAMPLE_PROMPTS.map((prompt) => (
                        <button
                          key={prompt}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            flushSync(() => setInputValue(prompt));
                            mobileInputRef.current?.focus();
                            mobileInputRef.current?.setSelectionRange(
                              prompt.length,
                              prompt.length,
                            );
                          }}
                          className="text-xs px-2 py-1 rounded border border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
                        >
                          {prompt}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )
          ) : (
            /* generated-code */
            <CodeBlock
              code={generatedCode}
              lang="tsx"
              fillHeight
              hideCopyButton
            />
          )}
        </div>

        {/* Prompt input pinned to bottom */}
        <div
          className="border-t border-border p-3 shrink-0 cursor-text"
          onMouseDown={(e) => {
            const target = e.target as HTMLElement;
            if (!target.closest("button") && target.tagName !== "TEXTAREA") {
              e.preventDefault();
              mobileInputRef.current?.focus();
            }
          }}
        >
          <textarea
            ref={mobileInputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe changes..."
            className="w-full bg-background text-base resize-none outline-none placeholder:text-muted-foreground/50"
            rows={2}
          />
          <div className="flex justify-between items-center mt-2">
            <PlaygroundControls
              format={format}
              setFormat={setFormat}
              editModes={editModes}
              setEditModes={setEditModes}
              showClear={versions.length > 0}
              onClear={() => {
                setVersions([]);
                setSelectedVersionId(null);
                clear();
              }}
            />
            {isStreaming ? (
              <button
                onClick={() => clear()}
                className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-colors"
                aria-label="Stop"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  stroke="none"
                >
                  <rect x="6" y="6" width="12" height="12" />
                </svg>
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={!inputValue.trim()}
                className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-colors disabled:opacity-30"
                aria-label="Send"
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
                  <path d="M5 12h14" />
                  <path d="m12 5 7 7-7 7" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Versions sheet */}
        <Sheet open={versionsSheetOpen} onOpenChange={setVersionsSheetOpen}>
          <SheetContent>
            <SheetTitle className="text-sm font-mono mb-4">Versions</SheetTitle>
            <div className="flex-1 overflow-y-auto space-y-1">
              {versions.map((version, index) => (
                <button
                  key={version.id}
                  onClick={() => {
                    setSelectedVersionId(version.id);
                    setVersionsSheetOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
                    selectedVersionId === version.id
                      ? "bg-muted text-foreground"
                      : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-muted-foreground/70 shrink-0">
                      v{index + 1}
                    </span>
                    <span className="truncate flex-1">{version.prompt}</span>
                    {version.status === "generating" && (
                      <span className="text-xs text-muted-foreground shrink-0 animate-pulse">
                        ...
                      </span>
                    )}
                    {version.status === "error" && (
                      <span className="text-xs text-red-500 shrink-0">
                        failed
                      </span>
                    )}
                  </div>
                  {version.usage && (
                    <div className="mt-1 ml-6">
                      <span className="text-[10px] font-mono text-muted-foreground/60">
                        {formatTokens(
                          version.usage.promptTokens -
                            version.usage.cachedTokens,
                        )}{" "}
                        in · {formatTokens(version.usage.completionTokens)} out
                        {version.usage.cachedTokens > 0
                          ? ` · ${formatTokens(version.usage.cachedTokens)} cached`
                          : ""}
                      </span>
                    </div>
                  )}
                </button>
              ))}
              {versions.length === 0 && (
                <p className="text-sm text-muted-foreground px-3">
                  No versions yet. Enter a prompt to get started.
                </p>
              )}
            </div>
          </SheetContent>
        </Sheet>
      </div>

      <Toaster position="bottom-right" />
    </div>
  );
}
