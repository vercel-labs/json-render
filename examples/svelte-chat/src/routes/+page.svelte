<script lang="ts">
  import { Chat } from "@ai-sdk/svelte";
  import { DefaultChatTransport } from "ai";
  import { SPEC_DATA_PART_TYPE } from "@json-render/core";
  import {
    buildSpecFromParts,
    getTextFromParts,
    type DataPart,
  } from "@json-render/svelte";
  import type { Spec } from "@json-render/svelte";
  import ExplorerRenderer from "$lib/render/Renderer.svelte";
  import { ArrowDown, ArrowUp, Loader2, Sparkles } from "lucide-svelte";

  // =============================================================================
  // Chat Setup
  // =============================================================================

  let input = $state("");
  let showScrollButton = $state(false);
  let isStickToBottom = $state(true);
  let scrollContainer: HTMLElement | null = null;
  let inputRef: HTMLTextAreaElement | null = null;

  const chat = new Chat({
    transport: new DefaultChatTransport({
      api: "/api/generate",
    }),
  });

  const isStreaming = $derived(
    chat.status === "streaming" || chat.status === "submitted",
  );
  const isEmpty = $derived(chat.messages.length === 0);

  // =============================================================================
  // Suggestions
  // =============================================================================

  const SUGGESTIONS = [
    {
      label: "Weather comparison",
      prompt: "Compare the weather in New York, London, and Tokyo",
    },
    {
      label: "GitHub repo stats",
      prompt: "Show me stats for the vercel/next.js and vercel/ai GitHub repos",
    },
    {
      label: "Crypto dashboard",
      prompt: "Build a crypto dashboard for Bitcoin, Ethereum, and Solana",
    },
    {
      label: "Hacker News top stories",
      prompt: "Show me the top 15 Hacker News stories right now",
    },
  ];

  // =============================================================================
  // Tool Labels
  // =============================================================================

  const TOOL_LABELS: Record<string, [string, string]> = {
    getWeather: ["Getting weather data", "Got weather data"],
    getGitHubRepo: ["Fetching GitHub repo", "Fetched GitHub repo"],
    getGitHubPullRequests: ["Fetching pull requests", "Fetched pull requests"],
    getCryptoPrice: ["Looking up crypto price", "Looked up crypto price"],
    getCryptoPriceHistory: ["Fetching price history", "Fetched price history"],
    getHackerNewsTop: ["Loading Hacker News", "Loaded Hacker News"],
    webSearch: ["Searching the web", "Searched the web"],
  };

  // =============================================================================
  // Message Handling
  // =============================================================================

  function handleSubmit(text?: string) {
    const message = text || input;
    if (!message.trim() || isStreaming) return;
    input = "";
    chat.sendMessage({ text: message.trim() });
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  function handleClear() {
    chat.messages = [];
    input = "";
    inputRef?.focus();
  }

  function scrollToBottom() {
    if (!scrollContainer) return;
    isStickToBottom = true;
    showScrollButton = false;
    scrollContainer.scrollTo({
      top: scrollContainer.scrollHeight,
      behavior: "smooth",
    });
  }

  // =============================================================================
  // Scroll tracking
  // =============================================================================

  function handleScroll() {
    if (!scrollContainer) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainer;
    const atBottom = scrollTop + clientHeight >= scrollHeight - 80;
    isStickToBottom = atBottom;
    showScrollButton = !atBottom;
  }

  // Auto-scroll on new messages
  $effect(() => {
    if (scrollContainer && isStickToBottom && chat.messages.length > 0) {
      scrollContainer.scrollTop = scrollContainer.scrollHeight;
    }
  });

  // =============================================================================
  // Helpers
  // =============================================================================

  function getSpec(parts: DataPart[]): Spec | null {
    return buildSpecFromParts(parts);
  }

  function getText(parts: DataPart[]): string {
    return getTextFromParts(parts);
  }

  function hasSpec(parts: DataPart[]): boolean {
    return parts.some((p) => p.type === SPEC_DATA_PART_TYPE);
  }

  interface ToolInfo {
    toolCallId: string;
    toolName: string;
    state: string;
    output?: unknown;
  }

  type Segment =
    | { kind: "text"; text: string }
    | { kind: "tools"; tools: ToolInfo[] }
    | { kind: "spec" };

  function getSegments(parts: DataPart[]): {
    segments: Segment[];
    specInserted: boolean;
  } {
    const segments: Segment[] = [];
    let specInserted = false;

    for (const part of parts) {
      if (part.type === "text" && part.text) {
        const text = part.text;
        if (!text.trim()) continue;
        const last = segments[segments.length - 1];
        if (last?.kind === "text") {
          last.text += text;
        } else {
          segments.push({ kind: "text", text });
        }
      } else if (part.type.startsWith("tool-")) {
        const tp = part as {
          type: string;
          toolCallId?: string;
          state?: string;
          output?: unknown;
        };
        const last = segments[segments.length - 1];
        const toolInfo: ToolInfo = {
          toolCallId: tp.toolCallId || "",
          toolName: tp.type.replace(/^tool-/, ""),
          state: tp.state || "",
          output: tp.output,
        };
        if (last?.kind === "tools") {
          last.tools.push(toolInfo);
        } else {
          segments.push({ kind: "tools", tools: [toolInfo] });
        }
      } else if (part.type === SPEC_DATA_PART_TYPE && !specInserted) {
        segments.push({ kind: "spec" });
        specInserted = true;
      }
    }

    return { segments, specInserted };
  }
</script>

<div class="h-screen flex flex-col overflow-hidden">
  <!-- Header -->
  <header
    class="border-b px-6 py-3 flex items-center justify-between flex-shrink-0">
    <div class="flex items-center gap-3">
      <h1 class="text-lg font-semibold">json-render Svelte Chat</h1>
    </div>
    <div class="flex items-center gap-2">
      {#if chat.messages.length > 0}
        <button
          onclick={handleClear}
          class="px-3 py-1.5 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
          Start Over
        </button>
      {/if}
    </div>
  </header>

  <!-- Messages area -->
  <main
    bind:this={scrollContainer}
    onscroll={handleScroll}
    class="flex-1 overflow-auto">
    {#if isEmpty}
      <!-- Empty state -->
      <div class="h-full flex flex-col items-center justify-center px-6 py-12">
        <div class="max-w-2xl w-full space-y-8">
          <div class="text-center space-y-2">
            <h2 class="text-2xl font-semibold tracking-tight">
              What would you like to explore?
            </h2>
            <p class="text-muted-foreground">
              Ask about weather, GitHub repos, crypto prices, or Hacker News --
              the agent will fetch real data and build a dashboard.
            </p>
          </div>

          <!-- Suggestions -->
          <div class="flex flex-wrap gap-2 justify-center">
            {#each SUGGESTIONS as s}
              <button
                onclick={() => handleSubmit(s.prompt)}
                class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
                <Sparkles class="h-3 w-3" />
                {s.label}
              </button>
            {/each}
          </div>
        </div>
      </div>
    {:else}
      <!-- Message thread -->
      <div class="max-w-4xl mx-auto px-10 py-6 space-y-6">
        {#each chat.messages as message, index}
          {@const isLast = index === chat.messages.length - 1}
          {@const parts = message.parts as DataPart[]}
          {@const spec = getSpec(parts)}
          {@const text = getText(parts)}
          {@const messageHasSpec = hasSpec(parts)}
          {@const { segments, specInserted } = getSegments(parts)}

          {#if message.role === "user"}
            <!-- User message -->
            <div class="flex justify-end">
              {#if text}
                <div
                  class="max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap bg-primary text-primary-foreground rounded-tr-md">
                  {text}
                </div>
              {/if}
            </div>
          {:else}
            <!-- Assistant message -->
            {@const hasAnything = segments.length > 0 || messageHasSpec}
            {@const showLoader = isLast && isStreaming && !hasAnything}
            {@const showSpecAtEnd = messageHasSpec && !specInserted}

            <div class="w-full flex flex-col gap-3">
              {#each segments as seg, i}
                {#if seg.kind === "text"}
                  <div
                    class="text-sm leading-relaxed [&_p+p]:mt-3 [&_ul]:mt-2 [&_ol]:mt-2 [&_pre]:mt-2">
                    {seg.text}
                  </div>
                {:else if seg.kind === "spec"}
                  {#if spec}
                    <div class="w-full">
                      <ExplorerRenderer
                        {spec}
                        loading={isLast && isStreaming} />
                    </div>
                  {/if}
                {:else if seg.kind === "tools"}
                  <div class="flex flex-col gap-1">
                    {#each seg.tools as t}
                      {@const toolIsLoading =
                        t.state !== "output-available" &&
                        t.state !== "output-error" &&
                        t.state !== "output-denied"}
                      {@const labels = TOOL_LABELS[t.toolName]}
                      {@const label = labels
                        ? toolIsLoading
                          ? labels[0]
                          : labels[1]
                        : t.toolName}

                      <div class="text-sm group">
                        <span
                          class="text-muted-foreground {toolIsLoading
                            ? 'animate-shimmer'
                            : ''}">
                          {label}
                        </span>
                      </div>
                    {/each}
                  </div>
                {/if}
              {/each}

              <!-- Loading indicator -->
              {#if showLoader}
                <div class="text-sm text-muted-foreground animate-shimmer">
                  Thinking...
                </div>
              {/if}

              <!-- Fallback: render spec at end if no inline position was found -->
              {#if showSpecAtEnd && spec}
                <div class="w-full">
                  <ExplorerRenderer {spec} loading={isLast && isStreaming} />
                </div>
              {/if}
            </div>
          {/if}
        {/each}

        <!-- Error display -->
        {#if chat.error}
          <div
            class="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {chat.error.message}
          </div>
        {/if}
      </div>
    {/if}
  </main>

  <!-- Input bar -->
  <div class="px-6 pb-3 flex-shrink-0 bg-background relative">
    <!-- Scroll to bottom button -->
    {#if showScrollButton && !isEmpty}
      <button
        onclick={scrollToBottom}
        class="absolute left-1/2 -translate-x-1/2 -top-10 z-10 h-8 w-8 rounded-full border border-border bg-background text-muted-foreground shadow-md flex items-center justify-center hover:text-foreground hover:bg-accent transition-colors"
        aria-label="Scroll to bottom">
        <ArrowDown class="h-4 w-4" />
      </button>
    {/if}

    <div class="max-w-4xl mx-auto relative">
      <textarea
        bind:this={inputRef}
        bind:value={input}
        onkeydown={handleKeyDown}
        placeholder={isEmpty
          ? "e.g., Compare weather in NYC, London, and Tokyo..."
          : "Ask a follow-up..."}
        rows={2}
        class="w-full resize-none rounded-xl border border-input bg-card px-4 py-3 pr-12 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      ></textarea>
      <button
        onclick={() => handleSubmit()}
        disabled={!input.trim() || isStreaming}
        class="absolute right-3 bottom-3 h-8 w-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
        {#if isStreaming}
          <Loader2 class="h-4 w-4 animate-spin" />
        {:else}
          <ArrowUp class="h-4 w-4" />
        {/if}
      </button>
    </div>
  </div>
</div>
