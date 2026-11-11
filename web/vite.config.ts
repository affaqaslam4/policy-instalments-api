/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // In development the API runs on :8080; proxying avoids CORS and matches the nginx setup in Docker.
    proxy: { '/graphql': process.env.API_URL ?? 'http://localhost:8080' },
  },
  build: {
    // AG Grid's core is ~900 kB (250 kB gzipped) on its own; it is lazy-loaded by the grid pages only.
    chunkSizeWarningLimit: 1000,
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    css: false,
  },
})
