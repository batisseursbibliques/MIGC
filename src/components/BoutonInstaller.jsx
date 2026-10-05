import React, { useEffect, useState } from 'react'

// Affiche « Installer l'application » quand le navigateur propose l'installation
export default function BoutonInstaller({ className = 'tiroir-lien' }) {
  const [dispo, setDispo] = useState(!!window.__pwaPrompt)
  useEffect(() => {
    const maj = () => setDispo(!!window.__pwaPrompt)
    window.addEventListener('pwa-dispo', maj)
    return () => window.removeEventListener('pwa-dispo', maj)
  }, [])
  if (!dispo) return null
  async function installer() {
    const p = window.__pwaPrompt
    if (!p) return
    p.prompt()
    await p.userChoice.catch(() => {})
    window.__pwaPrompt = null
    setDispo(false)
  }
  return (
    <button type="button" className={className} onClick={installer}>
      <span className="tiroir-lien-icone">📲</span>Installer l'application
    </button>
  )
}
