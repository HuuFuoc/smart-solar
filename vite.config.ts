import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

/*
 * Proxy giữ nguyên /api của request rồi nối vào sau target, nên target phải là gốc của backend:
 * 'http://localhost:8080/api/' → 'http://localhost:8080' (không thì thành /api/api/…), 'localhost:8081' → 'http://localhost:8081'.
 */
function proxyTarget(raw: string | undefined) {
  const target = (raw ?? '').trim().replace(/\/+$/, '').replace(/\/api$/i, '').replace(/\/+$/, '')
  if (!target) return 'http://localhost:8080'
  return /^https?:\/\//i.test(target) ? target : `http://${target}`
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // API_PROXY_TARGET không có tiền tố VITE_ nên chỉ đọc được ở đây, không lọt vào bundle.
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
      // Backend .NET chạy ở cổng 8080; proxy để dev không dính CORS.
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
        },
      },
    },
  }
})
