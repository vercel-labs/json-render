import { loadDocsSource, isSafePathSegments } from "@/lib/docs-source";
import { applyDocsResponseHeaders } from "@/lib/docs-response-headers";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug?: string[] }> },
) {
  const { slug = [] } = await params;
  const path = `/docs${slug.length ? `/${slug.join("/")}` : ""}`;
  const page = isSafePathSegments(slug) ? await loadDocsSource(path) : null;
  const headers = new Headers({
    "Content-Type": "text/markdown; charset=utf-8",
  });
  applyDocsResponseHeaders(headers);
  if (page) headers.set("Link", `<${page.canonicalUrl}>; rel="canonical"`);
  return new Response(
    page?.markdown ??
      "# Page Not Found\n\nSee [the documentation index](/llms.txt).\n",
    { status: page ? 200 : 404, headers },
  );
}
