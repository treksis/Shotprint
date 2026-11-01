import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src/client'),
    },
  },
  server: {
    port: 5180,
    // Agents write templates, lab runs and workspaces all the time; none of it is client code.
    watch: { ignored: ['**/sandbox/**', '**/lab/**', '**/.data/**'] },
    proxy: {
      '/api': {
        target: 'http://localhost:8788',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
  },
});
