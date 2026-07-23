import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  root: 'client',        // index.html lives in client/
  build: {
    outDir: '../dist',   // output one level up so Express can serve dist/
    emptyOutDir: true,
  },
  server: {
    allowedHosts: true, // required for Replit's proxied preview domain
  },
});
