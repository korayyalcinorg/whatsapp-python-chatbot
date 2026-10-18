import { defineConfig } from 'vite';

// base: './' keeps asset paths relative so the build works on GitHub Pages
// sub-paths, a local file server, or a media player's browser alike.
export default defineConfig({
  base: './',
  build: {
    target: 'es2022',
    outDir: 'dist',
    chunkSizeWarningLimit: 800, // three.js alone is ~500 kB
  },
});
