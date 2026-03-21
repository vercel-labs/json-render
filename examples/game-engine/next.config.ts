import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@json-render/core",
    "@json-render/react",
    "@json-render/react-three-fiber",
    "three",
  ],
};

export default nextConfig;
