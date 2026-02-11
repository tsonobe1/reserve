import { defineConfig } from 'vite'

export default defineConfig({
  publicDir: false,
  esbuild: {
    jsxImportSource: 'hono/jsx/dom',
  },
  build: {
    // Reference: https://github.com/honojs/examples/blob/main/hono-vite-jsx/vite.config.ts
    outDir: 'public',
    emptyOutDir: false,
    sourcemap: false,
    rollupOptions: {
      input: 'src/web/csr/main.tsx',
      output: {
        entryFileNames: 'client.js',
      },
    },
  },
})
