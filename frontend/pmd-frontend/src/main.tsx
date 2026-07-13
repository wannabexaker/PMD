import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import App from './App.tsx'
import { ToastProvider } from './shared/ui/toast/ToastProvider'
import { queryClient } from './lib/queryClient'
import './index.css'

if (typeof window !== 'undefined') {
  window.addEventListener('securitypolicyviolation', (event) => {
    console.warn('[SECURITY] CSP violation', {
      violatedDirective: event.violatedDirective,
      blockedURI: event.blockedURI,
    })
  })

  window.addEventListener('unhandledrejection', (event) => {
    console.error('[SECURITY] Unhandled rejection:', event.reason)
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <App />
        </ToastProvider>
      </QueryClientProvider>
    </BrowserRouter>
  </StrictMode>
)
