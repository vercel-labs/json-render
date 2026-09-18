import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { parse } from "yaml";
import { allDocsPages } from "./docs-navigation";
import { mdxToCleanMarkdown } from "./mdx-to-markdown";
import { siteUrl } from "./site";

export const docsPages = allDocsPages.filter(
  (page) => page.href === "/docs" || page.href.startsWith("/docs/"),
);
const inventory = new Map(docsPages.map((page) => [page.href, page]));
const pending = new Map<string, Promise<DocsSource>>();

export type DocsSource = {
  href: string;
  title: string;
  markdown: string;
  markdownUrl: string;
  canonicalUrl: string;
};

export function isSafePathSegments(segments: readonly string[]) {
  return segments.every(
    (part) =>
      part.length > 0 &&
      part !== "." &&
      part !== ".." &&
      !part.includes("/") &&
      !part.includes("\\"),
  );
}

export function loadDocsSource(pathname: string): Promise<DocsSource> | null {
  const href = pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
  if (!inventory.has(href)) return null;
  let result = pending.get(href);
  if (!result) {
    const slug = href === "/docs" ? "index" : href.slice("/docs/".length);
    result = readFile(
      join(process.cwd(), "content", "docs", `${slug}.mdx`),
      "utf8",
    ).then((raw) => {
      const frontmatter = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
      if (!frontmatter) throw new Error(`Missing frontmatter for ${href}`);
      const metadata = parse(frontmatter[1] ?? "") as {
        title?: unknown;
      } | null;
      if (typeof metadata?.title !== "string")
        throw new Error(`Missing title for ${href}`);
      const title = metadata.title;
      return {
        href,
        title,
        markdown: mdxToCleanMarkdown(
          `# ${title}\n${raw.slice(frontmatter[0].length)}`,
        ),
        markdownUrl: `${href}.md`,
        canonicalUrl: `${siteUrl}${href}`,
      };
    });
    pending.set(href, result);
    result.catch(() => pending.delete(href));
  }
  return result;
}

export async function loadAllDocsSources() {
  return Promise.all(docsPages.map((page) => loadDocsSource(page.href)!));
}
