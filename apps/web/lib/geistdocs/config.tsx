import { defineConfig } from "@vercel/geistdocs/config";
import { siteUrl } from "@/lib/site";

export const config = defineConfig({
  title: "json-render",
  siteUrl,
  defaultLanguage: "en",
  logo: <span className="font-medium">json-render</span>,
  navbarActiveProduct: "json-render",
  navbarBrand: "labs",
  github: {
    owner: "vercel-labs",
    repo: "json-render",
    branch: "main",
    editPath: "apps/web/content/docs",
  },
  content: [
    { id: "docs", label: "Documentation", dir: "content/docs", route: "/docs" },
  ],
  nav: [
    { label: "Docs", href: "/docs" },
    { label: "Playground", href: "/playground" },
    { label: "Examples", href: "/examples" },
  ],
  ai: { enabled: false },
  feedback: { enabled: false },
  language: { enabled: false },
  pageActions: { askAI: false, openInChat: false },
  webmcp: { enabled: true },
});
