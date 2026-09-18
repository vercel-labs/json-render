import { docsPages } from "@/lib/docs-source";

export function GET() {
  return new Response(
    `# json-render documentation\n\n${docsPages.map((page) => `- [${page.title}](${page.href})`).join("\n")}\n`,
    {
      headers: { "Content-Type": "text/markdown; charset=utf-8" },
    },
  );
}
