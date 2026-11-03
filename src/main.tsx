import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { waitForApi } from './api/client'
import { App } from './App.tsx'
import './index.css'

// MSW is the whole backend of this demo, so it also runs in production.
async function startMockApi() {
  const { worker } = await import('./mocks/browser')
  await worker.start({
    onUnhandledFrame: 'bypass',
    quiet: import.meta.env.PROD,
  })
}

waitForApi(startMockApi())

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
