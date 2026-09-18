import process from "node:process";
import { createGeistdocs } from "@vercel/geistdocs/next";

/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["bash-tool", "just-bash", "@mongodb-js/zstd"],
  pageExtensions: ["js", "jsx", "ts", "tsx", "md", "mdx"],
  skipProxyUrlNormalize: true,
  outputFileTracingIncludes: { "/*": ["./content/docs/**/*.mdx"] },
  async headers() {
    return process.env.VERCEL_ENV && process.env.VERCEL_ENV !== "production"
      ? [
          {
            source: "/:path*",
            headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
          },
        ]
      : [];
  },
  async rewrites() {
    return {
      beforeFiles: [
        { source: "/docs.md", destination: "/api/docs-md" },
        { source: "/docs/index.md", destination: "/api/docs-md" },
        { source: "/docs/:path*.md", destination: "/api/docs-md/:path*" },
      ],
    };
  },
  async redirects() {
    return [
      {
        source: "/docs/components",
        destination: "/docs/registry",
        permanent: true,
      },
      {
        source: "/docs/actions",
        destination: "/docs/registry#action-handlers",
        permanent: true,
      },
    ];
  },
};

const withMDX = createGeistdocs();

/** @type {import('next').NextConfig} */
const config = withMDX(nextConfig);
export default config;
