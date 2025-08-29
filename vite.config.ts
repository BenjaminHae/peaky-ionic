/// <reference types="vitest" />

import legacy from '@vitejs/plugin-legacy'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
//import prebundleWorkers from "vite-plugin-prebundle-workers";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    legacy()/*,
    prebundleWorkers({
      include: "src/workers/peaky.ts"
    })*/
  ],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.ts',
  },
  worker: {
    format: 'es'
  }
})
