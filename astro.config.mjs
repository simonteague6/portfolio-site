import { defineConfig } from "astro/config";
import svelte from "@astrojs/svelte";

export default defineConfig({
  site: "https://simonteague6.github.io",
  base: "/portfolio-site",
  integrations: [svelte()],
});
