/// <reference types="vitest/config" />
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

/** Strip the GitHub Pages fallback from the production HTML so a true Pages deploy does not double-load. */
function stripPagesFallback(): Plugin {
  return {
    name: 'strip-pages-fallback',
    transformIndexHtml(html, ctx) {
      if (ctx.server) return html;
      return html.replace(/<!--pages-fallback-->[\s\S]*?<!--\/pages-fallback-->\s*/g, '');
    },
  };
}

export default defineConfig({
  // Relative URLs work on https://<user>.github.io/Danos/ and on local preview.
  base: './',
  plugins: [react(), stripPagesFallback()],
  build: {
    rollupOptions: {
      output: {
        entryFileNames: 'assets/danos.js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: (asset) => (asset.name?.endsWith('.css') ? 'assets/danos.css' : 'assets/[name][extname]'),
      },
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
