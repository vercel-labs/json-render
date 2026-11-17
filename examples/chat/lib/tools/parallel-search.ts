import { createMCPClient, type MCPClient } from "@ai-sdk/mcp";
import { tool } from "ai";
import { z } from "zod";
import { getSearchSources } from "../search-sources";

const SEARCH_TIMEOUT_MS = 30_000;
const searchResultsSchema = z.object({
  results: z.array(
    z.object({
      url: z.string(),
      title: z.string().nullish(),
      excerpts: z.array(z.string()).default([]),
    }),
  ),
});

export const parallelWebSearch = tool({
  description:
    "Search public web pages for current information not covered by the specialized tools. Returns source URLs and excerpts to use in a cited answer.",
  inputSchema: z.object({
    query: z
      .string()
      .describe("The goal of the search, including relevant context"),
    searchQueries: z
      .array(z.string())
      .min(1)
      .max(3)
      .describe(
        "Keyword queries of 3–6 words each. Use bare domains with site:, not URL paths or quoted phrases.",
      ),
  }),
  execute: async ({ query, searchQueries }, options) => {
    const signal = AbortSignal.any([
      AbortSignal.timeout(SEARCH_TIMEOUT_MS),
      ...(options.abortSignal ? [options.abortSignal] : []),
    ]);
    let client: MCPClient | undefined;
    try {
      client = await createMCPClient({
        clientName: "json-render-chat",
        transport: {
          type: "http",
          url: "https://mcp.parallel.ai/mcp",
          headers: { "User-Agent": "json-render-chat" },
          // Bound initialization, discovery, and HTTP response bodies together.
          fetch: (url, init) =>
            fetch(url, {
              ...init,
              signal: AbortSignal.any([
                signal,
                ...(init?.signal ? [init.signal] : []),
              ]),
            }),
        },
        initializationOptions: { signal, timeout: SEARCH_TIMEOUT_MS },
      });
      const tools = await client.tools();
      const search = tools.web_search;
      if (!search) throw new Error("Parallel web_search is unavailable");
      const result = await search.execute(
        {
          objective: query,
          search_queries: searchQueries,
        },
        { ...options, abortSignal: signal },
      );
      const response = z
        .object({
          isError: z.boolean().optional(),
          content: z.array(
            z.object({ type: z.string(), text: z.string().optional() }),
          ),
        })
        .parse(result);
      if (response.isError)
        throw new Error("Parallel web_search returned an error");

      // Unified MCP returns the Search API response in a JSON text block.
      const text = response.content.find((part) => part.type === "text");
      if (!text?.text) throw new Error("Missing search results");
      const { results } = searchResultsSchema.parse(JSON.parse(text.text));
      const sources = getSearchSources({ sources: results });
      const content = sources
        .map((source) => {
          const result = results.find((item) => item.url === source.url)!;
          return `${source.title}\n${source.url}\n${result.excerpts.join("\n")}`;
        })
        .join("\n\n");
      return { content, sources };
    } catch (error) {
      return {
        error: `Search failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    } finally {
      // A cleanup failure must not replace a search result or its original error.
      await client?.close().catch(() => {});
    }
  },
});
