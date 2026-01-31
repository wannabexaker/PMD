import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'node:fs'
import path from 'node:path'

function resolveBackendPort() {
  const envPort = process.env.PMD_BACKEND_PORT
  if (envPort && envPort.trim().length > 0) {
    return envPort.trim()
  }
  const portFile = path.resolve(__dirname, '..', '..', '.runtime', 'backend-port.txt')
  if (fs.existsSync(portFile)) {
    const content = fs.readFileSync(portFile, 'utf-8').trim()
    if (content.length > 0) {
      return content
    }
  }
  return '8080'
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: `http://localhost:${resolveBackendPort()}`,
        changeOrigin: true,
      },
      '/actuator': {
        target: `http://localhost:${resolveBackendPort()}`,
        changeOrigin: true,
      },
    },
  },
})
