import type { NextConfig } from "next";

/**
 * The CRM proxies the Laravel API rather than the browser calling it directly.
 *
 * Why: the session cookie is same-site only. Hosted on platform domains
 * (*.vercel.app and a separate API host) the two are different sites, so the
 * cookie would never be sent and every request would 401. Proxying means the
 * browser only ever talks to this origin — the cookie is first-party, and CORS
 * does not apply at all.
 *
 * API_ORIGIN is a server-side variable on purpose: the browser never learns the
 * API's real address, so it cannot be called directly and bypass this.
 */
const apiOrigin = (process.env.API_ORIGIN ?? "http://localhost:8000").replace(
  /\/$/,
  "",
);

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      { source: "/api/:path*", destination: `${apiOrigin}/api/:path*` },
      // Sanctum's CSRF cookie endpoint lives outside /api.
      { source: "/sanctum/:path*", destination: `${apiOrigin}/sanctum/:path*` },
    ];
  },
};

export default nextConfig;
