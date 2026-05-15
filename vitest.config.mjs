import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["test/**/*.test.{js,mjs}"],
  },
  resolve: {
    alias: {
      "server-only": new URL("./test/empty.js", import.meta.url).pathname,
      "@": new URL(".", import.meta.url).pathname,
    },
  },
});
