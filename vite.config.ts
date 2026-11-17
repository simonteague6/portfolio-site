import { defineConfig } from "vite-plus";

export default defineConfig({
  fmt: {
    ignorePatterns: ["dist/**", ".astro/**", "e2e/**/*-snapshots/**", "pnpm-lock.yaml"],
  },
});
