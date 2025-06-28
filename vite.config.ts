import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    https: true, // Required for WebXR
    host: true,
    port: 3000,
  },
  build: {
    target: 'es2020',
    rollupOptions: {
      output: {
        manualChunks: {
          'three': ['three']
        }
      }
    }
  },
  optimizeDeps: {
    include: ['three']
  }
}); 