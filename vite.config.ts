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
      // the installed agent skill (vendored, see skills-lock.json) and its local working folder
      ".agents/**",
      ".taste-skill/**",
    ],
  },
  lint: {
    ignorePatterns: [".agents/**", ".taste-skill/**"],
  },
});
