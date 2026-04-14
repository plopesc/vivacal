import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
  cacheOnNavigation: true,
});

const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
  basePath,
  assetPrefix: basePath || undefined,
  trailingSlash: true,
};

export default withSerwist(nextConfig);
