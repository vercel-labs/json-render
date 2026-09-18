import { docsNavigation } from "./docs-navigation";
import { loadDocsSource } from "./docs-source";

export type IndexEntry = {
  title: string;
  href: string;
  section: string;
  content: string;
};

let cached: IndexEntry[] | null = null;

function stripMarkdown(md: string): string {
  return (
    md
      // Remove fenced code blocks entirely
      .replace(/```[\s\S]*?```/g, "")
      // Remove inline code
      .replace(/`[^`]+`/g, "")
      // Remove markdown links, keep text
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      // Remove heading markers
      .replace(/^#{1,6}\s+/gm, "")
      // Remove bold/italic markers
      .replace(/\*{1,3}([^*]+)\*{1,3}/g, "$1")
      // Remove HTML tags
      .replace(/<[^>]+>/g, "")
      // Collapse whitespace
      .replace(/\n{3,}/g, "\n\n")
      .trim()
  );
}

export async function getSearchIndex(): Promise<IndexEntry[]> {
  if (cached) return cached;

  const entries: IndexEntry[] = [];

  for (const section of docsNavigation) {
    for (const item of section.items) {
      if (item.external) continue;
      try {
        const source = await loadDocsSource(item.href);
        const content = stripMarkdown(source?.markdown ?? "");
        entries.push({
          title: item.title,
          href: item.href,
          section: section.title,
          content,
        });
      } catch {
        entries.push({
          title: item.title,
          href: item.href,
          section: section.title,
          content: "",
        });
      }
    }
  }

  cached = entries;
  return entries;
}
