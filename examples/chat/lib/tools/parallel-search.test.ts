import { afterEach, describe, expect, it, vi } from "vitest";
import { parallelWebSearch } from "./parallel-search";

const input = {
  query: "Find official streaming documentation",
  searchQueries: ["json-render chat streaming documentation"],
};
const options = { toolCallId: "search-1", messages: [] };

type StallAt = "initialize" | "tools/list" | "tools/call" | "DELETE";

function mockMcpServer(stallAt?: StallAt) {
  const methods: string[] = [];
  const sessionHeaders = { "Mcp-Session-Id": "local-test-session" };
  const url = "https://example.org/docs?ref=original#stream";
  let reportStall!: (signal: AbortSignal) => void;
  const stalled = new Promise<AbortSignal>((resolve) => {
    reportStall = resolve;
  });

  vi.stubGlobal("fetch", async (_url: string, init: RequestInit) => {
    if (init.method === "GET") return new Response(null, { status: 405 });

    const { method, id, params } =
      init.method === "DELETE"
        ? { method: "DELETE" }
        : JSON.parse(String(init.body));
    methods.push(method);
    const signal = init.signal!;
    signal.throwIfAborted();

    if (method === "tools/list" && !params?.cursor) {
      return Response.json({
        jsonrpc: "2.0",
        id,
        result: { tools: [], nextCursor: "next" },
      });
    }
    if (method === stallAt) {
      reportStall(signal);
      if (method === "DELETE") {
        return new Promise<Response>((_resolve, reject) => {
          signal.addEventListener("abort", () => reject(signal.reason), {
            once: true,
          });
        });
      }
      const body = new ReadableStream({
        start(controller) {
          signal.addEventListener(
            "abort",
            () => controller.error(signal.reason),
            {
              once: true,
            },
          );
        },
      });
      return new Response(body, {
        headers: { "Content-Type": "text/event-stream" },
      });
    }
    if (method === "DELETE") return new Response(null, { status: 204 });

    const reply = (result: unknown, headers?: HeadersInit) =>
      Response.json({ jsonrpc: "2.0", id, result }, { headers });
    if (method === "initialize") {
      return reply(
        {
          protocolVersion: params.protocolVersion,
          capabilities: { tools: {} },
          serverInfo: { name: "fixture", version: "1" },
        },
        sessionHeaders,
      );
    }
    if (method === "notifications/initialized") {
      return new Response(null, { status: 202 });
    }
    if (method === "tools/list") {
      return reply({
        tools: [{ name: "web_search", inputSchema: { type: "object" } }],
      });
    }
    if (method === "tools/call") {
      expect(params).toEqual({
        name: "web_search",
        arguments: {
          objective: input.query,
          search_queries: input.searchQueries,
        },
      });
      return reply({
        content: [
          {
            type: "text",
            text: JSON.stringify({
              results: [{ title: "Streaming", url, excerpts: ["UI patches"] }],
            }),
          },
        ],
      });
    }
    throw new Error(`Unexpected MCP method ${method}`);
  });
  return { methods, stalled, url };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("Parallel search with the MCP HTTP transport", () => {
  it("discovers search across pages, preserves original links, and closes", async () => {
    const server = mockMcpServer();
    expect(await parallelWebSearch.execute!(input, options)).toEqual({
      content: `Streaming\n${server.url}\nUI patches`,
      sources: [{ title: "Streaming", url: server.url }],
    });
    expect(server.methods).toEqual([
      "initialize",
      "notifications/initialized",
      "tools/list",
      "tools/list",
      "tools/call",
      "DELETE",
    ]);
  });

  describe.each<StallAt>(["initialize", "tools/list", "tools/call", "DELETE"])(
    "when %s stalls",
    (stage) => {
      it.each(["request cancellation", "search deadline"])(
        "aborts the transport and finishes on %s",
        async (reason) => {
          vi.useFakeTimers();
          const request = new AbortController();
          const deadline = new AbortController();
          vi.spyOn(AbortSignal, "timeout").mockImplementation((delay) => {
            setTimeout(() => deadline.abort(), delay);
            return deadline.signal;
          });
          const server = mockMcpServer(stage);
          let output: unknown;
          void Promise.resolve(
            parallelWebSearch.execute!(input, {
              ...options,
              abortSignal: request.signal,
            }),
          ).then((result) => {
            output = result;
          });

          const signal = await server.stalled;
          if (reason === "request cancellation") request.abort();
          else {
            await vi.advanceTimersByTimeAsync(29_999);
            expect(output).toBeUndefined();
            await vi.advanceTimersByTimeAsync(1);
          }
          await vi.advanceTimersByTimeAsync(0);

          expect(signal.aborted).toBe(true);
          if (stage === "DELETE") {
            expect(output).toMatchObject({ sources: [{ url: server.url }] });
          } else {
            expect(output).toEqual({
              error: expect.stringMatching(/^Search failed:/),
            });
          }
          expect(server.methods.at(-1)).toBe(
            stage === "initialize" ? "initialize" : "DELETE",
          );
        },
      );
    },
  );
});
