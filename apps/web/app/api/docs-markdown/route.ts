import { NextRequest, NextResponse } from "next/server";
import { loadDocsSource } from "@/lib/docs-source";

export async function GET(req: NextRequest) {
  const docPath = req.nextUrl.searchParams.get("path");
  if (!docPath)
    return NextResponse.json(
      { error: "Missing ?path= parameter" },
      { status: 400 },
    );
  const path = docPath.startsWith("/") ? docPath : `/${docPath}`;
  if (!/^\/docs(?:\/[a-zA-Z0-9_-]+)*\/?$/.test(path)) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }
  const page = await loadDocsSource(path);
  if (!page)
    return NextResponse.json({ error: "Page not found" }, { status: 404 });
  return new NextResponse(page.markdown, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
      Link: `<${page.canonicalUrl}>; rel="canonical"`,
    },
  });
}
