import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Hand-maintained inventory workbooks (multi-sheet, formatted) can
      // exceed the 1MB default action body limit.
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
