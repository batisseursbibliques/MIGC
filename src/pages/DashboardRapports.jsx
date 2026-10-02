import React, { useEffect, useState } from 'react'
import { collection, collectionGroup, onSnapshot, query, where } from 'firebase/firestore'
import { db } from '../lib/firebase.js'

const TYPES_MOUVEMENT = [
  { valeur: 'dime', label: 'Dîme' },
  { valeur: 'collecte', label: 'Collecte' },
  { valeur: 'don', label: 'Don' },
  { valeur: 'depense', label: 'Dépense' },
]

export default function DashboardRapports({ brancheId }) {
  return brancheId ? <RapportBranche brancheId={brancheId} /> : <RapportNational />
}

function RapportBranche({ brancheId }) {
  const [membres, setMembres] = useState([])
  const [cultes, setCultes] = useState([])
  const [mouvements, setMouvements] = useState([])

  useEffect(() => onSnapshot(collection(db, 'branches', brancheId, 'membres'), (snap) => (
    setMembres(snap.docs.map((d) => d.data()))
  )), [brancheId])

  useEffect(() => onSnapshot(collection(db, 'branches', brancheId, 'cultes'), (snap) => (
    setCultes(snap.docs.map((d) => d.data()))
  )), [brancheId])

  useEffect(() => onSnapshot(collection(db, 'branches', brancheId, 'caisse'), (snap) => (
    setMouvements(snap.docs.map((d) => d.data()))
  )), [brancheId])

  const parStatut = compter(membres, 'statut')
  const cultesAvecPresence = cultes.filter((c) => c.presence)
  const presenceMoyenne = cultesAvecPresence.length
    ? Math.round(cultesAvecPresence.reduce((s, c) => s + c.presence.total, 0) / cultesAvecPresence.length)
    : null
  const totauxParType = Object.fromEntries(
    TYPES_MOUVEMENT.map(({ valeur }) => [valeur, mouvements.filter((m) => m.type === valeur).reduce((s, m) => s + m.montant, 0)]),
  )

  return (
    <div className="grille-deux">
      <section className="carte">
        <h2 className="titre-carte">Membres</h2>
        <p className="grand-nombre">{membres.length}</p>
        <ul className="liste">
          {Object.entries(parStatut).map(([statut, n]) => (
            <li key={statut} className="ligne-liste">
              <span>{statut.replace('_', ' ')}</span>
              <span>{n}</span>
            </li>
          ))}
        </ul>

        <h2 className="titre-carte" style={{ marginTop: '2rem' }}>Cultes</h2>
        <p className="note">{cultes.length} culte(s) enregistré(s)</p>
        {presenceMoyenne != null && <p className="note">Présence moyenne : {presenceMoyenne} personnes</p>}
      </section>

      <section className="carte">
        <h2 className="titre-carte">Finances (cumul)</h2>
        <ul className="liste">
          {TYPES_MOUVEMENT.map(({ valeur, label }) => (
            <li key={valeur} className="ligne-liste">
              <span>{label}</span>
              <span className={valeur === 'depense' ? 'montant-negatif' : 'montant-positif'}>
                {totauxParType[valeur].toLocaleString('fr-FR')} FCFA
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

function RapportNational() {
  const [branches, setBranches] = useState([])
  const [membres, setMembres] = useState([])
  const [virementsValides, setVirementsValides] = useState([])

  useEffect(() => onSnapshot(collection(db, 'branches'), (snap) => (
    setBranches(snap.docs.map((d) => d.data()))
  )), [])

  useEffect(() => onSnapshot(collectionGroup(db, 'membres'), (snap) => (
    setMembres(snap.docs.map((d) => d.data()))
  )), [])

  useEffect(() => {
    const q = query(collectionGroup(db, 'virements'), where('statut', '==', 'valide'))
    return onSnapshot(q, (snap) => setVirementsValides(snap.docs.map((d) => d.data())))
  }, [])

  const totalVirements = virementsValides.reduce((s, v) => s + v.montant, 0)

  return (
    <div className="grille-deux">
      <section className="carte">
        <h2 className="titre-carte">Le mouvement en chiffres</h2>
        <ul className="liste">
          <li className="ligne-liste"><span>Branches</span><span>{branches.length}</span></li>
          <li className="ligne-liste"><span>Membres (toutes branches)</span><span>{membres.length}</span></li>
        </ul>
      </section>

      <section className="carte">
        <h2 className="titre-carte">Virements reçus et validés (cumul)</h2>
        <p className="grand-nombre">{totalVirements.toLocaleString('fr-FR')} FCFA</p>
        <p className="note">{virementsValides.length} virement(s) validé(s) au total</p>
      </section>
    </div>
  )
}

function compter(liste, champ) {
  return liste.reduce((acc, item) => {
    const cle = item[champ] || 'non renseigné'
    acc[cle] = (acc[cle] || 0) + 1
    return acc
  }, {})
}
