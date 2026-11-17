import { defineConfig } from "vite-plus";

export default defineConfig({
  fmt: {
    ignorePatterns: [
      "dist/**",
      ".astro/**",
      "e2e/**/*-snapshots/**",
      "pnpm-lock.yaml",
      // the design kit, copied in verbatim and overridden from src/styles/global.css
      "public/assets/system.{css,js}",
      "public/assets/{backgrounds,icons,layout,moments,motion,ui}/**",
      // local design-skill tooling, never committed
      ".agents/**",
      ".taste-skill/**",
    ],
  },
});
