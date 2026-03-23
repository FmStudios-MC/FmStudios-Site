import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://fabimvurice-interactive.de',
  base: '/',
  output: 'static',
  integrations: [sitemap()],
  compressHTML: true,
  vite: {
    plugins: [tailwindcss()],
    build: {
      cssMinify: 'lightningcss',
      modulePreload: { polyfill: false },
      rollupOptions: {
        output: {
          assetFileNames: 'assets/[hash][extname]',
          manualChunks(id) {
            if (id.includes('scripts/animations/')) {
              return 'animations';
            }
          },
        },
      },
    },
  },
});
