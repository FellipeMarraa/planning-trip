import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import 'leaflet/dist/leaflet.css'
import { setupLeafletDefaultIcons } from './lib/leafletIcons'
import App from './App.tsx'

setupLeafletDefaultIcons()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
