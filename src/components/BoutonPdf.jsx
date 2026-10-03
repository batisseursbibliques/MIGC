import React, { useState } from 'react'

// Bouton « Exporter en PDF » : prend une fonction qui lance l'export
export default function BoutonPdf({ onExport, label = 'Exporter en PDF', petit = false, disabled = false }) {
  const [enCours, setEnCours] = useState(false)
  const [erreur, setErreur] = useState(false)
  async function lancer(e) {
    e.stopPropagation()
    setEnCours(true); setErreur(false)
    try { await onExport() } catch (err) { console.error(err); setErreur(true) }
    setEnCours(false)
  }
  return (
    <button type="button" onClick={lancer} disabled={enCours || disabled} className="bouton-pdf" style={petit ? { padding: '0.3rem 0.7rem', fontSize: '0.8rem' } : undefined}
      title="Télécharger ce document au format PDF">
      <span aria-hidden="true">📄</span> {enCours ? 'Préparation…' : erreur ? 'Échec, réessayer' : label}
    </button>
  )
}
