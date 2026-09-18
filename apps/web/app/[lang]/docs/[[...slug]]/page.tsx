import { MobileDocsBar } from "@vercel/geistdocs/mobile-docs-bar";
import { createDocsPage } from "@vercel/geistdocs/pages/docs";
import { notFound } from "next/navigation";
import { GenerationModesDiagram } from "@/components/generation-modes-diagram";
import { PackageInstall } from "@/components/package-install";
import { isSafePathSegments } from "@/lib/docs-source";
import { config } from "@/lib/geistdocs/config";
import { geistdocsSource } from "@/lib/geistdocs/source";
import { pageMetadata } from "@/lib/page-metadata";

type PageProps = { params: Promise<{ lang: string; slug?: string[] }> };

async function validate(params: PageProps["params"]) {
  const resolved = await params;
  if (resolved.lang !== "en" || !isSafePathSegments(resolved.slug ?? []))
    notFound();
  try {
    if (!geistdocsSource.source.getPage(resolved.slug, resolved.lang))
      notFound();
  } catch (error) {
    if (error instanceof URIError) notFound();
    throw error;
  }
  return resolved;
}

const docsPage = createDocsPage({
  config,
  source: geistdocsSource,
  mdx: { GenerationModesDiagram, PackageInstall },
  renderTop: ({ data }) => <MobileDocsBar toc={data.toc} />,
});

export default async function Page({ params }: PageProps) {
  return <docsPage.Page params={Promise.resolve(await validate(params))} />;
}

export async function generateMetadata({ params }: PageProps) {
  const { slug = [] } = await validate(params);
  return pageMetadata(["docs", ...slug].join("/"));
}

export const generateStaticParams = docsPage.generateStaticParams;
