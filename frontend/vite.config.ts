import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url';
import tailwind from 'tailwindcss'
import autoprefixer from 'autoprefixer'


dotenv.config({
  path: path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '../.env'
  ),
});

if (!process.env.FRONTEND_PORT) {
  throw new Error('FRONTEND_PORT is not set')
}

// https://vitejs.dev/config/

export default defineConfig({
  css: {
    postcss: {
      plugins: [tailwind(), autoprefixer()],
    },
  },
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: parseInt(process.env.FRONTEND_PORT),
    strictPort: true,
  },
})
