import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

// Served from a custom domain (see public/CNAME: immaculate.eu.cc) at the
// site root, so asset paths must be absolute. Do not change this back to a
// relative base — with path-based routing (/p/slug, /library, ...) a
// relative base resolves assets against the wrong directory depth.
export default defineConfig({
  base: '/',
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
