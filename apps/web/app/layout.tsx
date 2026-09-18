import type { Metadata } from "next";
import localFont from "next/font/local";
import { GeistPixelSquare } from "geist/font/pixel";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { DocsProvider } from "@/components/geistdocs-provider";
import { Navbar } from "@vercel/geistdocs/navbar";
import { Footer } from "@vercel/geistdocs/footer";
import { config } from "@/lib/geistdocs/config";
import { DocsChat } from "@/components/docs-chat";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { PAGE_TITLES } from "@/lib/page-titles";
import { cookies } from "next/headers";
import { isPreview, siteUrl, siteDescription } from "@/lib/site";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  alternates: { canonical: "/" },
  title: {
    default: `json-render | ${PAGE_TITLES[""]}`,
    template: "%s | json-render",
  },
  description:
    "The Generative UI framework. Generate dashboards, widgets, and apps from prompts — safely constrained to components you define.",
  keywords: [
    "json-render",
    "generative UI",
    "AI UI generation",
    "user-generated interfaces",
    "React components",
    "React Native",
    "guardrails",
    "structured output",
    "dashboard builder",
  ],
  authors: [{ name: "Vercel Labs" }],
  creator: "Vercel Labs",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://json-render.dev",
    siteName: "json-render",
    title: "json-render | The Generative UI Framework",
    description:
      "The Generative UI framework. Generate dashboards, widgets, and apps from prompts — safely constrained to components you define.",
    images: [
      {
        url: "/og",
        width: 1200,
        height: 630,
        alt: "json-render - The Generative UI Framework",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "json-render | The Generative UI Framework",
    description:
      "The Generative UI framework. Generate dashboards, widgets, and apps from prompts — safely constrained to components you define.",
    images: ["/og"],
  },
  robots: {
    index: !isPreview,
    follow: !isPreview,
  },
  icons: {
    icon: "/favicon.ico",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const chatOpen = cookieStore.get("docs-chat-open")?.value === "true";
  const chatWidth = Math.min(
    700,
    Math.max(300, Number(cookieStore.get("docs-chat-width")?.value) || 400),
  );

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              name: "json-render",
              url: siteUrl,
              description: siteDescription,
            }),
          }}
        />
        {chatOpen && (
          <style
            dangerouslySetInnerHTML={{
              __html: `@media(min-width:640px){body{padding-right:min(${chatWidth}px, calc(100vw - 320px))}}`,
            }}
          />
        )}
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${GeistPixelSquare.variable}`}
      >
        <ThemeProvider>
          <DocsProvider>
            <Navbar config={config} />
            {children}
            <Footer />
          </DocsProvider>
          <DocsChat defaultOpen={chatOpen} defaultWidth={chatWidth} />
        </ThemeProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
