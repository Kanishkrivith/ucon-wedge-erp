import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  reactStrictMode: true,
  serverExternalPackages: ["tesseract.js", "pdfjs-dist", "@napi-rs/canvas", "unpdf"],
};

export default nextConfig;
