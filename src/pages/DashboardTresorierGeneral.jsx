import React, { useEffect, useState } from 'react'
import { collection, onSnapshot, query, where, collectionGroup, orderBy, doc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../lib/firebase.js'
import { useAuth } from '../context/AuthContext.jsx'

import GestionProjets from './GestionProjets.jsx'
import BoutonPdf from '../components/BoutonPdf.jsx'
import { exporterJournalCaisse, exporterVirements } from '../lib/exports.js'

const TYPES_MOUVEMENT = [
  { valeur: 'dime', label: 'Dîme' },
  { valeur: 'collecte', label: 'Collecte' },
  { valeur: 'don', label: 'Don' },
  { valeur: 'depense', label: 'Dépense' },
]

export default function DashboardTresorierGeneral({ profil , page = 'virements'}) {
  const { user } = useAuth()
  const onglet = page

  return (
    <div>
      <h1 className="titre-page">Trésorerie Générale du BEN — MIGC</h1>
      {onglet === 'virements' && <GestionVirements uid={user?.uid} />}
      {onglet === 'consolidation' && <ConsolidationFinanciere />}
      {onglet === 'branches' && <CaissesBranches />}
      {onglet === 'projetsNationaux' && (
        <GestionProjets brancheId={null} uid={user?.uid} />
      )}
      {onglet === 'projetsBranches' && <ProjetsBranches />}
    </div>
  )
}

function GestionVirements({ uid }) {
  const [virementsDeclares, setVirementsDeclares] = useState([])
  const [virementsValides, setVirementsValides] = useState([])
  const [branches, setBranches] = useState([])

  useEffect(() => onSnapshot(collection(db, 'branches'), (snap) => (
    setBranches(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
  )), [])

  useEffect(() => {
    const q = query(collectionGroup(db, 'virements'), where('statut', '==', 'declare'))
    return onSnapshot(q, (snap) => setVirementsDeclares(snap.docs.map((d) => ({
      id: d.id, brancheId: d.ref.parent.parent.id, ...d.data(),
    }))))
  }, [])

  useEffect(() => {
    const q = query(collectionGroup(db, 'virements'), where('statut', '==', 'valide'))
    return onSnapshot(q, (snap) => setVirementsValides(snap.docs.map((d) => ({
      id: d.id, brancheId: d.ref.parent.parent.id, ...d.data(),
    }))))
  }, [])

  async function valider(v) {
    await updateDoc(doc(db, 'branches', v.brancheId, 'virements', v.id), {
      statut: 'valide', valideParUid: uid, dateValidation: serverTimestamp(),
    })
  }

  const totalRecu = virementsValides.reduce((s, v) => s + v.montant, 0)
  const nomBranche = (id) => branches.find((b) => b.id === id)?.nom ?? id

  return (
    <div className="grille-deux">
      <section className="carte">
        <h2 className="titre-carte">En attente de validation ({virementsDeclares.length})</h2>
        <ul className="liste">
          {virementsDeclares.map((v) => (
            <li key={v.id} className="ligne-liste">
              <span>{nomBranche(v.brancheId)}</span>
              <span className="montant-positif">{v.montant.toLocaleString('fr-FR')} FCFA</span>
              <span className="note">{v.reference || '—'}</span>
              <button className="bouton-secondaire" onClick={() => valider(v)}>Valider</button>
            </li>
          ))}
          {virementsDeclares.length === 0 && <p className="note">Aucun virement en attente.</p>}
        </ul>
      </section>
      <section className="carte">
        <div className="barre-titre"><h2 className="titre-carte">Total reçu et validé</h2><BoutonPdf label="Registre des reversements" onExport={() => exporterVirements([...virementsDeclares, ...virementsValides], { titre: 'Registre des reversements reçus au BEN', brancheDe: (v) => nomBranche(v.brancheId) })} disabled={virementsDeclares.length + virementsValides.length === 0} /></div>
        <p className="grand-nombre">{totalRecu.toLocaleString('fr-FR')} FCFA</p>
        <p className="note">{virementsValides.length} virement(s) validé(s)</p>
        <ul className="liste" style={{ marginTop: '1rem' }}>
          {virementsValides.slice(0, 10).map((v) => (
            <li key={v.id} className="ligne-liste">
              <span>{nomBranche(v.brancheId)}</span>
              <span className="montant-positif">{v.montant.toLocaleString('fr-FR')} FCFA</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

function ConsolidationFinanciere() {
  const [mouvements, setMouvements] = useState([])
  const [branches, setBranches] = useState([])

  useEffect(() => onSnapshot(collection(db, 'branches'), (snap) => (
    setBranches(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
  )), [])

  useEffect(() => onSnapshot(collectionGroup(db, 'caisse'), (snap) => (
    setMouvements(snap.docs.map((d) => ({ id: d.id, brancheId: d.ref.parent.parent.id, ...d.data() })))
  )), [])

  const totauxParType = Object.fromEntries(
    TYPES_MOUVEMENT.map(({ valeur }) => [valeur, mouvements.filter((m) => m.type === valeur).reduce((s, m) => s + m.montant, 0)])
  )
  const soldeTotal = mouvements.reduce((acc, m) => m.type === 'depense' ? acc - m.montant : acc + m.montant, 0)

  return (
    <div className="grille-deux">
      <section className="carte">
        <div className="barre-titre"><h2 className="titre-carte">Consolidation (toutes branches)</h2><BoutonPdf label="Journal consolidé en PDF" onExport={() => exporterJournalCaisse(mouvements, { titre: 'Journal de caisse consolidé (toutes les églises)', brancheDe: (m) => branches.find((b) => b.id === m.brancheId)?.nom ?? '—' })} disabled={mouvements.length === 0} /></div>
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
        <div style={{ borderTop: '2px solid var(--encre)', marginTop: '1rem', paddingTop: '0.75rem' }}>
          <div className="ligne-liste">
            <strong>Solde net consolidé</strong>
            <strong className={soldeTotal >= 0 ? 'montant-positif' : 'montant-negatif'}>
              {soldeTotal.toLocaleString('fr-FR')} FCFA
            </strong>
          </div>
        </div>
      </section>
      <section className="carte">
        <h2 className="titre-carte">Par branche</h2>
        <ul className="liste">
          {branches.map((b) => {
            const mvts = mouvements.filter((m) => m.brancheId === b.id)
            const solde = mvts.reduce((acc, m) => m.type === 'depense' ? acc - m.montant : acc + m.montant, 0)
            return (
              <li key={b.id} className="ligne-liste">
                <span>{b.nom}</span>
                <span className={solde >= 0 ? 'montant-positif' : 'montant-negatif'}>{solde.toLocaleString('fr-FR')} FCFA</span>
              </li>
            )
          })}
          {branches.length === 0 && <p className="note">Aucune branche enregistrée.</p>}
        </ul>
      </section>
    </div>
  )
}

function CaissesBranches() {
  const [mouvements, setMouvements] = useState([])
  const [branches, setBranches] = useState([])
  const [brancheSelectionnee, setBrancheSelectionnee] = useState(null)

  useEffect(() => onSnapshot(collection(db, 'branches'), (snap) => {
    const b = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
    setBranches(b)
    if (b.length > 0 && !brancheSelectionnee) setBrancheSelectionnee(b[0].id)
  }), [])

  useEffect(() => {
    if (!brancheSelectionnee) return
    const q = query(collection(db, 'branches', brancheSelectionnee, 'caisse'), orderBy('date', 'desc'))
    return onSnapshot(q, (snap) => setMouvements(snap.docs.map((d) => ({ id: d.id, ...d.data() }))))
  }, [brancheSelectionnee])

  const solde = mouvements.reduce((acc, m) => m.type === 'depense' ? acc - m.montant : acc + m.montant, 0)

  return (
    <div>
      <div style={{ marginBottom: '1rem' }}>
        <select value={brancheSelectionnee || ''} onChange={(e) => setBrancheSelectionnee(e.target.value)} className="champ-saisie" style={{ maxWidth: '300px' }}>
          {branches.map((b) => <option key={b.id} value={b.id}>{b.nom}</option>)}
        </select>
      </div>
      <div className="grille-deux">
        <section className="carte">
          <h2 className="titre-carte">Solde actuel</h2>
          <p className="grand-nombre">{solde.toLocaleString('fr-FR')} FCFA</p>
          <p className="note">{mouvements.length} mouvement(s)</p>
        </section>
        <section className="carte">
          <div className="barre-titre"><h2 className="titre-carte">Derniers mouvements</h2><BoutonPdf label="Journal complet en PDF" onExport={() => exporterJournalCaisse(mouvements, { eglise: branches.find((b) => b.id === brancheSelectionnee)?.nom })} disabled={mouvements.length === 0} /></div>
          <ul className="liste">
            {mouvements.slice(0, 15).map((m) => (
              <li key={m.id} className="ligne-liste">
                <span>{TYPES_MOUVEMENT.find((t) => t.valeur === m.type)?.label ?? m.type}</span>
                <span>{m.description}</span>
                <span className={m.type === 'depense' ? 'montant-negatif' : 'montant-positif'}>
                  {m.type === 'depense' ? '-' : '+'}{m.montant.toLocaleString('fr-FR')} FCFA
                </span>
              </li>
            ))}
            {mouvements.length === 0 && <p className="note">Aucun mouvement enregistré.</p>}
          </ul>
        </section>
      </div>
    </div>
  )
}

// Vue consolidée des projets de toutes les églises locales (lecture seule pour le TG)
function ProjetsBranches() {
  const [branches, setBranches] = useState([])
  const [brancheSelectionnee, setBrancheSelectionnee] = useState(null)

  useEffect(() => onSnapshot(collection(db, 'branches'), (snap) => {
    const b = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
    setBranches(b)
    if (b.length > 0 && !brancheSelectionnee) setBrancheSelectionnee(b[0].id)
  }), [])

  return (
    <div>
      <div style={{ marginBottom: '1rem' }}>
        <select
          value={brancheSelectionnee || ''}
          onChange={(e) => setBrancheSelectionnee(e.target.value)}
          className="champ-saisie"
          style={{ maxWidth: '300px' }}
        >
          {branches.map((b) => <option key={b.id} value={b.id}>{b.nom}</option>)}
        </select>
      </div>
      {brancheSelectionnee && (
        <GestionProjets brancheId={brancheSelectionnee} uid={null} lectureSeule={true} />
      )}
    </div>
  )
}
