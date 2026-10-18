import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

// base: './' keeps asset paths relative so the build works on GitHub Pages
// sub-paths, a local file server, or the LED PC's browser alike.
export default defineConfig({
  base: './',
  build: {
    target: 'es2022',
    outDir: 'dist',
    chunkSizeWarningLimit: 900, // three.js alone is ~500 kB
    rollupOptions: {
      input: {
        output: resolve(__dirname, 'index.html'),
        control: resolve(__dirname, 'control.html'),
      },
    },
  },
  test: {
    include: ['tests/**/*.test.ts'],
  },
});
