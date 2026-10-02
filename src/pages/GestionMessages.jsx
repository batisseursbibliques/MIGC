import React, { useEffect, useState, useRef } from 'react'
import {
  collection, addDoc, onSnapshot, orderBy, query, doc,
  updateDoc, serverTimestamp, deleteDoc,
} from 'firebase/firestore'
import { db } from '../lib/firebase.js'

// ─────────────────────────────────────────────────────────────────────────────
// Utilitaire : détecte les références bibliques dans un texte et les rend
// cliquables. Format reconnu : Jean 3:16 / Ps 23:1-3 / Matthieu 5:3,6
// ─────────────────────────────────────────────────────────────────────────────
const REGEX_VERSET = /\b([1-3]?\s?[A-ZÉÀa-zé]{2,}[a-zéèàù]*\.?\s+\d+\s*:\s*\d+(?:[–\-,]\d+)?)/g

function TexteAvecVersets({ texte, onVersetClick }) {
  if (!texte) return null
  const parties = []
  let dernier = 0
  let match
  const re = new RegExp(REGEX_VERSET.source, 'g')
  while ((match = re.exec(texte)) !== null) {
    if (match.index > dernier) parties.push({ type: 'texte', val: texte.slice(dernier, match.index) })
    parties.push({ type: 'verset', val: match[0] })
    dernier = match.index + match[0].length
  }
  if (dernier < texte.length) parties.push({ type: 'texte', val: texte.slice(dernier) })

  return (
    <>
      {parties.map((p, i) =>
        p.type === 'verset' ? (
          <button
            key={i}
            onClick={() => onVersetClick(p.val.trim())}
            style={{
              background: '#EAF3FF', border: '1px solid var(--ligne)',
              borderRadius: '3px', padding: '0 4px', cursor: 'pointer',
              color: 'var(--encre)', fontFamily: 'inherit', fontSize: 'inherit',
              fontWeight: 600, textDecoration: 'underline dotted',
            }}
            title="Cliquer pour lire ce verset"
          >
            {p.val}
          </button>
        ) : (
          <span key={i} style={{ whiteSpace: 'pre-wrap' }}>{p.val}</span>
        )
      )}
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Fenêtre popup verset — appelle bible-api.com (gratuit, Louis Segond + autres)
// ─────────────────────────────────────────────────────────────────────────────
const VERSIONS = [
  { code: 'louis_segond', label: 'Louis Segond (1910)' },
  { code: 'darby', label: 'Darby (FR)' },
  { code: 'martin', label: 'Martin (1744)' },
  { code: 'kjv', label: 'King James (EN)' },
  { code: 'web', label: 'World English Bible' },
]

// Normalise la référence pour l'API : "Jean 3:16" → "Jean+3:16"
function normaliserRef(ref) {
  return ref.replace(/\s+/g, '+')
}

function PopupVerset({ reference, onFermer }) {
  const [version, setVersion] = useState('louis_segond')
  const [texte, setTexte] = useState('')
  const [chargement, setChargement] = useState(false)
  const [erreur, setErreur] = useState(false)

  useEffect(() => {
    setChargement(true)
    setErreur(false)
    setTexte('')
    const ref = normaliserRef(reference)
    fetch(`https://bible-api.com/${ref}?translation=${version}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) { setErreur(true); setChargement(false); return }
        setTexte(data.text?.trim() ?? '')
        setChargement(false)
      })
      .catch(() => { setErreur(true); setChargement(false) })
  }, [reference, version])

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000, padding: '1rem',
      }}
      onClick={onFermer}
    >
      <div
        style={{
          background: '#fff', borderRadius: '6px', padding: '1.5rem',
          maxWidth: '480px', width: '100%', maxHeight: '80vh', overflowY: 'auto',
          boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
          <h3 style={{ margin: 0, color: 'var(--encre)', fontFamily: 'Fraunces, serif' }}>{reference}</h3>
          <button onClick={onFermer} style={{ background: 'none', border: 'none', fontSize: '1.3rem', cursor: 'pointer', color: 'var(--texte-doux)' }}>✕</button>
        </div>

        <select value={version} onChange={(e) => setVersion(e.target.value)} className="champ-saisie" style={{ marginBottom: '1rem' }}>
          {VERSIONS.map((v) => <option key={v.code} value={v.code}>{v.label}</option>)}
        </select>

        {chargement && <p className="note">Chargement…</p>}
        {erreur && (
          <p className="alerte">
            Référence non trouvée dans cette version. Essayez un autre format
            (ex. "Jean 3:16" plutôt que "Jn 3:16") ou une autre version.
          </p>
        )}
        {texte && (
          <p style={{ fontSize: '1.05rem', lineHeight: 1.7, fontStyle: 'italic', color: 'var(--texte)' }}>
            « {texte} »
          </p>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Composant principal GestionMessages
// lectureSeule = true pour le président et les superviseurs
// ─────────────────────────────────────────────────────────────────────────────
export default function GestionMessages({ pasteurUid, pasteurNom, lectureSeule = false }) {
  const [messages, setMessages] = useState([])
  const [messageActif, setMessageActif] = useState(null)
  const [vue, setVue] = useState('liste') // 'liste' | 'detail' | 'creer' | 'editer'
  const [versetPopup, setVersetPopup] = useState(null)

  const filtre = lectureSeule
    ? query(collection(db, 'utilisateurs', pasteurUid, 'messages'),
        orderBy('modifieLe', 'desc'))
    : query(collection(db, 'utilisateurs', pasteurUid, 'messages'),
        orderBy('modifieLe', 'desc'))

  useEffect(() => {
    return onSnapshot(filtre, (snap) => {
      let msgs = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
      // En lecture seule (président), ne voir que les messages "prêt" ou "preche"
      if (lectureSeule) msgs = msgs.filter((m) => m.statut === 'pret' || m.statut === 'preche')
      setMessages(msgs)
    })
  }, [pasteurUid])

  const STATUTS = {
    brouillon: { label: 'Brouillon', couleur: '#888' },
    pret: { label: 'Prêt', couleur: 'var(--sauge)' },
    preche: { label: 'Prêché', couleur: 'var(--encre)' },
  }

  if (vue === 'creer' && !lectureSeule) {
    return (
      <>
        <FormulaireMessage
          pasteurUid={pasteurUid}
          message={null}
          onRetour={() => setVue('liste')}
        />
        {versetPopup && <PopupVerset reference={versetPopup} onFermer={() => setVersetPopup(null)} />}
      </>
    )
  }

  if (vue === 'editer' && messageActif && !lectureSeule) {
    return (
      <>
        <FormulaireMessage
          pasteurUid={pasteurUid}
          message={messageActif}
          onRetour={() => { setVue('detail') }}
        />
        {versetPopup && <PopupVerset reference={versetPopup} onFermer={() => setVersetPopup(null)} />}
      </>
    )
  }

  if (vue === 'detail' && messageActif) {
    const msg = messages.find((m) => m.id === messageActif.id) ?? messageActif
    return (
      <>
        <DetailMessage
          message={msg}
          pasteurUid={pasteurUid}
          lectureSeule={lectureSeule}
          onRetour={() => { setVue('liste'); setMessageActif(null) }}
          onEditer={() => setVue('editer')}
          onVersetClick={setVersetPopup}
          STATUTS={STATUTS}
        />
        {versetPopup && <PopupVerset reference={versetPopup} onFermer={() => setVersetPopup(null)} />}
      </>
    )
  }

  // ── Liste des messages ───────────────────────────────────────────────────
  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <h2 className="titre-carte" style={{ margin: 0 }}>
          {lectureSeule ? `Messages de ${pasteurNom}` : 'Mes messages'}
        </h2>
        {!lectureSeule && (
          <button className="bouton-principal" onClick={() => setVue('creer')}>+ Nouveau message</button>
        )}
      </div>

      {messages.length === 0 && (
        <p className="note">{lectureSeule ? 'Aucun message partagé pour le moment.' : 'Aucun message enregistré.'}</p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {messages.map((m) => {
          const s = STATUTS[m.statut] ?? STATUTS.brouillon
          return (
            <div
              key={m.id}
              className="carte"
              style={{ cursor: 'pointer' }}
              onClick={() => { setMessageActif(m); setVue('detail') }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--encre)' }}>{m.titre || '(Sans titre)'}</h3>
                <span className="etiquette" style={{ color: s.couleur, borderColor: s.couleur, flexShrink: 0 }}>{s.label}</span>
              </div>
              {m.theme && <p className="note" style={{ margin: '0.25rem 0 0' }}>Thème : {m.theme}</p>}
              {m.versetPrincipal && (
                <p className="note" style={{ margin: '0.2rem 0 0', fontStyle: 'italic' }}>📖 {m.versetPrincipal}</p>
              )}
            </div>
          )
        })}
      </div>
      {versetPopup && <PopupVerset reference={versetPopup} onFermer={() => setVersetPopup(null)} />}
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Détail d'un message
// ─────────────────────────────────────────────────────────────────────────────
function DetailMessage({ message: m, pasteurUid, lectureSeule, onRetour, onEditer, onVersetClick, STATUTS }) {
  async function changerStatut(statut) {
    await updateDoc(doc(db, 'utilisateurs', pasteurUid, 'messages', m.id), {
      statut, modifieLe: serverTimestamp(),
    })
  }

  async function supprimer() {
    if (!window.confirm('Supprimer ce message définitivement ?')) return
    await deleteDoc(doc(db, 'utilisateurs', pasteurUid, 'messages', m.id))
    onRetour()
  }

  const s = STATUTS[m.statut] ?? STATUTS.brouillon

  return (
    <div>
      <button className="bouton-lien" onClick={onRetour} style={{ marginBottom: '1rem' }}>← Retour aux messages</button>
      <section className="carte">
        {/* En-tête */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
          <h2 className="titre-carte" style={{ marginBottom: 0 }}>{m.titre || '(Sans titre)'}</h2>
          <span className="etiquette" style={{ color: s.couleur, borderColor: s.couleur }}>{s.label}</span>
        </div>

        {m.theme && <p style={{ color: 'var(--texte-doux)', margin: '0 0 0.5rem' }}>Thème : <strong>{m.theme}</strong></p>}
        {m.versetPrincipal && (
          <p style={{ margin: '0 0 1rem', fontStyle: 'italic', color: 'var(--encre-claire)' }}>
            📖 <TexteAvecVersets texte={m.versetPrincipal} onVersetClick={onVersetClick} />
          </p>
        )}

        {/* Grands points */}
        {m.points && (
          <div style={{ marginBottom: '1rem' }}>
            <h3 className="titre-section" style={{ marginTop: 0 }}>Grands points</h3>
            <div style={{ background: 'var(--papier)', borderRadius: '4px', padding: '0.75rem 1rem' }}>
              <TexteAvecVersets texte={m.points} onVersetClick={onVersetClick} />
            </div>
          </div>
        )}

        {/* Notes et explications */}
        {m.notes && (
          <div style={{ marginBottom: '1rem' }}>
            <h3 className="titre-section" style={{ marginTop: 0 }}>Notes et explications</h3>
            <div style={{ background: 'var(--papier)', borderRadius: '4px', padding: '0.75rem 1rem', lineHeight: 1.7 }}>
              <TexteAvecVersets texte={m.notes} onVersetClick={onVersetClick} />
            </div>
          </div>
        )}

        {/* Versets d'appui */}
        {m.versets && (
          <div style={{ marginBottom: '1rem' }}>
            <h3 className="titre-section" style={{ marginTop: 0 }}>Versets d'appui</h3>
            <div style={{ background: 'var(--papier)', borderRadius: '4px', padding: '0.75rem 1rem' }}>
              <TexteAvecVersets texte={m.versets} onVersetClick={onVersetClick} />
            </div>
          </div>
        )}

        {/* Conclusion */}
        {m.conclusion && (
          <div style={{ marginBottom: '1rem' }}>
            <h3 className="titre-section" style={{ marginTop: 0 }}>Conclusion / Application</h3>
            <div style={{ background: 'var(--papier)', borderRadius: '4px', padding: '0.75rem 1rem', lineHeight: 1.7 }}>
              <TexteAvecVersets texte={m.conclusion} onVersetClick={onVersetClick} />
            </div>
          </div>
        )}

        {/* Actions */}
        {!lectureSeule && (
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '1.5rem', borderTop: '1px solid var(--ligne)', paddingTop: '1rem' }}>
            <button className="bouton-principal" onClick={onEditer}>Modifier</button>
            {m.statut === 'brouillon' && (
              <button className="bouton-secondaire" onClick={() => changerStatut('pret')}>
                ✓ Marquer comme Prêt
              </button>
            )}
            {m.statut === 'pret' && (
              <>
                <button className="bouton-secondaire" onClick={() => changerStatut('preche')}>
                  ✓ Marquer comme Prêché
                </button>
                <button className="bouton-lien" onClick={() => changerStatut('brouillon')}>
                  Repasser en brouillon
                </button>
              </>
            )}
            {m.statut === 'preche' && (
              <button className="bouton-lien" onClick={() => changerStatut('pret')}>
                Repasser en Prêt
              </button>
            )}
            <button className="bouton-lien" style={{ color: 'var(--erreur)', marginLeft: 'auto' }} onClick={supprimer}>
              Supprimer
            </button>
          </div>
        )}
      </section>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Formulaire création / édition
// ─────────────────────────────────────────────────────────────────────────────
function FormulaireMessage({ pasteurUid, message, onRetour }) {
  const [titre, setTitre] = useState(message?.titre ?? '')
  const [theme, setTheme] = useState(message?.theme ?? '')
  const [versetPrincipal, setVersetPrincipal] = useState(message?.versetPrincipal ?? '')
  const [points, setPoints] = useState(message?.points ?? '')
  const [notes, setNotes] = useState(message?.notes ?? '')
  const [versets, setVersets] = useState(message?.versets ?? '')
  const [conclusion, setConclusion] = useState(message?.conclusion ?? '')
  const [statut, setStatut] = useState(message?.statut ?? 'brouillon')
  const [enCours, setEnCours] = useState(false)

  async function enregistrer(e) {
    e.preventDefault()
    setEnCours(true)
    const donnees = {
      titre, theme, versetPrincipal, points, notes, versets, conclusion, statut,
      modifieLe: serverTimestamp(),
    }
    if (message) {
      await updateDoc(doc(db, 'utilisateurs', pasteurUid, 'messages', message.id), donnees)
    } else {
      donnees.creeLe = serverTimestamp()
      await addDoc(collection(db, 'utilisateurs', pasteurUid, 'messages'), donnees)
    }
    setEnCours(false)
    onRetour()
  }

  return (
    <div>
      <button className="bouton-lien" onClick={onRetour} style={{ marginBottom: '1rem' }}>← Retour</button>
      <section className="carte">
        <h2 className="titre-carte">{message ? 'Modifier le message' : 'Nouveau message'}</h2>
        <form onSubmit={enregistrer} className="formulaire">
          <label className="champ-label">Titre du message *</label>
          <input type="text" value={titre} onChange={(e) => setTitre(e.target.value)} className="champ-saisie" required />

          <label className="champ-label">Thème</label>
          <input type="text" value={theme} onChange={(e) => setTheme(e.target.value)} className="champ-saisie" placeholder="Ex : La foi qui déplace les montagnes" />

          <label className="champ-label">Verset principal</label>
          <input
            type="text" value={versetPrincipal}
            onChange={(e) => setVersetPrincipal(e.target.value)}
            className="champ-saisie"
            placeholder="Ex : Jean 3:16 — les versets seront cliquables dans l'aperçu"
          />

          <label className="champ-label">Grands points</label>
          <textarea
            value={points} onChange={(e) => setPoints(e.target.value)}
            className="champ-saisie champ-texte" rows={5}
            placeholder={"I. La grâce de Dieu (Romains 5:8)\nII. La foi comme réponse (Hébreux 11:1)\nIII. La transformation par l'Esprit (2 Corinthiens 3:18)"}
          />

          <label className="champ-label">Notes et explications</label>
          <textarea
            value={notes} onChange={(e) => setNotes(e.target.value)}
            className="champ-saisie champ-texte" rows={6}
            placeholder="Développement de chaque point, illustrations, contexte biblique…"
          />

          <label className="champ-label">Versets d'appui</label>
          <textarea
            value={versets} onChange={(e) => setVersets(e.target.value)}
            className="champ-saisie champ-texte" rows={4}
            placeholder={"Psaumes 23:1\nJean 14:6\nPhilippiens 4:13"}
          />

          <label className="champ-label">Conclusion / Application pratique</label>
          <textarea
            value={conclusion} onChange={(e) => setConclusion(e.target.value)}
            className="champ-saisie champ-texte" rows={4}
            placeholder="Comment ce message doit-il transformer la vie du fidèle cette semaine ?"
          />

          <label className="champ-label">Statut</label>
          <select value={statut} onChange={(e) => setStatut(e.target.value)} className="champ-saisie">
            <option value="brouillon">Brouillon (privé)</option>
            <option value="pret">Prêt (visible par le président)</option>
            <option value="preche">Prêché</option>
          </select>

          <button type="submit" className="bouton-principal" disabled={enCours}>
            {enCours ? 'Enregistrement…' : (message ? 'Enregistrer les modifications' : 'Créer le message')}
          </button>
        </form>
      </section>
    </div>
  )
}
