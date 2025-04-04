import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  base: '/mrpack-to-zip/',
  server: {
    port: 3000
  }
}) 