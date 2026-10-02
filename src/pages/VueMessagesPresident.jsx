import React, { useEffect, useState } from 'react'
import { collection, onSnapshot, query, where, orderBy, getDocs } from 'firebase/firestore'
import { db } from '../lib/firebase.js'
import GestionMessages from './GestionMessages.jsx'

// ─────────────────────────────────────────────────────────────────────────────
// Vue accordéon pour le président : pays → pasteur → messages "Prêt"/"Prêché"
// ─────────────────────────────────────────────────────────────────────────────
export default function VueMessagesPresident() {
  const [pasteurs, setPasteurs] = useState([])
  const [ouverts, setOuverts] = useState({}) // { [pays]: bool, [uid]: bool }
  const [pasteurActif, setPasteurActif] = useState(null)

  useEffect(() => {
    // Charger tous les utilisateurs ayant un rôle pastoral
    const q = query(collection(db, 'utilisateurs'))
    return onSnapshot(q, (snap) => {
      const rolesPastoraux = ['national', 'pasteur']
      setPasteurs(
        snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((u) => rolesPastoraux.includes(u.role) && !u.bloque)
      )
    })
  }, [])

  // Regrouper par pays (undefined → "Non spécifié")
  const parPays = pasteurs.reduce((acc, p) => {
    const pays = p.pays || 'Non spécifié'
    if (!acc[pays]) acc[pays] = []
    acc[pays].push(p)
    return acc
  }, {})

  function toggle(cle) {
    setOuverts((prev) => ({ ...prev, [cle]: !prev[cle] }))
  }

  if (pasteurActif) {
    return (
      <div>
        <button className="bouton-lien" onClick={() => setPasteurActif(null)} style={{ marginBottom: '1rem' }}>
          ← Retour à la vue globale
        </button>
        <GestionMessages
          pasteurUid={pasteurActif.id}
          pasteurNom={pasteurActif.nom}
          lectureSeule={true}
        />
      </div>
    )
  }

  return (
    <div>
      <h2 className="titre-carte" style={{ marginBottom: '1.25rem' }}>Messages des pasteurs</h2>
      <p className="note" style={{ marginBottom: '1.25rem' }}>
        Seuls les messages marqués "Prêt" ou "Prêché" sont visibles ici.
      </p>

      {Object.keys(parPays).sort().map((pays) => (
        <div key={pays} style={{ marginBottom: '0.75rem' }}>
          {/* Accordéon pays */}
          <button
            onClick={() => toggle(pays)}
            style={{
              width: '100%', textAlign: 'left', background: 'var(--encre)',
              color: '#fff', border: 'none', borderRadius: '4px',
              padding: '0.75rem 1rem', cursor: 'pointer',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              fontFamily: 'Fraunces, serif', fontSize: '1rem',
            }}
          >
            <span>🌍 {pays}</span>
            <span>{ouverts[pays] ? '▲' : '▼'}</span>
          </button>

          {ouverts[pays] && (
            <div style={{ border: '1px solid var(--ligne)', borderTop: 'none', borderRadius: '0 0 4px 4px' }}>
              {parPays[pays].map((pasteur) => (
                <div key={pasteur.id}>
                  {/* Accordéon pasteur */}
                  <button
                    onClick={() => toggle(pasteur.id)}
                    style={{
                      width: '100%', textAlign: 'left', background: 'var(--papier)',
                      border: 'none', borderBottom: '1px solid var(--ligne)',
                      padding: '0.65rem 1.25rem', cursor: 'pointer',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      fontFamily: 'inherit', fontSize: '0.95rem', color: 'var(--encre)',
                    }}
                  >
                    <span>⛪ {pasteur.nom}</span>
                    <span style={{ fontSize: '0.8rem' }}>{ouverts[pasteur.id] ? '▲' : '▼'}</span>
                  </button>

                  {ouverts[pasteur.id] && (
                    <div style={{ padding: '1rem 1.25rem', background: '#fff' }}>
                      <MessagesPasteurResume
                        pasteurUid={pasteur.id}
                        pasteurNom={pasteur.nom}
                        onOuvrir={() => setPasteurActif(pasteur)}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}

      {Object.keys(parPays).length === 0 && (
        <p className="note">Aucun pasteur enregistré.</p>
      )}
    </div>
  )
}

// ── Résumé des messages d'un pasteur dans l'accordéon ───────────────────────
function MessagesPasteurResume({ pasteurUid, pasteurNom, onOuvrir }) {
  const [messages, setMessages] = useState([])

  useEffect(() => {
    const q = query(
      collection(db, 'utilisateurs', pasteurUid, 'messages'),
      where('statut', 'in', ['pret', 'preche']),
      orderBy('modifieLe', 'desc')
    )
    return onSnapshot(q, (snap) => setMessages(snap.docs.map((d) => ({ id: d.id, ...d.data() }))))
  }, [pasteurUid])

  if (messages.length === 0) {
    return <p className="note">Aucun message partagé pour le moment.</p>
  }

  return (
    <div>
      <ul className="liste" style={{ marginBottom: '0.75rem' }}>
        {messages.slice(0, 3).map((m) => (
          <li key={m.id} className="ligne-liste">
            <span>{m.titre || '(Sans titre)'}</span>
            <span className="etiquette" style={{ color: m.statut === 'pret' ? 'var(--sauge)' : 'var(--encre)' }}>
              {m.statut === 'pret' ? 'Prêt' : 'Prêché'}
            </span>
          </li>
        ))}
      </ul>
      <button className="bouton-lien" onClick={onOuvrir}>
        Voir tous les messages de {pasteurNom} →
      </button>
    </div>
  )
}
