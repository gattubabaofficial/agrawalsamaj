import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    // Vitest's default "threads" pool hangs indefinitely on this Windows
    // setup — the run starts, prints its banner, and never collects. "forks"
    // runs the same tests to completion. Do not remove without checking that
    // `npm test` still terminates on Windows.
    pool: "forks",
  },
  resolve: {
    // Mirrors the "@/*" -> "src/*" alias in tsconfig.json.
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
