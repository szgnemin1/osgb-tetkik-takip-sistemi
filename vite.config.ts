import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', // Electron için zorunlu
  server: {
    port: 5173,
    strictPort: true,
  },
  build: {
    // Electron (Chromium) için hedef belirleme. 
    // Bu, kodun modern tarayıcılarda doğal çalışmasını sağlar, performansı artırır.
    target: 'chrome100', 
    minify: 'esbuild', // Hızlı derleme için
    cssCodeSplit: true,
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        // Kütüphaneleri ayrı dosyalara bölerek önbellekleme performansını artırır
        manualChunks: {
          vendor: ['react', 'react-dom', 'lucide-react', 'xlsx', 'uuid']
        }
      }
    }
  }
})