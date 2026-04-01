import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/',
  clearScreen: false,
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'esbuild',
    chunkSizeWarningLimit: 2000,
    reportCompressedSize: false,
    rollupOptions: {
      output: {
        entryFileNames: `assets/[name]-[hash].js`,
        chunkFileNames: `assets/[name]-[hash].js`,
        assetFileNames: `assets/[name]-[hash].[ext]`,
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('framer-motion')) return 'vendor-ui';
            if (id.includes('react')) return 'vendor-react';
            if (id.includes('jspdf') || id.includes('recharts')) return 'vendor-utils';
            return 'vendor-common';
          }
        },
      },
    },
  },
  server: {
    port: 5173,
    host: '0.0.0.0',
  },
});
// Build trigger: 2026-03-31T14:24-STRETCH-GO-VAPI-OPS
