import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
  plugins: [svelte()],
  resolve: process.env.VITEST ? { conditions: ['browser'] } : {},
  build: { outDir: 'dist', assetsDir: 'build', emptyOutDir: true, target: 'es2022' },
  server: { host: true, port: 5173, allowedHosts: ['sveltewar.local', 'localhost'] },
  test: { include: ['tests/**/*.test.js'], environment: 'node' },
});
