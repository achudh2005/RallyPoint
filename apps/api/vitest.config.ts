import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
  },
  resolve: {
    alias: {
      '@rallypoint/engine': path.resolve(__dirname, '../../packages/engine/src/index.ts'),
    },
  },
});
