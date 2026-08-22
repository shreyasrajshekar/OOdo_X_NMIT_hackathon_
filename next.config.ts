import type { NextConfig } from "next";
import { dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  // A stray package-lock.json in the user's home directory otherwise makes
  // Next.js infer the workspace root one level too high.
  outputFileTracingRoot: __dirname,
};

export default nextConfig;
