import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// Proxy giữ nguyên /api của request nên target phải là gốc của backend, bỏ /api ở cuối nếu có
function proxyTarget(raw: string | undefined) {
  const target = (raw ?? '')
    .trim()
    .replace(/\/+$/, '')
    .replace(/\/api$/i, '')
    .replace(/\/+$/, '')
  if (!target) return 'http://localhost:8080'
  return /^https?:\/\//i.test(target) ? target : `http://${target}`
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // API_PROXY_TARGET không có tiền tố VITE_ nên chỉ đọc được ở đây, không lọt vào bundle
  const env = loadEnv(mode, process.cwd(), '')
  const apiTarget = proxyTarget(env.API_PROXY_TARGET)

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      // Proxy để dev không dính CORS
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
        },
      },
    },
  }
})
