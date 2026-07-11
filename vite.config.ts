import { resolve } from 'node:path'

import { defineConfig } from 'vite'

export default defineConfig({
  base: './',

  build: {
    rolldownOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        make: resolve(import.meta.dirname, 'make.html'),
      },
    },
  },
})
