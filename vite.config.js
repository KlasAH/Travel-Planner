import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    allowedHosts: [
      'app.tp.klas.ahlnet.nu',
      'localhost',
      '127.0.0.1'
    ]
  }
})