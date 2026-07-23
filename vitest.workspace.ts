import { defineWorkspace } from 'vitest/config';

// Each package's own vite.config.ts supplies its test configuration.
export default defineWorkspace(['packages/*']);
