import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { viteStaticCopy } from 'vite-plugin-static-copy'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const proxy = { '/api': { target: env.BACKEND_PROXY_TARGET || 'http://127.0.0.1:8000', changeOrigin: true, proxyTimeout: 300_000, timeout: 300_000 } }
  return {
  plugins: [react(), tailwindcss(), viteStaticCopy({
    targets: [
      { src: 'node_modules/pdfjs-dist/cmaps', dest: 'pdfjs', rename: { stripBase: 2 } },
      { src: 'node_modules/pdfjs-dist/standard_fonts', dest: 'pdfjs', rename: { stripBase: 2 } },
      { src: 'node_modules/pdfjs-dist/wasm', dest: 'pdfjs', rename: { stripBase: 2 } },
    ],
  })],
  server: { port: 5173, strictPort: true, proxy },
  preview: { proxy },
  }
})
