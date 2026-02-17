import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.tsx'
import { ToastProvider } from './shared/ui/toast/ToastProvider'
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
      <ToastProvider>
        <App />
      </ToastProvider>
    </BrowserRouter>
  </StrictMode>
)
