import { loadAllDocsSources } from "@/lib/docs-source";
import { siteDescription, siteUrl } from "@/lib/site";

export async function GET() {
  const pages = await loadAllDocsSources();
  const body = `# json-render\n\n${siteDescription}\n\n## Documentation\n\n${pages.map((page) => `- [${page.title}](${siteUrl}${page.markdownUrl})`).join("\n")}\n`;
  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
