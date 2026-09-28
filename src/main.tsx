import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { registerSW } from 'virtual:pwa-register'
import App from './App'
import { BRAND } from './config/brand'
import { requestPersistentStorage } from './lib/db'
import { SettingsProvider } from './lib/settings'
import './index.css'

// Push brand colors from src/config/brand.ts into CSS so Tailwind's `accent` follows them.
const root = document.documentElement
root.style.setProperty('--brand-accent', BRAND.colors.accent)
root.style.setProperty('--brand-accent-dark', BRAND.colors.accentDark)
document.title = `${BRAND.name} · Remodel Consult`

registerSW({ immediate: true })
void requestPersistentStorage()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <SettingsProvider>
        <App />
      </SettingsProvider>
    </BrowserRouter>
  </StrictMode>,
)
