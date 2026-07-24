import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages serves a project site from a repository subpath
// (https://<owner>.github.io/<repo>/), so a CI build must prefix asset URLs with that
// subpath. The repo name comes from the CI environment; local dev and preview serve from
// the root.
const repo = process.env.GITHUB_REPOSITORY?.split('/')[1];
const base = process.env.GITHUB_ACTIONS && repo ? `/${repo}/` : '/';

export default defineConfig({
  base,
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
