/// <reference types="vitest" />

import { defineConfig } from 'vite'
import Vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'url'

export default defineConfig({
  plugins: [Vue()],
  test: {
    globals: true,
    environment: 'jsdom',
    coverage: {
      provider: 'istanbul',
      reporter: ['text', 'json', 'html'],
    },
    include: ['__tests__/**/*.{test,spec}.{js,ts}'],
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  }
})