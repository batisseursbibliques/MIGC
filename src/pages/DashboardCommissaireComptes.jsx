import React, { useEffect, useState } from 'react'
import {
  collection, addDoc, onSnapshot, orderBy, query,
  collectionGroup, serverTimestamp,
} from 'firebase/firestore'
import { db } from '../lib/firebase.js'

const TYPES_MOUVEMENT = [
  { valeur: 'dime', label: 'Dîme' },
  { valeur: 'collecte', label: 'Collecte' },
  { valeur: 'don', label: 'Don' },
  { valeur: 'depense', label: 'Dépense' },
]

export default function DashboardCommissaireComptes({ profil , page = 'controle'}) {
  const onglet = page

  return (
    <div>
      <h1 className="titre-page">Commissariat aux Comptes — MIGC</h1>
      <p className="note" style={{ marginBottom: '1.25rem' }}>
        Mandat : vérification annuelle de la gestion du BEN. Rapport à déposer
        la première semaine de la nouvelle année et publié à tous les niveaux (Art. RI.37-38).
      </p>
      {onglet === 'controle' && <ControleFinancier />}
      {onglet === 'rapport' && <RapportAnnuel uid={profil.uid} />}
      {onglet === 'observations' && <ObservationsCommissaire uid={profil.uid} />}
    </div>
  )
}

// Vue consolidée lecture seule de toutes les finances
function ControleFinancier() {
  const [mouvements, setMouvements] = useState([])
  const [virements, setVirements] = useState([])
  const [branches, setBranches] = useState([])
  const [annee, setAnnee] = useState(new Date().getFullYear())

  useEffect(() => onSnapshot(collection(db, 'branches'), (snap) => (
    setBranches(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
  )), [])

  useEffect(() => onSnapshot(collectionGroup(db, 'caisse'), (snap) => (
    setMouvements(snap.docs.map((d) => ({ id: d.id, brancheId: d.ref.parent.parent.id, ...d.data() })))
  )), [])

  useEffect(() => onSnapshot(collectionGroup(db, 'virements'), (snap) => (
    setVirements(snap.docs.map((d) => ({ id: d.id, brancheId: d.ref.parent.parent.id, ...d.data() })))
  )), [])

  // Filtrer par année
  const mvtAnnee = mouvements.filter((m) => {
    if (!m.date) return false
    const d = m.date.toDate ? m.date.toDate() : new Date(m.date)
    return d.getFullYear() === annee
  })

  const totalParType = Object.fromEntries(
    TYPES_MOUVEMENT.map(({ valeur }) => [valeur, mvtAnnee.filter((m) => m.type === valeur).reduce((s, m) => s + m.montant, 0)])
  )
  const totalReversements = virements.filter((v) => {
    if (!v.date) return false
    const d = v.date.toDate ? v.date.toDate() : new Date(v.date)
    return d.getFullYear() === annee && v.statut === 'valide'
  }).reduce((s, v) => s + v.montant, 0)

  const annees = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i)

  return (
    <div>
      <div style={{ marginBottom: '1rem' }}>
        <select value={annee} onChange={(e) => setAnnee(Number(e.target.value))} className="champ-saisie" style={{ maxWidth: '180px' }}>
          {annees.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>
      <div className="grille-deux">
        <section className="carte">
          <h2 className="titre-carte">Revenus consolidés {annee}</h2>
          <ul className="liste">
            {TYPES_MOUVEMENT.map(({ valeur, label }) => (
              <li key={valeur} className="ligne-liste">
                <span>{label}</span>
                <span className={valeur === 'depense' ? 'montant-negatif' : 'montant-positif'}>
                  {totalParType[valeur].toLocaleString('fr-FR')} FCFA
                </span>
              </li>
            ))}
          </ul>
          <div style={{ borderTop: '2px solid var(--encre)', marginTop: '1rem', paddingTop: '0.75rem' }}>
            <div className="ligne-liste">
              <strong>Reversements validés au BEN</strong>
              <strong className="montant-positif">{totalReversements.toLocaleString('fr-FR')} FCFA</strong>
            </div>
          </div>
        </section>
        <section className="carte">
          <h2 className="titre-carte">Par église locale</h2>
          <ul className="liste">
            {branches.map((b) => {
              const mvts = mvtAnnee.filter((m) => m.brancheId === b.id)
              const solde = mvts.reduce((acc, m) => m.type === 'depense' ? acc - m.montant : acc + m.montant, 0)
              const revenus = mvts.filter((m) => m.type !== 'depense').reduce((s, m) => s + m.montant, 0)
              const reversement25 = Math.round(revenus * 0.25)
              const reversementsEffectues = virements.filter((v) => {
                if (!v.date) return false
                const d = v.date.toDate ? v.date.toDate() : new Date(v.date)
                return v.brancheId === b.id && d.getFullYear() === annee && v.statut === 'valide'
              }).reduce((s, v) => s + v.montant, 0)
              const ecart = reversementsEffectues - reversement25

              return (
                <li key={b.id} className="ligne-liste-verticale">
                  <strong>{b.nom}</strong>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                    <span>Revenus : <strong>{revenus.toLocaleString('fr-FR')} FCFA</strong></span>
                    <span>25 % dû : <strong>{reversement25.toLocaleString('fr-FR')} FCFA</strong></span>
                  </div>
                  <p className={ecart >= 0 ? 'note' : 'alerte'} style={{ margin: '0.2rem 0 0', fontSize: '0.85rem' }}>
                    Reversé : {reversementsEffectues.toLocaleString('fr-FR')} FCFA
                    {ecart < 0 && ` — Écart : ${Math.abs(ecart).toLocaleString('fr-FR')} FCFA manquant`}
                    {ecart >= 0 && ' ✓'}
                  </p>
                </li>
              )
            })}
            {branches.length === 0 && <p className="note">Aucune église locale enregistrée.</p>}
          </ul>
        </section>
      </div>
    </div>
  )
}

function RapportAnnuel({ uid }) {
  const [rapports, setRapports] = useState([])
  const [annee, setAnnee] = useState(new Date().getFullYear())
  const [contenu, setContenu] = useState('')
  const [conclusion, setConclusion] = useState('')
  const [avis, setAvis] = useState('favorable')

  useEffect(() => {
    const q = query(collection(db, 'rapportsCommissariat'), orderBy('annee', 'desc'))
    return onSnapshot(q, (snap) => setRapports(snap.docs.map((d) => ({ id: d.id, ...d.data() }))))
  }, [])

  async function deposer(e) {
    e.preventDefault()
    await addDoc(collection(db, 'rapportsCommissariat'), {
      annee, contenu, conclusion, avis,
      commissaireUid: uid, deposeL: serverTimestamp(),
    })
    setContenu(''); setConclusion('')
  }

  return (
    <div className="grille-deux">
      <section className="carte">
        <h2 className="titre-carte">Déposer le rapport annuel</h2>
        <form onSubmit={deposer} className="formulaire">
          <label className="champ-label">Exercice (année)</label>
          <input type="number" value={annee} onChange={(e) => setAnnee(Number(e.target.value))} className="champ-saisie" min="2020" max="2099" />
          <select value={avis} onChange={(e) => setAvis(e.target.value)} className="champ-saisie">
            <option value="favorable">Avis favorable</option>
            <option value="favorable_reserves">Favorable avec réserves</option>
            <option value="defavorable">Avis défavorable</option>
          </select>
          <textarea placeholder="Constatations, vérifications effectuées…" value={contenu} onChange={(e) => setContenu(e.target.value)} className="champ-saisie champ-texte" rows={6} required />
          <textarea placeholder="Conclusion et recommandations…" value={conclusion} onChange={(e) => setConclusion(e.target.value)} className="champ-saisie champ-texte" rows={4} />
          <button type="submit" className="bouton-principal">Déposer le rapport</button>
        </form>
      </section>
      <section className="carte">
        <h2 className="titre-carte">Rapports déposés ({rapports.length})</h2>
        <ul className="liste">
          {rapports.map((r) => {
            const avisLabel = { favorable: '✅ Favorable', favorable_reserves: '⚠️ Avec réserves', defavorable: '❌ Défavorable' }[r.avis] ?? r.avis
            return (
              <li key={r.id} className="ligne-liste-verticale">
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <strong>Exercice {r.annee}</strong>
                  <span className="etiquette">{avisLabel}</span>
                </div>
                {r.conclusion && <p className="note" style={{ margin: '0.25rem 0 0' }}>{r.conclusion.slice(0, 120)}…</p>}
              </li>
            )
          })}
          {rapports.length === 0 && <p className="note">Aucun rapport déposé.</p>}
        </ul>
      </section>
    </div>
  )
}

function ObservationsCommissaire({ uid }) {
  const [obs, setObs] = useState([])
  const [texte, setTexte] = useState('')
  const [cible, setCible] = useState('BEN')

  useEffect(() => {
    const q = query(collection(db, 'observationsCommissariat'), orderBy('creeLe', 'desc'))
    return onSnapshot(q, (snap) => setObs(snap.docs.map((d) => ({ id: d.id, ...d.data() }))))
  }, [])

  async function ajouter(e) {
    e.preventDefault()
    await addDoc(collection(db, 'observationsCommissariat'), {
      texte, cible, auteurUid: uid, creeLe: serverTimestamp(),
    })
    setTexte('')
  }

  return (
    <div className="grille-deux">
      <section className="carte">
        <h2 className="titre-carte">Formuler une observation</h2>
        <form onSubmit={ajouter} className="formulaire">
          <input type="text" placeholder="Destinataire (BEN, Trésorier, etc.)" value={cible} onChange={(e) => setCible(e.target.value)} className="champ-saisie" />
          <textarea placeholder="Observation formulée…" value={texte} onChange={(e) => setTexte(e.target.value)} className="champ-saisie champ-texte" rows={5} required />
          <button type="submit" className="bouton-principal">Enregistrer</button>
        </form>
      </section>
      <section className="carte">
        <h2 className="titre-carte">Observations ({obs.length})</h2>
        <ul className="liste">
          {obs.map((o) => (
            <li key={o.id} className="ligne-liste-verticale">
              <span className="etiquette">→ {o.cible}</span>
              <p style={{ margin: '0.3rem 0 0', whiteSpace: 'pre-wrap' }}>{o.texte}</p>
            </li>
          ))}
          {obs.length === 0 && <p className="note">Aucune observation enregistrée.</p>}
        </ul>
      </section>
    </div>
  )
}
