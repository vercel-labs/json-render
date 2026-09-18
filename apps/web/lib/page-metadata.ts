import type { Metadata } from "next";
import { PAGE_TITLES } from "./page-titles";
import { isPreview, siteUrl } from "./site";

const DESCRIPTION =
  "The Generative UI framework. Generate dashboards, widgets, and apps from prompts — safely constrained to components you define.";

export function pageMetadata(slug: string): Metadata {
  const title = PAGE_TITLES[slug];
  if (!title) return {};

  const displayTitle = title.replace(/\n/g, " ");
  const fullTitle = `${displayTitle} | json-render`;
  const ogImageUrl = slug ? `/og/${slug}` : "/og";

  return {
    title: displayTitle,
    description: DESCRIPTION,
    robots: { index: !isPreview, follow: !isPreview },
    alternates: {
      canonical: `/${slug}`,
      ...(slug === "docs" || slug.startsWith("docs/")
        ? { types: { "text/markdown": `/${slug}.md` } }
        : {}),
    },
    openGraph: {
      url: `${siteUrl}/${slug}`,
      type: "website",
      locale: "en_US",
      siteName: "json-render",
      title: fullTitle,
      description: DESCRIPTION,
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: `${displayTitle} - json-render`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description: DESCRIPTION,
      images: [ogImageUrl],
    },
  };
}
