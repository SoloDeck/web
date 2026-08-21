import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HelmetProvider } from 'react-helmet-async'
import './index.css'
import App from './App.tsx'
import { Providers } from './provider.tsx';
import { initGoogleAnalytics } from '@/analytics/ga'

// Không có VITE_GA_MEASUREMENT_ID thì đây là lệnh rỗng — dev và CI chạy y như cũ.
initGoogleAnalytics()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HelmetProvider>
      <Providers>
        <App />
      </Providers>
    </HelmetProvider>
  </StrictMode>,
)
