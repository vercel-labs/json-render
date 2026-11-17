export type SearchSource = { title: string; url: string };

/** Validate untrusted tool output before using it as a link in the chat. */
export function getSearchSources(output: unknown): SearchSource[] {
  if (!output || typeof output !== "object" || !("sources" in output))
    return [];
  if (!Array.isArray(output.sources)) return [];

  const seen = new Set<string>();
  return output.sources.flatMap((source: unknown) => {
    if (!source || typeof source !== "object") return [];
    if (!("url" in source) || typeof source.url !== "string") return [];
    try {
      const url = new URL(source.url);
      if (
        !["http:", "https:"].includes(url.protocol) ||
        url.username ||
        url.password ||
        seen.has(url.href)
      )
        return [];
      seen.add(url.href);
      return [
        {
          url: source.url,
          title:
            "title" in source &&
            typeof source.title === "string" &&
            source.title.trim()
              ? source.title
              : url.hostname,
        },
      ];
    } catch {
      return [];
    }
  });
}
