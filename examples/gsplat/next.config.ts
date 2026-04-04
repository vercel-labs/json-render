import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@json-render/core",
    "@json-render/react",
    "@json-render/gsplat",
  ],
};

export default nextConfig;
