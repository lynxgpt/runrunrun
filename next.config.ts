import type { NextConfig } from "next";

// GitHub Pages deploys under /<repo-name>/ unless a custom domain is used.
// The workflow at .github/workflows/deploy.yml sets NEXT_PUBLIC_BASE_PATH
// so asset URLs (and the client-side fetch for /tracks/<id>.json) resolve
// correctly in both local dev (no prefix) and Pages (prefixed).
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true }, // next/image server isn't available on Pages
  basePath: basePath || undefined,
  assetPrefix: basePath || undefined,
  trailingSlash: true, // Pages serves dir/index.html better with trailing slashes
};

export default nextConfig;
