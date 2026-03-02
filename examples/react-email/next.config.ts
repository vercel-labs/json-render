import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "@react-email/components",
    "@react-email/render",
    "@json-render/react-email",
  ],
};

export default nextConfig;
