import React, { useEffect, useState } from 'react'
import {
  collection, addDoc, updateDoc, doc, onSnapshot, query, orderBy, serverTimestamp,
} from 'firebase/firestore'
import { db } from '../lib/firebase.js'

const TYPES_CULTE = [
  { valeur: 'dominical', label: 'Culte dominical' },
  { valeur: 'semaine', label: 'Culte en semaine' },
  { valeur: 'special', label: 'Culte spécial' },
]

export default function DashboardCultes({ profil }) {
  const { brancheId, uid } = profil
  const [cultes, setCultes] = useState([])
  const [culteSelectionne, setCulteSelectionne] = useState(null)

  // Formulaire de création
  const [type, setType] = useState('dominical')
  const [date, setDate] = useState('')
  const [heure, setHeure] = useState('')
  const [theme, setTheme] = useState('')
  const [predicateur, setPredicateur] = useState('')

  useEffect(() => {
    const q = query(collection(db, 'branches', brancheId, 'cultes'), orderBy('date', 'desc'))
    return onSnapshot(q, (snap) => setCultes(snap.docs.map((d) => ({ id: d.id, ...d.data() }))))
  }, [brancheId])

  async function programmerCulte(e) {
    e.preventDefault()
    if (!date) return
    await addDoc(collection(db, 'branches', brancheId, 'cultes'), {
      type,
      date,
      heure,
      theme,
      predicateur,
      programme: [],
      presence: null,
      creeParUid: uid,
      dateCreation: serverTimestamp(),
    })
    setDate('')
    setHeure('')
    setTheme('')
    setPredicateur('')
  }

  const culteAffiche = cultes.find((c) => c.id === culteSelectionne)

  return (
    <div className="grille-deux">
      <section className="carte">
        <h2 className="titre-carte">Programmer un culte</h2>
        <form onSubmit={programmerCulte} className="formulaire">
          <select value={type} onChange={(e) => setType(e.target.value)} className="champ-saisie">
            {TYPES_CULTE.map((t) => (
              <option key={t.valeur} value={t.valeur}>{t.label}</option>
            ))}
          </select>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="champ-saisie" required />
          <input type="time" value={heure} onChange={(e) => setHeure(e.target.value)} className="champ-saisie" />
          <input
            type="text" placeholder="Thème (optionnel)" value={theme}
            onChange={(e) => setTheme(e.target.value)} className="champ-saisie"
          />
          <input
            type="text" placeholder="Prédicateur (optionnel)" value={predicateur}
            onChange={(e) => setPredicateur(e.target.value)} className="champ-saisie"
          />
          <button type="submit" className="bouton-principal">Programmer</button>
        </form>

        <h2 className="titre-carte" style={{ marginTop: '2rem' }}>Cultes</h2>
        <ul className="liste">
          {cultes.map((c) => (
            <li
              key={c.id}
              className="ligne-liste"
              style={{ cursor: 'pointer' }}
              onClick={() => setCulteSelectionne(c.id)}
            >
              <span>{formatterDate(c.date)} {c.heure && `— ${c.heure}`}</span>
              <span>{TYPES_CULTE.find((t) => t.valeur === c.type)?.label}</span>
              <span className="etiquette">{c.presence ? `${c.presence.total} présents` : 'à venir'}</span>
            </li>
          ))}
          {cultes.length === 0 && <p className="note">Aucun culte programmé pour l'instant.</p>}
        </ul>
      </section>

      <section className="carte">
        {culteAffiche ? (
          <DetailCulte brancheId={brancheId} culte={culteAffiche} />
        ) : (
          <p className="note">Sélectionne un culte dans la liste pour voir son programme et sa présence.</p>
        )}
      </section>
    </div>
  )
}

function DetailCulte({ brancheId, culte }) {
  const [titreItem, setTitreItem] = useState('')
  const [responsableItem, setResponsableItem] = useState('')

  const [hommes, setHommes] = useState('')
  const [femmes, setFemmes] = useState('')
  const [enfants, setEnfants] = useState('')

  const refCulte = doc(db, 'branches', brancheId, 'cultes', culte.id)

  async function ajouterItemProgramme(e) {
    e.preventDefault()
    if (!titreItem.trim()) return
    const nouveauProgramme = [...(culte.programme || []), { titre: titreItem, responsable: responsableItem }]
    await updateDoc(refCulte, { programme: nouveauProgramme })
    setTitreItem('')
    setResponsableItem('')
  }

  async function retirerItemProgramme(index) {
    const nouveauProgramme = (culte.programme || []).filter((_, i) => i !== index)
    await updateDoc(refCulte, { programme: nouveauProgramme })
  }

  async function enregistrerPresence(e) {
    e.preventDefault()
    const h = Number(hommes) || 0
    const f = Number(femmes) || 0
    const en = Number(enfants) || 0
    await updateDoc(refCulte, {
      presence: { hommes: h, femmes: f, enfants: en, total: h + f + en },
    })
    setHommes('')
    setFemmes('')
    setEnfants('')
  }

  return (
    <div>
      <h2 className="titre-carte">
        {formatterDate(culte.date)} {culte.heure && `— ${culte.heure}`}
      </h2>
      {culte.theme && <p className="note">Thème : {culte.theme}</p>}
      {culte.predicateur && <p className="note">Prédicateur : {culte.predicateur}</p>}

      <h3 className="titre-section">Programme</h3>
      <ul className="liste">
        {(culte.programme || []).map((item, i) => (
          <li key={i} className="ligne-liste">
            <span>{item.titre}</span>
            <span className="etiquette">{item.responsable || '—'}</span>
            <button className="bouton-lien" onClick={() => retirerItemProgramme(i)}>Retirer</button>
          </li>
        ))}
        {(culte.programme || []).length === 0 && <p className="note">Aucun élément ajouté.</p>}
      </ul>
      <form onSubmit={ajouterItemProgramme} className="formulaire">
        <input
          type="text" placeholder="Élément (ex. Louange, Offrande, Prédication)"
          value={titreItem} onChange={(e) => setTitreItem(e.target.value)} className="champ-saisie"
        />
        <input
          type="text" placeholder="Responsable (optionnel)"
          value={responsableItem} onChange={(e) => setResponsableItem(e.target.value)} className="champ-saisie"
        />
        <button type="submit" className="bouton-secondaire">Ajouter au programme</button>
      </form>

      <h3 className="titre-section">Présence</h3>
      {culte.presence ? (
        <p className="grand-nombre">{culte.presence.total}</p>
      ) : (
        <p className="note">Pas encore enregistrée.</p>
      )}
      <form onSubmit={enregistrerPresence} className="formulaire">
        <input type="number" placeholder="Hommes" value={hommes} onChange={(e) => setHommes(e.target.value)} className="champ-saisie" />
        <input type="number" placeholder="Femmes" value={femmes} onChange={(e) => setFemmes(e.target.value)} className="champ-saisie" />
        <input type="number" placeholder="Enfants" value={enfants} onChange={(e) => setEnfants(e.target.value)} className="champ-saisie" />
        <button type="submit" className="bouton-principal">Enregistrer la présence</button>
      </form>
    </div>
  )
}

function formatterDate(iso) {
  if (!iso) return ''
  // On ajoute T00:00 pour forcer l'interprétation en heure locale (et non UTC),
  // ce qui évite un décalage d'un jour selon le fuseau horaire de l'utilisateur.
  const d = new Date(iso + 'T00:00')
  return d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
}
