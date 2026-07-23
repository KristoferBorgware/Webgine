import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

export default defineConfig({
  plugins: [dts({ include: ['src'], insertTypesEntry: true })],
  resolve: {
    alias: {
      '@webgine/engine': resolve(__dirname, '../engine/src/index.ts'),
    },
  },
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      formats: ['es'],
      fileName: 'index',
    },
    rollupOptions: {
      external: ['esbuild-wasm'],
    },
    sourcemap: true,
  },
  test: {
    name: 'scripting',
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
