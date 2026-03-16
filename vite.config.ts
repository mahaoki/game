/// <reference types="vitest" />
import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    open: true,
  },
  build: {
    target: 'ES2020',
  },
  test: {
    // Apenas arquivos dentro de src/tests/ são testes
    include: ['src/tests/**/*.test.ts'],
    // Exclui arquivos de spec (schemas Zod) do Vitest
    exclude: ['src/specs/**', 'node_modules/**'],
    // jsdom para que Phaser encontre `window`, `document`, etc.
    environment: 'jsdom',
  },
});
