"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
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
import {
  MessageSquare,
  Loader2,
  ArrowRight,
  Square,
  Moon,
  Sun,
} from "lucide-react";
import { CardSpecError, toCard, toPartialCard } from "@json-render/chat";
import { cardToSlackBlocks, type SlackBlock } from "@chat-adapter/slack/blocks";
import { cardToAdaptiveCard } from "@chat-adapter/teams/cards";
import type { CardElement } from "chat";
import { slackLimits } from "@/lib/catalog";
import { SlackPreview } from "@/components/slack-preview";

type Mode = "scratch" | "example";
type MobileView = "json" | "preview";
type PreviewTab = "slack" | "teams";

interface Rendered {
  card: CardElement | null;
  blocks: SlackBlock[];
  issues: string[];
}

// Streaming specs render best effort. Complete specs are validated against
// Slack's limits so problems show up before a bot would post them.
function render(spec: Spec | null, partial: boolean): Rendered {
  if (!spec) return { card: null, blocks: [], issues: [] };
  let card: CardElement | null = null;
  let issues: string[] = [];
  if (partial) card = toPartialCard(spec);
  else {
    try {
      card = toCard(spec, { limits: slackLimits });
    } catch (e) {
      if (!(e instanceof CardSpecError)) throw e;
      issues = e.issues;
      card = toPartialCard(spec);
    }
  }
  return { card, blocks: card ? cardToSlackBlocks(card as never) : [], issues };
}

interface Selection {
  mode: Mode;
  exampleName?: string;
}

function CopyButton({
  text,
  label = "copy",
}: {
  text: string;
  label?: string;
}) {
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
      {copied ? "copied" : label}
    </button>
  );
}

export default function Page() {
  const [selection, setSelection] = useState<Selection>({
    mode: "example",
    exampleName: examples[0]!.name,
  });
  const [prompt, setPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generatedSpec, setGeneratedSpec] = useState<Spec | null>(null);
  const [previewTab, setPreviewTab] = useState<PreviewTab>("slack");
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [error, setError] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<MobileView>("preview");
  const [examplesSheetOpen, setExamplesSheetOpen] = useState(false);
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

  useEffect(() => {
    setTheme(
      window.matchMedia("(prefers-color-scheme: light)").matches
        ? "light"
        : "dark",
    );
  }, []);

  const rendered = useMemo(
    () => render(activeSpec, generating),
    [activeSpec, generating],
  );
  const builderPayload = JSON.stringify({ blocks: rendered.blocks }, null, 2);
  const adaptiveCard = rendered.card
    ? JSON.stringify(cardToAdaptiveCard(rendered.card as never), null, 2)
    : "";

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setGenerating(true);
    setError(null);

    try {
      const stream = async (text: string, startingSpec: Spec | null) => {
        const res = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: text, startingSpec }),
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
          const { result, newPatches } = compiler.push(
            decoder.decode(value, { stream: true }),
          );
          if (newPatches.length > 0) setGeneratedSpec(result);
        }
        const finalSpec = compiler.getResult();
        setGeneratedSpec(finalSpec);
        return finalSpec;
      };

      let finalSpec = await stream(
        prompt.trim(),
        selection.mode === "example" && currentExample
          ? currentExample.spec
          : null,
      );
      // A bot would not post an invalid card, so retry once with the issues.
      try {
        toCard(finalSpec, { limits: slackLimits });
      } catch (e) {
        if (!(e instanceof CardSpecError)) throw e;
        finalSpec = await stream(
          `Fix these problems in the message and keep everything else:\n${e.issues.join("\n")}`,
          finalSpec,
        );
      }
      setGenerating(false);
    } catch (e) {
      if (controller.signal.aborted) return;
      setError(e instanceof Error ? e.message : "Something went wrong");
      setGenerating(false);
    }
  }, [prompt, selection, currentExample]);

  const handleStop = useCallback(() => {
    abortRef.current?.abort();
    setGenerating(false);
  }, []);

  const select = (next: Selection) => {
    abortRef.current?.abort();
    setSelection(next);
    setGeneratedSpec(null);
    setError(null);
    setPrompt("");
    setGenerating(false);
    setExamplesSheetOpen(false);
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
    : "// select an example or generate a message";

  // ---------------------------------------------------------------------------
  // Pane: Chat / Examples
  // ---------------------------------------------------------------------------
  const chatPane = (
    <div className="h-full flex flex-col">
      <div className="border-b border-border px-3 h-9 flex items-center gap-2">
        <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs font-mono text-muted-foreground">
          json-render / chat
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
              ? "Describe the message a bot should post..."
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
  // Pane: Chat preview
  // ---------------------------------------------------------------------------
  const previewControls = (
    <>
      {(["slack", "teams"] as const).map((tab) => (
        <button
          key={tab}
          onClick={() => setPreviewTab(tab)}
          className={cn(
            "text-xs font-mono transition-colors shrink-0",
            previewTab === tab
              ? "text-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {tab}
        </button>
      ))}
      {generating && (
        <Loader2 className="h-3 w-3 text-muted-foreground animate-spin shrink-0" />
      )}
      <div className="flex-1" />
      {previewTab === "slack" && rendered.blocks.length > 0 && (
        <CopyButton text={builderPayload} label="copy for block kit builder" />
      )}
      {previewTab === "slack" && (
        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Toggle preview theme"
        >
          {theme === "dark" ? (
            <Sun className="h-3.5 w-3.5" />
          ) : (
            <Moon className="h-3.5 w-3.5" />
          )}
        </button>
      )}
      {previewTab === "teams" && adaptiveCard && (
        <CopyButton text={adaptiveCard} />
      )}
    </>
  );

  const previewBody = (
    <div className="h-full flex flex-col min-h-0">
      {rendered.issues.length > 0 && (
        <div className="border-b border-border bg-destructive/10 px-3 py-2 text-xs text-destructive font-mono space-y-0.5">
          {rendered.issues.map((issue) => (
            <p key={issue}>{issue}</p>
          ))}
        </div>
      )}
      {previewTab === "slack" ? (
        <div className="sk-root flex-1 overflow-auto" data-theme={theme}>
          {rendered.blocks.length > 0 ? (
            <div className="flex justify-center p-5">
              <SlackPreview blocks={rendered.blocks} theme={theme} />
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center gap-2 text-[var(--sk-muted)]">
              <MessageSquare className="h-10 w-10" />
              <p className="text-sm">
                {selection.mode === "scratch"
                  ? "Enter a prompt to generate a message"
                  : "Select an example to preview"}
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="flex-1 overflow-auto">
          <pre className="p-3 text-xs leading-relaxed font-mono text-muted-foreground whitespace-pre">
            {adaptiveCard || "// no card yet"}
          </pre>
        </div>
      )}
    </div>
  );

  const previewPane = (
    <div className="h-full flex flex-col">
      <div className="border-b border-border px-3 h-9 flex items-center gap-3">
        {previewControls}
      </div>
      <div className="flex-1 min-h-0">{previewBody}</div>
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
          {generating && (
            <Loader2 className="h-3 w-3 text-muted-foreground animate-spin shrink-0" />
          )}
        </div>

        <div ref={mobileCodeScrollRef} className="flex-1 min-h-0 overflow-auto">
          {mobileView === "json" ? (
            <pre className="p-3 text-xs leading-relaxed font-mono text-muted-foreground whitespace-pre">
              {jsonCode}
            </pre>
          ) : (
            <div className="h-full flex flex-col">
              <div className="border-b border-border px-3 h-9 flex items-center gap-3 shrink-0">
                {previewControls}
              </div>
              <div className="flex-1 min-h-0">{previewBody}</div>
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
                ? "Describe the message a bot should post..."
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
