"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { examples } from "@/lib/examples";
import { createSpecStreamCompiler } from "@json-render/core";
import type { Spec } from "@json-render/core";
import { cn } from "@/lib/utils";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import { FileText, Download, Loader2, ArrowRight, Square } from "lucide-react";

type Mode = "scratch" | "example";
type MobileView = "json" | "preview";

interface Selection {
  mode: Mode;
  exampleName?: string;
}

const HTML_REFRESH_INTERVAL_MS = 2000;

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="text-xs text-muted-foreground hover:text-foreground transition-colors font-mono"
    >
      {copied ? "copied" : "copy"}
    </button>
  );
}

function isRenderableSpec(spec: Spec | null): spec is Spec {
  if (!spec?.root || !spec.elements) return false;
  const root = spec.elements[spec.root];
  if (!root) return false;
  if (root.type !== "Html" || !root.children?.length) return false;
  const childTypes = root.children.map((id) => spec.elements[id]?.type);
  return childTypes.includes("Head") || childTypes.includes("Body");
}

export default function Page() {
  const [selection, setSelection] = useState<Selection>({
    mode: "example",
    exampleName: examples[0]!.name,
  });
  const [prompt, setPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generatedSpec, setGeneratedSpec] = useState<Spec | null>(null);
  const [htmlContent, setHtmlContent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<MobileView>("preview");
  const [examplesSheetOpen, setExamplesSheetOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const mobileInputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const codeScrollRef = useRef<HTMLDivElement>(null);
  const mobileCodeScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!generating) return;
    codeScrollRef.current?.scrollTo({
      top: codeScrollRef.current.scrollHeight,
    });
    mobileCodeScrollRef.current?.scrollTo({
      top: mobileCodeScrollRef.current.scrollHeight,
    });
  }, [generating, generatedSpec]);

  const currentExample =
    selection.mode === "example"
      ? examples.find((e) => e.name === selection.exampleName)
      : null;

  const activeSpec = generatedSpec ?? currentExample?.spec ?? null;

  useEffect(() => {
    inputRef.current?.focus();
  }, [selection.mode, selection.exampleName]);

  const fetchHtml = useCallback(async (spec: Spec, signal?: AbortSignal) => {
    const res = await fetch("/api/email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ spec }),
      signal,
    });
    if (!res.ok) throw new Error("Failed to render email");
    const html = await res.text();
    setHtmlContent(html);
  }, []);

  // Fetch HTML for example specs on selection change
  useEffect(() => {
    if (selection.mode !== "example" || !currentExample || generatedSpec)
      return;
    fetchHtml(currentExample.spec).catch(() => {});
  }, [selection.mode, currentExample, generatedSpec, fetchHtml]);

  // Progressive HTML refresh during generation
  const lastRefreshSpec = useRef<string>("");
  const generatedSpecRef = useRef<Spec | null>(null);
  generatedSpecRef.current = generatedSpec;

  useEffect(() => {
    if (!generating) return;

    const interval = setInterval(() => {
      const spec = generatedSpecRef.current;
      if (!spec) return;

      const specKey = JSON.stringify(spec);
      if (specKey === lastRefreshSpec.current) return;
      if (!isRenderableSpec(spec)) return;

      lastRefreshSpec.current = specKey;
      setRefreshing(true);
      fetchHtml(spec)
        .catch(() => {})
        .finally(() => setRefreshing(false));
    }, HTML_REFRESH_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [generating, fetchHtml]);

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setGenerating(true);
    setError(null);
    lastRefreshSpec.current = "";

    try {
      const startingSpec =
        selection.mode === "example" && currentExample
          ? currentExample.spec
          : null;

      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: prompt.trim(), startingSpec }),
        signal: controller.signal,
      });
      if (!res.ok) throw new Error("Generation failed");

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      const compiler = createSpecStreamCompiler<Spec>(
        startingSpec ? { ...startingSpec } : {},
      );

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        const { result, newPatches } = compiler.push(chunk);
        if (newPatches.length > 0) setGeneratedSpec(result);
      }

      const finalSpec = compiler.getResult();
      setGeneratedSpec(finalSpec);
      setGenerating(false);

      await fetchHtml(finalSpec);
    } catch (e) {
      if (controller.signal.aborted) return;
      setError(e instanceof Error ? e.message : "Something went wrong");
      setGenerating(false);
    }
  }, [prompt, selection, currentExample, fetchHtml]);

  const handleStop = useCallback(() => {
    abortRef.current?.abort();
    setGenerating(false);

    if (isRenderableSpec(generatedSpec)) {
      fetchHtml(generatedSpec).catch(() => {});
    }
  }, [generatedSpec, fetchHtml]);

  const select = (next: Selection) => {
    abortRef.current?.abort();
    setSelection(next);
    setGeneratedSpec(null);
    setHtmlContent(null);
    setError(null);
    setPrompt("");
    setGenerating(false);
    setExamplesSheetOpen(false);
  };

  const handleDownload = async () => {
    if (!activeSpec) return;
    const spec = generatedSpec ?? currentExample?.spec;
    if (!spec) return;

    const res = await fetch("/api/email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ spec }),
    });
    if (!res.ok) return;
    const html = await res.text();
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "email.html";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleGenerate();
      }
    },
    [handleGenerate],
  );

  const jsonCode = activeSpec
    ? JSON.stringify(activeSpec, null, 2)
    : "// select an example or generate an email";

  // ---------------------------------------------------------------------------
  // Pane: Chat / Examples
  // ---------------------------------------------------------------------------
  const chatPane = (
    <div className="h-full flex flex-col">
      <div className="border-b border-border px-3 h-9 flex items-center gap-2">
        <FileText className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs font-mono text-muted-foreground">
          json-render / react-email
        </span>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          <p className="px-2 pt-2 pb-1 text-[11px] font-mono text-muted-foreground">
            start
          </p>
          <button
            onClick={() => select({ mode: "scratch" })}
            className={cn(
              "w-full text-left px-3 py-2 rounded text-sm transition-colors",
              selection.mode === "scratch"
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
            )}
          >
            <span className="font-medium">From scratch</span>
          </button>

          <p className="px-2 pt-3 pb-1 text-[11px] font-mono text-muted-foreground">
            examples
          </p>
          {examples.map((ex) => (
            <button
              key={ex.name}
              onClick={() => select({ mode: "example", exampleName: ex.name })}
              className={cn(
                "w-full text-left px-3 py-2 rounded text-sm transition-colors",
                selection.mode === "example" &&
                  selection.exampleName === ex.name
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
              )}
            >
              <span className="font-medium">{ex.label}</span>
              <p className="text-xs text-muted-foreground/70 mt-0.5 leading-snug">
                {ex.description}
              </p>
            </button>
          ))}
        </div>
      </ScrollArea>

      <div
        className="border-t border-border p-3 cursor-text"
        onMouseDown={(e) => {
          const target = e.target as HTMLElement;
          if (!target.closest("button") && target.tagName !== "TEXTAREA") {
            e.preventDefault();
            inputRef.current?.focus();
          }
        }}
      >
        {error && (
          <div className="mb-2 rounded bg-destructive/10 px-3 py-1.5 text-xs text-destructive">
            {error}
          </div>
        )}
        <textarea
          ref={inputRef}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            selection.mode === "scratch"
              ? "Describe the email you want..."
              : `Modify the ${currentExample?.label ?? "example"}...`
          }
          className="w-full bg-background text-sm resize-none outline-none placeholder:text-muted-foreground/50"
          rows={2}
          autoFocus
        />
        <div className="flex justify-between items-center mt-2">
          <span className="text-[11px] text-muted-foreground">
            {selection.mode === "example" && currentExample
              ? currentExample.label
              : "scratch"}
          </span>
          {generating ? (
            <button
              onClick={handleStop}
              className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-colors"
              aria-label="Stop"
            >
              <Square className="h-3 w-3" fill="currentColor" />
            </button>
          ) : (
            <button
              onClick={handleGenerate}
              disabled={!prompt.trim()}
              className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-colors disabled:opacity-30"
              aria-label="Generate"
            >
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );

  // ---------------------------------------------------------------------------
  // Pane: JSON Spec
  // ---------------------------------------------------------------------------
  const codePane = (
    <div className="h-full flex flex-col">
      <div className="border-b border-border px-3 h-9 flex items-center gap-3">
        <span className="text-xs font-mono text-foreground">json</span>
        {generating && (
          <Loader2 className="h-3 w-3 text-muted-foreground animate-spin" />
        )}
        <div className="flex-1" />
        {activeSpec && <CopyButton text={jsonCode} />}
      </div>
      <div ref={codeScrollRef} className="flex-1 overflow-auto">
        <pre className="p-3 text-xs leading-relaxed font-mono text-muted-foreground whitespace-pre">
          {jsonCode}
        </pre>
      </div>
    </div>
  );

  // ---------------------------------------------------------------------------
  // Pane: Email Preview
  // ---------------------------------------------------------------------------
  const previewPane = (
    <div className="h-full flex flex-col">
      <div className="border-b border-border px-3 h-9 flex items-center gap-3">
        <span className="text-xs font-mono text-foreground">preview</span>
        {(generating || refreshing) && (
          <Loader2 className="h-3 w-3 text-muted-foreground animate-spin" />
        )}
        <div className="flex-1" />
        {activeSpec && (
          <button
            onClick={handleDownload}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors font-mono flex items-center gap-1"
          >
            <Download className="h-3 w-3" />
            download
          </button>
        )}
      </div>
      <div className="flex-1 relative bg-neutral-600">
        {htmlContent ? (
          <div className="h-full flex justify-center p-5 overflow-auto">
            <iframe
              srcDoc={htmlContent}
              className="w-[620px] h-full border-none bg-white shadow-sm"
              title="Email preview"
            />
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center gap-2 text-neutral-400">
            <FileText className="h-10 w-10" />
            <p className="text-sm">
              {selection.mode === "scratch"
                ? "Enter a prompt to generate an email"
                : "Select an example to preview"}
            </p>
          </div>
        )}
      </div>
    </div>
  );

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="h-dvh flex flex-col">
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

      {/* Mobile: toolbar + content + prompt */}
      <div className="flex lg:hidden flex-col flex-1 min-h-0">
        <div className="border-b border-border px-3 h-9 flex items-center gap-3 shrink-0">
          <button
            onClick={() => setExamplesSheetOpen(true)}
            className="text-xs font-mono font-medium px-1.5 py-0.5 rounded bg-muted text-foreground shrink-0"
          >
            {selection.mode === "example" && currentExample
              ? currentExample.label
              : "scratch"}
          </button>
          {(["json", "preview"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setMobileView(tab)}
              className={cn(
                "text-xs font-mono transition-colors shrink-0",
                mobileView === tab
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {tab}
            </button>
          ))}
          {(generating || refreshing) && (
            <Loader2 className="h-3 w-3 text-muted-foreground animate-spin shrink-0" />
          )}
          <div className="flex-1" />
          {activeSpec && (
            <button
              onClick={handleDownload}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors font-mono flex items-center gap-1"
            >
              <Download className="h-3 w-3" />
            </button>
          )}
        </div>

        <div ref={mobileCodeScrollRef} className="flex-1 min-h-0 overflow-auto">
          {mobileView === "json" ? (
            <pre className="p-3 text-xs leading-relaxed font-mono text-muted-foreground whitespace-pre">
              {jsonCode}
            </pre>
          ) : (
            <div className="h-full relative bg-neutral-600">
              {htmlContent ? (
                <div className="h-full flex justify-center p-5 overflow-auto">
                  <iframe
                    srcDoc={htmlContent}
                    className="w-[620px] h-full border-none bg-white shadow-sm"
                    title="Email preview"
                  />
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center gap-2 text-neutral-400">
                  <FileText className="h-10 w-10" />
                  <p className="text-sm">Enter a prompt to generate an email</p>
                </div>
              )}
            </div>
          )}
        </div>

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
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              selection.mode === "scratch"
                ? "Describe the email you want..."
                : `Modify the ${currentExample?.label ?? "example"}...`
            }
            className="w-full bg-background text-base resize-none outline-none placeholder:text-muted-foreground/50"
            rows={2}
          />
          <div className="flex justify-between items-center mt-2">
            <span className="text-[11px] text-muted-foreground">
              {selection.mode === "example" && currentExample
                ? currentExample.label
                : "scratch"}
            </span>
            {generating ? (
              <button
                onClick={handleStop}
                className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-colors"
                aria-label="Stop"
              >
                <Square className="h-3 w-3" fill="currentColor" />
              </button>
            ) : (
              <button
                onClick={handleGenerate}
                disabled={!prompt.trim()}
                className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-colors disabled:opacity-30"
                aria-label="Generate"
              >
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        <Sheet open={examplesSheetOpen} onOpenChange={setExamplesSheetOpen}>
          <SheetContent side="left" className="w-80 p-0">
            <SheetTitle className="sr-only">Examples</SheetTitle>
            <ScrollArea className="h-full">
              <div className="p-2 space-y-1">
                <p className="px-2 pt-2 pb-1 text-[11px] font-mono text-muted-foreground">
                  start
                </p>
                <button
                  onClick={() => select({ mode: "scratch" })}
                  className={cn(
                    "w-full text-left px-3 py-2 rounded text-sm transition-colors",
                    selection.mode === "scratch"
                      ? "bg-muted text-foreground"
                      : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                  )}
                >
                  From scratch
                </button>
                <p className="px-2 pt-3 pb-1 text-[11px] font-mono text-muted-foreground">
                  examples
                </p>
                {examples.map((ex) => (
                  <button
                    key={ex.name}
                    onClick={() =>
                      select({ mode: "example", exampleName: ex.name })
                    }
                    className={cn(
                      "w-full text-left px-3 py-2 rounded text-sm transition-colors",
                      selection.mode === "example" &&
                        selection.exampleName === ex.name
                        ? "bg-muted text-foreground"
                        : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                    )}
                  >
                    <span className="font-medium">{ex.label}</span>
                    <p className="text-xs text-muted-foreground/70 mt-0.5 leading-snug">
                      {ex.description}
                    </p>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}
