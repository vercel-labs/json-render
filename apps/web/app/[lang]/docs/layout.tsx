import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { GeistdocsDocsLayout } from "@vercel/geistdocs/layout";
import { config } from "@/lib/geistdocs/config";
import { geistdocsSource } from "@/lib/geistdocs/source";

export default async function DocsLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (lang !== "en") notFound();
  return (
    <GeistdocsDocsLayout
      config={config}
      tree={geistdocsSource.source.getPageTree(lang)}
      containerProps={{ className: "mx-auto max-w-[1448px]" }}
    >
      {children}
    </GeistdocsDocsLayout>
  );
}
