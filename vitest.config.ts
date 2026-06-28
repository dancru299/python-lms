import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
  resolve: {
    alias: {
      // Khớp với alias "@/*" -> "./src/*" trong tsconfig.json
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
