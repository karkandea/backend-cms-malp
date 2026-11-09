import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  esbuild: {
    jsx: "automatic",
  },
  test: {
    globals: true,
    environment: "node",
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
