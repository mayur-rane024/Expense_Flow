import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 1000,
  },
  server: {
    port: 5173,
    proxy: {
      '/auth': 'http://localhost:5000',
      '/expenses': 'http://localhost:5000',
      '/approvals': 'http://localhost:5000',
      '/workflows': 'http://localhost:5000',
      '/admin': 'http://localhost:5000',
      '/api': 'http://localhost:5000',
    }
  }
})
