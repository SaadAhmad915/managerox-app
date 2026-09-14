import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /*
   * PGlite ships a WebAssembly build of Postgres. Bundling it would mangle the
   * .wasm and .data files it loads at runtime, so it is left as a plain require
   * on the server. It is never reached from the browser.
   */
  serverExternalPackages: ["@electric-sql/pglite"],
};

export default nextConfig;
