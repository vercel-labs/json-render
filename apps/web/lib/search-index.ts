import { readFile } from "fs/promises";
import { join } from "path";
import { docsNavigation } from "./docs-navigation";
import { mdxToCleanMarkdown } from "./mdx-to-markdown";

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

function mdxFileForSlug(slug: string): string {
  const docsRoot = join(process.cwd(), "app", "(main)", "docs");
  if (slug === "/docs") {
    return join(docsRoot, "page.mdx");
  }
  const rest = slug.replace(/^\/docs\/?/, "");
  return join(docsRoot, ...rest.split("/"), "page.mdx");
}

export async function getSearchIndex(): Promise<IndexEntry[]> {
  if (cached) return cached;

  const entries: IndexEntry[] = [];

  for (const section of docsNavigation) {
    for (const item of section.items) {
      if (item.external) continue;
      try {
        const raw = await readFile(mdxFileForSlug(item.href), "utf-8");
        const md = mdxToCleanMarkdown(raw);
        const content = stripMarkdown(md);
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
