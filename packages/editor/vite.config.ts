import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Consume the engine's TypeScript source directly, so editing the engine
      // hot-reloads in the editor without a separate build step.
      '@webgine/engine': resolve(__dirname, '../engine/src/index.ts'),
    },
  },
  server: {
    port: 5173,
  },
});
