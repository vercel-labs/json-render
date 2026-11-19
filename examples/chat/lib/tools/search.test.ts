import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createMCPClient: vi.fn(),
  generateText: vi.fn(),
  gateway: vi.fn(() => "fixture-search"),
}));
vi.mock("@ai-sdk/mcp", () => ({ createMCPClient: mocks.createMCPClient }));
vi.mock("@ai-sdk/gateway", () => ({ gateway: mocks.gateway }));
vi.mock("ai", async (original) => ({
  ...(await original<typeof import("ai")>()),
  generateText: mocks.generateText,
}));

const input = {
  query: "Find public streaming documentation",
  searchQueries: ["json-render chat streaming documentation"],
};
const options = { toolCallId: "search-1", messages: [] };

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.useRealTimers();
  vi.resetAllMocks();
  vi.resetModules();
});

function mockClient(result: unknown) {
  const execute = vi.fn().mockResolvedValue(result);
  const close = vi.fn().mockResolvedValue(undefined);
  const listTools = vi.fn().mockResolvedValue({ tools: [] });
  const toolsFromDefinitions = vi
    .fn()
    .mockReturnValue({ web_search: { execute } });
  mocks.createMCPClient.mockResolvedValue({
    listTools,
    toolsFromDefinitions,
    close,
  });
  return { execute, close, listTools };
}

describe("chat search provider", () => {
  it("keeps the default path without opening an MCP client", async () => {
    vi.stubEnv("CHAT_SEARCH_PROVIDER", "");
    mocks.generateText.mockResolvedValue({ text: "Default search answer" });
    const { webSearch } = await import("./search");
    await expect(
      webSearch.execute!({ query: input.query, searchQueries: [] }, options),
    ).resolves.toEqual({ content: "Default search answer" });
    expect(mocks.generateText).toHaveBeenCalledWith({
      model: "fixture-search",
      prompt: input.query,
    });
    expect(mocks.createMCPClient).not.toHaveBeenCalled();
  });

  it("normalizes Parallel excerpts and sources, sends its User-Agent, and closes", async () => {
    vi.stubEnv("CHAT_SEARCH_PROVIDER", "parallel");
    const url = "https://example.org/docs?original=1";
    const client = mockClient({
      content: [
        {
          type: "text",
          text: JSON.stringify({
            results: [
              {
                title: "Documentation",
                url,
                excerpts: ["UI streams as patches."],
              },
              { title: "Duplicate", url, excerpts: [] },
              { title: "Unsafe", url: "javascript:alert(1)", excerpts: [] },
            ],
          }),
        },
      ],
    });
    const { webSearch } = await import("./search");
    await expect(webSearch.execute!(input, options)).resolves.toEqual({
      content: `Documentation\n${url}\nUI streams as patches.`,
      sources: [{ title: "Documentation", url }],
    });
    expect(client.execute).toHaveBeenCalledWith(
      { objective: input.query, search_queries: input.searchQueries },
      expect.objectContaining({ abortSignal: expect.any(AbortSignal) }),
    );
    const config = mocks.createMCPClient.mock.calls[0]![0];
    expect(config.transport.headers).toEqual({
      "User-Agent": "json-render-chat",
    });
    expect(config.transport.authProvider).toBeUndefined();
    const fetch = vi.fn().mockResolvedValue(new Response("ok"));
    vi.stubGlobal("fetch", fetch);
    await config.transport.fetch(config.transport.url, {
      headers: config.transport.headers,
    });
    expect(fetch).toHaveBeenCalledWith(
      config.transport.url,
      expect.objectContaining({
        headers: { "User-Agent": "json-render-chat" },
      }),
    );
    expect(client.close).toHaveBeenCalledOnce();
    expect(mocks.generateText).not.toHaveBeenCalled();
  });

  it.each([
    { isError: true, content: [{ type: "text", text: "rate limited" }] },
    { content: [{ type: "text", text: "not JSON" }] },
    {
      content: [{ type: "text", text: JSON.stringify({ results: "invalid" }) }],
    },
    { content: [] },
  ])(
    "reports failed or malformed results and closes without a provider fallback",
    async (result) => {
      const client = mockClient(result);
      const { parallelWebSearch } = await import("./parallel-search");
      expect(await parallelWebSearch.execute!(input, options)).toEqual({
        error: expect.stringMatching(/^Search failed:/),
      });
      expect(client.close).toHaveBeenCalledOnce();
      expect(mocks.generateText).not.toHaveBeenCalled();
    },
  );

  it("reports connection and discovery failures", async () => {
    mocks.createMCPClient.mockRejectedValueOnce(new Error("HTTP 429"));
    const { parallelWebSearch } = await import("./parallel-search");
    expect(await parallelWebSearch.execute!(input, options)).toEqual({
      error: "Search failed: HTTP 429",
    });
    const client = mockClient({});
    client.listTools.mockRejectedValueOnce(new Error("discovery failed"));
    expect(await parallelWebSearch.execute!(input, options)).toEqual({
      error: "Search failed: discovery failed",
    });
    expect(client.close).toHaveBeenCalledOnce();
  });

  it.each(["cancel", "timeout"])(
    "bounds the entire transport on %s and closes",
    async (reason) => {
      vi.useFakeTimers();
      const controller = new AbortController();
      const deadline = new AbortController();
      vi.spyOn(AbortSignal, "timeout").mockImplementation((ms) => {
        expect(ms).toBe(30_000);
        setTimeout(() => deadline.abort(new Error("search timeout")), ms);
        return deadline.signal;
      });
      const client = mockClient({});
      client.listTools.mockImplementation(async () => {
        const config = mocks.createMCPClient.mock.calls[0]![0];
        await config.transport.fetch(config.transport.url, {});
        return {};
      });
      vi.stubGlobal(
        "fetch",
        vi.fn(
          (_url, init) =>
            new Promise((_resolve, reject) => {
              init.signal.addEventListener(
                "abort",
                () => reject(init.signal.reason),
                { once: true },
              );
            }),
        ),
      );
      const { parallelWebSearch } = await import("./parallel-search");
      const pending = parallelWebSearch.execute!(input, {
        ...options,
        abortSignal: controller.signal,
      });
      await vi.advanceTimersByTimeAsync(1);
      if (reason === "cancel") controller.abort(new Error("request cancelled"));
      else await vi.advanceTimersByTimeAsync(30_000);
      expect(await pending).toEqual({
        error: expect.stringContaining(
          reason === "cancel" ? "request cancelled" : "search timeout",
        ),
      });
      expect(client.close).toHaveBeenCalledOnce();
      vi.restoreAllMocks();
    },
  );
});
