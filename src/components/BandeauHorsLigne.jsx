import React, { useEffect, useState } from 'react'

// Prévient quand la connexion est perdue : consultation possible, ajouts envoyés au retour du réseau
export default function BandeauHorsLigne() {
  const [horsLigne, setHorsLigne] = useState(typeof navigator !== 'undefined' && navigator.onLine === false)
  useEffect(() => {
    const maj = () => setHorsLigne(navigator.onLine === false)
    window.addEventListener('online', maj)
    window.addEventListener('offline', maj)
    return () => { window.removeEventListener('online', maj); window.removeEventListener('offline', maj) }
  }, [])
  if (!horsLigne) return null
  return (
    <div role="status" style={{ background: '#FFF0D2', color: '#6B3D00', padding: '0.6rem 1rem', fontSize: '0.9rem', borderBottom: '1px solid #F3E3B8' }}>
      📴 Vous êtes hors ligne. Vous pouvez consulter ce qui a déjà été ouvert ; vos ajouts seront envoyés dès le retour de la connexion.
    </div>
  )
}
