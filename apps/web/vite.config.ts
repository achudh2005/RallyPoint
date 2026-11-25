import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  define: {
    'process.env': {},
  },
  resolve: {
    alias: {
      '@rallypoint/engine': path.resolve(__dirname, '../../packages/engine/src/index.ts'),
      '@rallypoint/ranking': path.resolve(__dirname, '../../packages/ranking/src/index.ts'),
      '@rallypoint/scoring-rules': path.resolve(__dirname, '../../packages/scoring-rules/src/index.ts'),
      '@rallypoint/ui': path.resolve(__dirname, '../../packages/ui/src/index.ts'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('recharts') || id.includes('d3-') || id.includes('victory')) {
              return 'charts';
            }
            if (id.includes('html-to-image') || id.includes('canvas-confetti')) {
              return 'export';
            }
            if (id.includes('framer-motion')) {
              return 'motion';
            }
            if (id.includes('lucide-react')) {
              return 'icons';
            }
            if (id.includes('@capacitor') || id.includes('dexie')) {
              return 'mobile-storage';
            }
            return 'vendor';
          }
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
  server: {
    port: 3000,
    host: true,
  },
});
