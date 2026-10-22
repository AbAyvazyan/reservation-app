import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './shared/styles/tokens.css'
import './shared/styles/global.css'
import App from './App.tsx'
import { config } from './config'

async function bootstrap() {
  if (config.useMocks) {
    const { startMockServer } = await import('./mocks/browser')
    await startMockServer()
  }

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

void bootstrap()