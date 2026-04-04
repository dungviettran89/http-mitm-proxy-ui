import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

// https://vite.dev/config/
export default defineConfig({
  root: resolve(__dirname, 'ui'),
  plugins: [vue()],
  build: {
    outDir: '../dist/public',
  },
})
