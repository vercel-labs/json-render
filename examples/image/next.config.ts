import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@resvg/resvg-js", "satori"],
  outputFileTracingIncludes: {
    "/api/image": [
      "./node_modules/geist/dist/fonts/geist-sans/Geist-Regular.ttf",
    ],
  },
};

export default nextConfig;
