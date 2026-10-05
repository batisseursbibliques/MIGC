import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import App from './App.jsx'
import SitePublic from './public/SitePublic.jsx'
import FiletErreur from './components/FiletErreur.jsx'
import './styles.css'

// Installation de l'application : on garde l'invite du navigateur pour le bouton « Installer »
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault()
  window.__pwaPrompt = e
  window.dispatchEvent(new Event('pwa-dispo'))
})
window.addEventListener('appinstalled', () => { window.__pwaPrompt = null; window.dispatchEvent(new Event('pwa-dispo')) })
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}))
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/espace/*" element={<FiletErreur><App /></FiletErreur>} />
        <Route path="*" element={<SitePublic />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
)
