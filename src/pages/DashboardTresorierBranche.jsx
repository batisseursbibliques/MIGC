import React, { useEffect, useState } from 'react'
import { collection, addDoc, onSnapshot, orderBy, query, serverTimestamp, doc, getDoc } from 'firebase/firestore'
import { db } from '../lib/firebase.js'

const TYPES_MOUVEMENT = [
  { valeur: 'dime', label: 'Dîme' },
  { valeur: 'collecte', label: 'Collecte' },
  { valeur: 'don', label: 'Don' },
  { valeur: 'depense', label: 'Dépense' },
]

import GestionProjets from './GestionProjets.jsx'
import { BoutonAbsence } from './GestionAbsence.jsx'
import BoutonPdf from '../components/BoutonPdf.jsx'
import { exporterJournalCaisse } from '../lib/exports.js'

export default function DashboardTresorierBranche({ profil, lectureSeule = false , page = 'caisse'}) {
  const { brancheId, uid } = profil
  const onglet = page
  const [branche, setBranche] = useState(null)
  const [mouvements, setMouvements] = useState([])
  const [type, setType] = useState('dime')
  const [montant, setMontant] = useState('')
  const [description, setDescription] = useState('')

  useEffect(() => {
    getDoc(doc(db, 'branches', brancheId)).then((s) => s.exists() && setBranche(s.data()))
  }, [brancheId])

  useEffect(() => {
    const q = query(collection(db, 'branches', brancheId, 'caisse'), orderBy('date', 'desc'))
    return onSnapshot(q, (snap) => setMouvements(snap.docs.map((d) => ({ id: d.id, ...d.data() }))))
  }, [brancheId])

  const solde = mouvements.reduce((acc, m) => m.type === 'depense' ? acc - m.montant : acc + m.montant, 0)
  const seuil = branche?.seuilSolde ?? null
  const depasseSeuil = seuil != null && solde > seuil

  async function ajouterMouvement(e) {
    e.preventDefault()
    if (!montant) return
    await addDoc(collection(db, 'branches', brancheId, 'caisse'), {
      type, montant: Number(montant), description,
      date: serverTimestamp(), auteurUid: uid,
    })
    setMontant(''); setDescription('')
  }

  return (
    <div>
      {!lectureSeule && (
        <BoutonAbsence
          roleId={`tresorier_${brancheId}`}
          nomTitulaire={profil.nom}
          nomAdjoint="le Trésorier Adjoint"
        />
      )}
      <h1 className="titre-page">{branche?.nom ?? 'Mon église locale'} — Trésorerie</h1>
      {onglet === 'caisse' && (
        <div className="grille-deux">
          <section className="carte">
            <h2 className="titre-carte">Solde actuel</h2>
            <p className="grand-nombre">{solde.toLocaleString('fr-FR')} FCFA</p>
            {seuil != null && (
              <p className={depasseSeuil ? 'alerte' : 'note'}>
                Seuil autorisé : {seuil.toLocaleString('fr-FR')} FCFA
                {depasseSeuil && ' — seuil dépassé, informez le pasteur.'}
              </p>
            )}
            <h3 className="titre-section">Enregistrer un mouvement</h3>
            <form onSubmit={ajouterMouvement} className="formulaire">
              <select value={type} onChange={(e) => setType(e.target.value)} className="champ-saisie">
                {TYPES_MOUVEMENT.map((t) => <option key={t.valeur} value={t.valeur}>{t.label}</option>)}
              </select>
              <input type="number" placeholder="Montant (FCFA)" value={montant} onChange={(e) => setMontant(e.target.value)} className="champ-saisie" required />
              <input type="text" placeholder="Description (optionnel)" value={description} onChange={(e) => setDescription(e.target.value)} className="champ-saisie" />
              <button type="submit" className="bouton-principal">Enregistrer</button>
            </form>
          </section>

          <section className="carte">
            <div className="barre-titre"><h2 className="titre-carte">Historique des mouvements</h2><BoutonPdf label="Journal de caisse en PDF" onExport={() => exporterJournalCaisse(mouvements, { eglise: branche?.nom })} disabled={mouvements.length === 0} /></div>
            <ul className="liste">
              {mouvements.map((m) => (
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
      )}

      {onglet === 'rapport' && (
        <div className="grille-deux">
          <section className="carte">
            <div className="barre-titre"><h2 className="titre-carte">Résumé financier</h2><BoutonPdf label="Journal de caisse en PDF" onExport={() => exporterJournalCaisse(mouvements, { eglise: branche?.nom })} disabled={mouvements.length === 0} /></div>
            <ul className="liste">
              {TYPES_MOUVEMENT.map(({ valeur, label }) => {
                const total = mouvements.filter((m) => m.type === valeur).reduce((s, m) => s + m.montant, 0)
                return (
                  <li key={valeur} className="ligne-liste">
                    <span>{label}</span>
                    <span className={valeur === 'depense' ? 'montant-negatif' : 'montant-positif'}>
                      {total.toLocaleString('fr-FR')} FCFA
                    </span>
                  </li>
                )
              })}
            </ul>
            <div style={{ borderTop: '2px solid var(--encre)', marginTop: '1rem', paddingTop: '0.75rem' }}>
              <div className="ligne-liste">
                <strong>Solde net</strong>
                <strong className={solde >= 0 ? 'montant-positif' : 'montant-negatif'}>
                  {solde.toLocaleString('fr-FR')} FCFA
                </strong>
              </div>
            </div>
          </section>

          <section className="carte">
            <h2 className="titre-carte">Reversement au BEN — 25 %</h2>
            <ReversementMIGC mouvements={mouvements} brancheId={brancheId} uid={uid} />
          </section>

          <section className="carte">
            <h2 className="titre-carte">Plafond de caisse</h2>
            <p className="note">{mouvements.length} mouvement(s) enregistré(s) au total.</p>
            {seuil != null && (
              <p className={depasseSeuil ? 'alerte' : 'note'} style={{ marginTop: '0.5rem' }}>
                Plafond MIGC : <strong>{seuil.toLocaleString('fr-FR')} FCFA</strong>.
                {depasseSeuil
                  ? ' Le solde dépasse ce plafond — un reversement vers le BEN est requis.'
                  : ' Le solde est dans les limites autorisées.'}
              </p>
            )}
          </section>
        </div>
      )}
      {onglet === 'projets' && (
        <GestionProjets brancheId={brancheId} uid={uid} />
      )}
    </div>
  )
}

// ── Calcul et déclaration du reversement de 25 % au BEN ─────────────────────
function ReversementMIGC({ mouvements, brancheId, uid }) {
  const [moisSelectionne, setMoisSelectionne] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })
  const [enCours, setEnCours] = useState(false)
  const [confirme, setConfirme] = useState(false)

  // Revenus du mois sélectionné (dîmes + collectes + dons)
  const typesRevenu = ['dime', 'collecte', 'don']
  const revenusMois = mouvements.filter((m) => {
    if (!typesRevenu.includes(m.type)) return false
    if (!m.date) return false
    const d = m.date.toDate ? m.date.toDate() : new Date(m.date)
    const moisMvt = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    return moisMvt === moisSelectionne
  })

  const totalRevenus = revenusMois.reduce((s, m) => s + m.montant, 0)
  const montantReversement = Math.round(totalRevenus * 0.25)

  async function declarerReversement() {
    if (montantReversement <= 0) return
    setEnCours(true)
    const { addDoc, collection, serverTimestamp } = await import('firebase/firestore')
    const { db } = await import('../lib/firebase.js')
    await addDoc(collection(db, 'branches', brancheId, 'virements'), {
      montant: montantReversement,
      reference: `Reversement 25% — ${moisSelectionne}`,
      statut: 'declare',
      mois: moisSelectionne,
      totalRevenusBase: totalRevenus,
      auteurUid: uid,
      date: serverTimestamp(),
    })
    setEnCours(false)
    setConfirme(true)
    setTimeout(() => setConfirme(false), 4000)
  }

  // Générer les 12 derniers mois pour la liste déroulante
  const moisDisponibles = []
  const maintenant = new Date()
  for (let i = 0; i < 12; i++) {
    const d = new Date(maintenant.getFullYear(), maintenant.getMonth() - i, 1)
    const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
    moisDisponibles.push({ val, label })
  }

  return (
    <div>
      <p className="note" style={{ marginBottom: '0.75rem' }}>
        Taux de reversement provisoire : <strong>25 %</strong> des revenus mensuels
        (dîmes, collectes, dons) au Bureau Exécutif National — à confirmer par le BEN (les statuts MIGC ne fixent pas de taux).
      </p>

      <label className="champ-label">Mois de référence</label>
      <select
        value={moisSelectionne}
        onChange={(e) => setMoisSelectionne(e.target.value)}
        className="champ-saisie"
        style={{ marginBottom: '0.75rem' }}
      >
        {moisDisponibles.map(({ val, label }) => (
          <option key={val} value={val}>{label}</option>
        ))}
      </select>

      <ul className="liste" style={{ marginBottom: '1rem' }}>
        <li className="ligne-liste">
          <span>Revenus du mois</span>
          <span className="montant-positif">{totalRevenus.toLocaleString('fr-FR')} FCFA</span>
        </li>
        <li className="ligne-liste" style={{ fontWeight: 700 }}>
          <span>25 % à reverser au BEN</span>
          <span style={{ color: 'var(--encre)', fontSize: '1.1rem' }}>
            {montantReversement.toLocaleString('fr-FR')} FCFA
          </span>
        </li>
      </ul>

      {montantReversement > 0 ? (
        <button
          className="bouton-principal"
          onClick={declarerReversement}
          disabled={enCours || confirme}
        >
          {confirme ? '✓ Reversement déclaré au BEN' : enCours ? 'Envoi…' : 'Déclarer ce reversement au BEN'}
        </button>
      ) : (
        <p className="note">Aucun revenu enregistré pour ce mois.</p>
      )}
    </div>
  )
}
