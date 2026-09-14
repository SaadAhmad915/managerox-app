import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /*
   * Next's dev server serves its client bundle and hot-reload socket only to
   * "localhost" by default. Open the app as 127.0.0.1, as the machine's LAN
   * address, or by hostname, and those requests are blocked: React never
   * hydrates, no effect ever runs, and the page sits on its loading state
   * forever with nothing in the browser console but a socket error. It looks
   * exactly like a hung server.
   *
   * Only exact hosts work here: CIDR ranges and wildcards such as
   * "192.168.*.*" are silently ignored, which is worse than useless because the
   * config then looks like it covers a case it does not. Both were tested.
   *
   * So: the two loopback spellings are listed, and anything else — a LAN
   * address for testing on a phone, a machine name — goes in DEV_ORIGIN in
   * .env.local, no code change needed.
   *
   * Development only; it has no effect on a build.
   */
  allowedDevOrigins: [
    "127.0.0.1",
    "0.0.0.0",
    ...(process.env.DEV_ORIGIN ? [process.env.DEV_ORIGIN] : []),
  ],

  /*
   * PGlite ships a WebAssembly build of Postgres. Bundling it would mangle the
   * .wasm and .data files it loads at runtime, so it is left as a plain require
   * on the server. It is never reached from the browser.
   */
  serverExternalPackages: ["@electric-sql/pglite"],

  /*
   * Migrations are read from disk at runtime, and Next only bundles files it
   * can see being imported. Without this the SQL is missing from the deployed
   * function and the first request fails on a database with no tables.
   */
  outputFileTracingIncludes: {
    "/**": ["./db/migrations/**"],
  },
};

export default nextConfig;
