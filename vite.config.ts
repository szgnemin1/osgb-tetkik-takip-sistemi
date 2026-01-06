import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', // Electron'da dosyaların doğru yüklenmesi için bu ayar zorunludur.
  server: {
    port: 5173,
    strictPort: true,
  }
})