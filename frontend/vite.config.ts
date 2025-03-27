import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url';

dotenv.config({
  path: path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '../.env'
  ),
});

if (!process.env.FRONTEND_PORT) {
  throw new Error('FRONTEND_PORT is not set')
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  server: {
    port: parseInt(process.env.FRONTEND_PORT),
    strictPort: true,
  },
})
