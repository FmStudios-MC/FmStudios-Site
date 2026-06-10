import { defineConfig } from "astro/config";

// https://astro.build/config
export default defineConfig({
  // Custom domain served at the root, so no `base` is needed.
  site: "https://www.fabimvurice-interactive.de",
  trailingSlash: "ignore",
  build: {
    inlineStylesheets: "auto",
  },
});
