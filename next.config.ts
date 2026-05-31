import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep Prisma's query engine out of the server bundle so it resolves correctly
  // at runtime on Vercel's serverless functions.
  serverExternalPackages: ["@prisma/client", "prisma"],
};

export default nextConfig;
