import { createProxy } from "@vercel/geistdocs/proxy";
import { createI18nMiddleware } from "fumadocs-core/i18n/middleware";
import {
  NextResponse,
  type NextRequest,
  type NextFetchEvent,
} from "next/server";
import { config as geistdocsConfig } from "@/lib/geistdocs/config";
import { applyDocsResponseHeaders } from "@/lib/docs-response-headers";

const localeProxy = createI18nMiddleware({
  defaultLanguage: "en",
  languages: ["en"],
  hideLocale: "default-locale",
});
const geistdocsProxy = createProxy({
  config: geistdocsConfig,
  markdownRoutes: [{ from: "/docs/*path", to: "/api/docs-md/*path" }],
  before: async ({ request, context }) => {
    if (
      request.headers.get("rsc") === "1" ||
      request.headers.has("next-router-prefetch") ||
      request.headers.has("next-router-segment-prefetch") ||
      /\bprefetch\b/i.test(request.headers.get("purpose") ?? "") ||
      /\bprefetch\b/i.test(request.headers.get("sec-purpose") ?? "")
    ) {
      return (await localeProxy(request, context)) ?? NextResponse.next();
    }
  },
});

export default async function proxy(
  request: NextRequest,
  event: NextFetchEvent,
) {
  const { pathname } = request.nextUrl;
  try {
    decodeURIComponent(pathname);
  } catch (error) {
    if (!(error instanceof URIError)) throw error;
    return new NextResponse("Not Found", { status: 404 });
  }
  let response: Response;
  if (pathname === "/en/docs" || pathname.startsWith("/en/docs/")) {
    const destination = request.nextUrl.clone();
    destination.pathname = pathname.slice(3);
    response = NextResponse.redirect(destination, 308);
  } else if (
    (pathname === "/docs" || pathname.startsWith("/docs/")) &&
    !pathname.includes(".")
  ) {
    response = await geistdocsProxy(request, event);
  } else {
    return NextResponse.next();
  }
  applyDocsResponseHeaders(response.headers);
  return response;
}

export const config = {
  matcher: ["/docs/:path*", "/en/docs/:path*", "/(.*%.*)"],
};
