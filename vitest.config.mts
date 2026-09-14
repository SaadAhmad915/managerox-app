import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      // `server-only` throws when imported outside a server component. Under
      // test everything runs on the server anyway, so it resolves to the same
      // no-op module Next resolves it to.
      "server-only": path.resolve(import.meta.dirname, "node_modules/server-only/empty.js"),
      "@": import.meta.dirname,
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
