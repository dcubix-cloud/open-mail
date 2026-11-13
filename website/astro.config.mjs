import { defineConfig } from "astro/config";
import cloudflare from '@astrojs/cloudflare';

export default defineConfig({
  server: { port: 4322 },
  // BASE_PATH serves the site under a path, e.g. BASE_PATH=/open-mail npm run build. Default: the root.
  base: process.env.BASE_PATH || "/",
  // The dev toolbar would float over the hero demo; the preview should look like the built site.
  devToolbar: { enabled: false },
  build: {
    // Hashed files under /assets; the CSP in public/_headers allows only same-origin files.
    assets: "assets",
    inlineStylesheets: "never",
  },
  vite: {
    build: { assetsInlineLimit: 0 },
  },
  // A static site: no sessions, and images are resized at build time, so the Worker needs no bindings.
  session: false,
  adapter: cloudflare({ imageService: "compile", imagesBindingName: false }),
});
