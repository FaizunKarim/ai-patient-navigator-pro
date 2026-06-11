import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Membuka jalur agar backend dan frontend bisa saling ngobrol tanpa diblokir
    proxy: {
      '/api': {
        target: 'http://localhost:5000', // Alamat server backend Tim B
        changeOrigin: true,
        secure: false,
      }
    }
  }
})