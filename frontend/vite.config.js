import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  base: '/biwengerstats/',   // mismo nombre que el repo
  plugins: [react(), tailwindcss()],
})
