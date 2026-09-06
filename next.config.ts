import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["better-sqlite3"],
  outputFileTracingIncludes: {
    "/api/private-materials": ["./app/private-assets/materiales/**/*"],
    "/*": ["./drizzle/*.sql"],
  },
};

export default nextConfig;
