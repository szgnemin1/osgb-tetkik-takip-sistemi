/*
 * Project: OSGB Tetkik Takip Sistemi
 * Copyright (C) 2026 szgn_emin
 * 
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License.
 */
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/tetkik/',
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