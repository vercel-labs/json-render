import type { MetadataRoute } from "next";
import { PAGE_TITLES } from "@/lib/page-titles";
import { siteUrl } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  return Object.keys(PAGE_TITLES).map((slug) => ({
    url: `${siteUrl}/${slug}`,
  }));
}
