import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'node:fs'
import path from 'node:path'
import type { IncomingMessage, ServerResponse } from 'node:http'

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

const MALICIOUS_PATTERNS = [
  /#set\s*\(/i,
  /<xsl:/i,
  /xmlns:xsl/i,
  /java\.lang\.Runtime/i,
  /class\.module\.classLoader/i,
  /\.\.\//,
  /%2e%2e%2f/i,
  /\.htaccess/i,
  /\.env/i,
]

function containsMaliciousPattern(value: string): boolean {
  if (!value) return false
  let decoded = value
  try {
    decoded = decodeURIComponent(value)
  } catch {
    decoded = value
  }
  return MALICIOUS_PATTERNS.some((pattern) => pattern.test(decoded))
}

function getRequestPath(req: IncomingMessage): string {
  return req.url ?? ''
}

function blockIfMalicious(req: IncomingMessage, res: ServerResponse): boolean {
  const target = getRequestPath(req)
  if (!containsMaliciousPattern(target)) {
    return false
  }
  res.statusCode = 403
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify({ error: 'Forbidden', message: 'Malicious request pattern detected' }))
  return true
}

function resolveAllowedOrigins(): string[] {
  const configured = process.env.VITE_ALLOWED_ORIGINS
  if (!configured || configured.trim().length === 0) {
    return ['http://localhost:5173']
  }
  return configured.split(',').map((origin) => origin.trim()).filter((origin) => origin.length > 0)
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    strictPort: true,
    cors: {
      origin: resolveAllowedOrigins(),
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    },
    proxy: {
      '/api': {
        target: `http://localhost:${resolveBackendPort()}`,
        changeOrigin: true,
        configure(proxy) {
          proxy.on('proxyReq', (proxyReq, req, res) => {
            if (blockIfMalicious(req, res)) {
              proxyReq.destroy()
              return
            }
            if (req.socket?.remoteAddress) {
              proxyReq.setHeader('X-Forwarded-For', req.socket.remoteAddress)
              proxyReq.setHeader('X-Real-IP', req.socket.remoteAddress)
            }
          })
        },
      },
      '/actuator': {
        target: `http://localhost:${resolveBackendPort()}`,
        changeOrigin: true,
        configure(proxy) {
          proxy.on('proxyReq', (proxyReq, req, res) => {
            if (blockIfMalicious(req, res)) {
              proxyReq.destroy()
              return
            }
            if (req.socket?.remoteAddress) {
              proxyReq.setHeader('X-Forwarded-For', req.socket.remoteAddress)
              proxyReq.setHeader('X-Real-IP', req.socket.remoteAddress)
            }
          })
        },
      },
      '/uploads': {
        target: `http://localhost:${resolveBackendPort()}`,
        changeOrigin: true,
        configure(proxy) {
          proxy.on('proxyReq', (proxyReq, req, res) => {
            if (blockIfMalicious(req, res)) {
              proxyReq.destroy()
              return
            }
            if (req.socket?.remoteAddress) {
              proxyReq.setHeader('X-Forwarded-For', req.socket.remoteAddress)
              proxyReq.setHeader('X-Real-IP', req.socket.remoteAddress)
            }
          })
        },
      },
    },
  },
})
