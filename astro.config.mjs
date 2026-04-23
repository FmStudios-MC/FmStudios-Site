import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://fabimvurice-interactive.de',
  base: '/',
  output: 'static',
  integrations: [sitemap()],
  compressHTML: true,
  prefetch: {
    prefetchAll: false,
    defaultStrategy: 'hover',
  },
  build: {
    inlineStylesheets: 'auto',
  },
  vite: {
    plugins: [tailwindcss()],
    build: {
      minify: true,
      sourcemap: false,
      cssMinify: 'lightningcss',
      modulePreload: { polyfill: false },
      rollupOptions: {
        output: {
          assetFileNames: 'assets/[hash][extname]',
          manualChunks(id) {
            if (id.includes('scripts/animations/')) {
              return 'animations';
            }
            if (id.includes('scripts/')) {
              return 'scripts';
            }
          },
        },
      },
    },
  },
});
