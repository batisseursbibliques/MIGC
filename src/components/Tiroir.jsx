import React, { useEffect } from 'react'

export default function Tiroir({ ouvert, onFermer, sections, pageActive, onNaviguer, nom, role, onDeconnexion, onChangerMdp }) {
  useEffect(() => {
    if (!ouvert) return
    const handler = (e) => { if (e.key === 'Escape') onFermer() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [ouvert, onFermer])

  if (!ouvert) return null

  function naviguer(page) {
    onNaviguer(page)
    onFermer()
  }

  return (
    <>
      <div className="tiroir-fond" onClick={onFermer} />
      <nav className="tiroir" role="dialog" aria-modal="true">
        <div className="tiroir-entete">
          <span style={{ fontFamily: 'Fraunces, serif', fontSize: '1rem', fontWeight: 600 }}>MIGC</span>
          <button className="btn-fermer-tiroir" onClick={onFermer} aria-label="Fermer">✕</button>
        </div>
        <div className="tiroir-profil">
          <strong>{nom}</strong>
          <p>{role}</p>
        </div>
        <div style={{ flex: 1 }}>
          {sections.map((section, si) => (
            <div key={si}>
              {section.label && <p className="tiroir-section-label">{section.label}</p>}
              {section.liens.map((lien, li) => (
                <button
                  key={li}
                  className={`tiroir-lien${pageActive === lien.page ? ' actif' : ''}`}
                  onClick={() => naviguer(lien.page)}
                >
                  <span className="tiroir-lien-icone">{lien.icone}</span>
                  {lien.texte}
                </button>
              ))}
              {si < sections.length - 1 && <div className="tiroir-separateur" />}
            </div>
          ))}
        </div>
        {onDeconnexion && (
          <div style={{ padding: '1rem 1.25rem', borderTop: '1px solid rgba(255,255,255,0.25)' }}>
            {onChangerMdp && (
              <button className="tiroir-lien" onClick={() => { onFermer(); onChangerMdp() }}>
                <span className="tiroir-lien-icone">🔑</span>Changer mon mot de passe
              </button>
            )}
            <button className="tiroir-lien" onClick={onDeconnexion}>
              <span className="tiroir-lien-icone">🚪</span>Se déconnecter
            </button>
          </div>
        )}
      </nav>
    </>
  )
}
