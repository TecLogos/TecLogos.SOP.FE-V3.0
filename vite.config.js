import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const backendUrl = env.VITE_API_URL || 'https://localhost:7173'

  return {
    plugins: [react()],
    server: {
      port: 5173,   // MUST match backend CORS AllowedOrigins (localhost:5173)
      proxy: {
        '/api': {
          target: backendUrl,
          changeOrigin: true,
          secure: false,   // allow self-signed dev certs
        }
      }
    }
  }
})
