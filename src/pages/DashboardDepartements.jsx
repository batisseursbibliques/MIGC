import React, { useEffect, useState } from 'react'
import {
  collection, addDoc, updateDoc, doc, onSnapshot, query, orderBy,
} from 'firebase/firestore'
import { db } from '../lib/firebase.js'

export default function DashboardDepartements({ brancheId }) {
  const [departements, setDepartements] = useState([])
  const [nom, setNom] = useState('')
  const [objectifs, setObjectifs] = useState('')
  const [departementSelectionne, setDepartementSelectionne] = useState(null)

  useEffect(() => {
    const q = query(collection(db, 'branches', brancheId, 'departements'), orderBy('nom'))
    return onSnapshot(q, (snap) => setDepartements(snap.docs.map((d) => ({ id: d.id, ...d.data() }))))
  }, [brancheId])

  async function creerDepartement(e) {
    e.preventDefault()
    if (!nom.trim()) return
    await addDoc(collection(db, 'branches', brancheId, 'departements'), {
      nom, objectifs, statut: 'actif', responsableUid: null, responsableNom: '',
    })
    setNom('')
    setObjectifs('')
  }

  const deptAffiche = departements.find((d) => d.id === departementSelectionne)

  return (
    <div>
    <ComptesRendusRecus brancheId={brancheId} departements={departements} />
    <div className="grille-deux">
      <section className="carte">
        <h2 className="titre-carte">Créer un département</h2>
        <form onSubmit={creerDepartement} className="formulaire">
          <input
            type="text" placeholder="Nom (ex. Louange, Jeunesse, Femmes…)" value={nom}
            onChange={(e) => setNom(e.target.value)} className="champ-saisie" required
          />
          <textarea
            placeholder="Objectifs / description (optionnel)" value={objectifs}
            onChange={(e) => setObjectifs(e.target.value)} className="champ-saisie champ-texte" rows={2}
          />
          <button type="submit" className="bouton-principal">Créer</button>
        </form>

        <h2 className="titre-carte" style={{ marginTop: '2rem' }}>Départements ({departements.length})</h2>
        <ul className="liste">
          {departements.map((d) => (
            <li key={d.id} className="ligne-liste" style={{ cursor: 'pointer' }} onClick={() => setDepartementSelectionne(d.id)}>
              <span>{d.nom}</span>
              <span className="etiquette">{d.responsableNom || 'sans responsable'}</span>
            </li>
          ))}
          {departements.length === 0 && <p className="note">Aucun département créé pour l'instant.</p>}
        </ul>
      </section>

      <section className="carte">
        {deptAffiche ? (
          <DetailDepartement brancheId={brancheId} departement={deptAffiche} onFermer={() => setDepartementSelectionne(null)} />
        ) : (
          <p className="note">Sélectionne un département pour voir ou modifier ses informations.</p>
        )}
      </section>
    </div>
    </div>
  )
}

function DetailDepartement({ brancheId, departement, onFermer }) {
  const [responsableNom, setResponsableNom] = useState(departement.responsableNom || '')
  const [objectifs, setObjectifs] = useState(departement.objectifs || '')

  const refDept = doc(db, 'branches', brancheId, 'departements', departement.id)

  async function enregistrer(e) {
    e.preventDefault()
    await updateDoc(refDept, { responsableNom, objectifs })
  }

  return (
    <div>
      <div className="ligne-liste" style={{ borderBottom: 'none', marginBottom: '0.5rem' }}>
        <h2 className="titre-carte" style={{ margin: 0 }}>{departement.nom}</h2>
        <button className="bouton-lien" onClick={onFermer}>Fermer</button>
      </div>

      <form onSubmit={enregistrer} className="formulaire">
        <label className="champ-label">Nom du responsable</label>
        <input
          type="text" value={responsableNom} onChange={(e) => setResponsableNom(e.target.value)}
          className="champ-saisie" placeholder="Nom de la personne en charge"
        />
        <p className="note" style={{ marginTop: '-0.5rem' }}>
          Pour que le responsable ait son propre accès à l'application (compte + comptes-rendus),
          contactez le gestionnaire de comptes pour créer son compte et l'associer à ce département.
        </p>

        <label className="champ-label">Objectifs</label>
        <textarea
          value={objectifs} onChange={(e) => setObjectifs(e.target.value)}
          className="champ-saisie champ-texte" rows={3}
        />

        <button type="submit" className="bouton-principal">Enregistrer</button>
      </form>
    </div>
  )
}


// ── Comptes-rendus envoyés par les responsables de départements ─────────────
function ComptesRendusRecus({ brancheId, departements }) {
  const [parDept, setParDept] = useState({})
  const [erreur, setErreur] = useState(false)

  useEffect(() => {
    const ids = departements.map((d) => d.id)
    const fins = ids.map((id) =>
      onSnapshot(
        query(collection(db, 'branches', brancheId, 'departements', id, 'comptesRendus'), orderBy('date', 'desc')),
        (snap) => {
          setErreur(false)
          setParDept((prev) => ({ ...prev, [id]: snap.docs.map((d) => ({ id: d.id, ...d.data() })) }))
        },
        () => setErreur(true),
      ),
    )
    return () => fins.forEach((f) => f())
  }, [brancheId, departements.map((d) => d.id).join(',')])

  const groupes = departements
    .map((d) => ({ id: d.id, nom: d.nom, items: parDept[d.id] || [] }))
    .filter((g) => g.items.length > 0)
  const total = groupes.reduce((n, g) => n + g.items.length, 0)
  const styleSummary = { cursor: 'pointer', fontWeight: 600, padding: '0.7rem 0', listStyle: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }
  const fmt = (c) => (c.date?.toDate ? c.date.toDate().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : '')

  return (
    <section className="carte" style={{ marginBottom: '1.5rem' }}>
      <details>
        <summary style={{ ...styleSummary, padding: 0 }}>
          <h2 className="titre-carte" style={{ margin: 0 }}>Comptes-rendus reçus ({total})</h2>
          <span aria-hidden="true">▾</span>
        </summary>
        {erreur && <p className="alerte">Impossible de charger certains comptes-rendus.</p>}
        {groupes.length === 0 && <p className="note" style={{ marginTop: '1rem' }}>Aucun compte-rendu reçu pour l'instant.</p>}
        <div style={{ marginTop: '0.75rem' }}>
          {groupes.map((g) => (
            <details key={g.id} style={{ borderTop: '1px solid var(--ligne)' }}>
              <summary style={styleSummary}>
                <span>{g.nom} <span className="note">({g.items.length})</span></span>
                <span aria-hidden="true">▾</span>
              </summary>
              <ul className="liste" style={{ paddingBottom: '0.5rem' }}>
                {g.items.map((c) => (
                  <li key={c.id} className="ligne-liste-verticale">
                    <span className="note">{fmt(c)}</span>
                    <p style={{ margin: '0.3rem 0 0', whiteSpace: 'pre-line' }}>{c.contenu}</p>
                  </li>
                ))}
              </ul>
            </details>
          ))}
        </div>
      </details>
    </section>
  )
}
