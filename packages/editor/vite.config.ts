import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Consume the workspace packages' TypeScript source directly, so editing them
      // hot-reloads in the editor without a separate build step. Both aliases point at
      // the same engine source, so the app bundles a single engine instance.
      '@webgine/engine': resolve(__dirname, '../engine/src/index.ts'),
      '@webgine/scripting': resolve(__dirname, '../scripting/src/index.ts'),
    },
  },
  server: {
    port: 5173,
  },
});
