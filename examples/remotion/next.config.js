/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@json-render/core", "@json-render/remotion"],
  turbopack: {
    resolveAlias: {
      // Deduplicate remotion — pnpm creates separate copies when peer
      // dependency versions (React) differ between workspace packages.
      // Force all imports to resolve from the app's node_modules.
      remotion: "./node_modules/remotion",
    },
  },
};

export default nextConfig;
