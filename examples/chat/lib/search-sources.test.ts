import { describe, expect, it } from "vitest";
import { getSearchSources } from "./search-sources";

describe("web search source links", () => {
  it("keeps original URLs and plain titles, rejecting unsafe and duplicate links", () => {
    const url = "https://example.org/docs?part=1&ref=original#stream";
    expect(
      getSearchSources({
        sources: [
          { title: "<img src=x onerror=alert(1)>", url },
          { title: "Duplicate", url },
          { title: "Script", url: "javascript:alert(1)" },
          { title: "Data", url: "data:text/html,hello" },
          { title: "Relative", url: "/docs" },
          { title: "Credentials", url: "https://name:secret@example.org" },
          null,
          { url: 42 },
          { title: "", url: "http://example.net/page" },
        ],
      }),
    ).toEqual([
      { title: "<img src=x onerror=alert(1)>", url },
      { title: "example.net", url: "http://example.net/page" },
    ]);
  });

  it("rejects a URL that would navigate relative to the chat page", () => {
    expect(
      getSearchSources({ sources: [{ url: "https:example.org/docs" }] }),
    ).toEqual([]);
  });

  it("accepts default search output and malformed tool output without cards", () => {
    for (const output of [
      undefined,
      null,
      "text",
      { content: "answer" },
      { sources: {} },
    ]) {
      expect(getSearchSources(output)).toEqual([]);
    }
  });
});
