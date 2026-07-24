import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

export default defineConfig({
  plugins: [dts({ include: ['src'], insertTypesEntry: true })],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      formats: ['es'],
      fileName: 'index',
    },
    rollupOptions: {
      // The physics WASM backend is provided by the consumer, not bundled into the lib.
      external: [/^@dimforge\/rapier3d-compat/],
    },
    sourcemap: true,
  },
  test: {
    name: 'engine',
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
