import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import OutputViewer from './components/OutputViewer.tsx'

const isOutputPage = window.location.pathname === '/output';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isOutputPage ? <OutputViewer /> : <App />}
  </StrictMode>,
)
