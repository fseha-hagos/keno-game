import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@keno/game-math': path.resolve(__dirname, '../../packages/game-math/src/index.ts'),
      '@keno/shared-types': path.resolve(__dirname, '../../packages/shared-types/src/index.ts'),
      '@keno/config': path.resolve(__dirname, '../../packages/config/src/index.ts'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
