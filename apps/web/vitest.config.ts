import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: {
    include: ["src/**/*.spec.{ts,tsx}"],
    environment: "node",
    restoreMocks: true,
    unstubGlobals: true,
    coverage: {
      provider: "v8",
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/**/*.spec.{ts,tsx}", "src/test/**"],
      reporter: ["text", "json-summary", "html", "lcov"],
    },
  },
});
