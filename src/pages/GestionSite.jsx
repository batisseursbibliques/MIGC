import React, { useEffect, useState } from 'react'
import {
  collection, addDoc, deleteDoc, doc, updateDoc, onSnapshot, query, orderBy, serverTimestamp,
} from 'firebase/firestore'
import { db } from '../lib/firebase.js'

const TYPES = {
  siteActualites: { label: 'Actualités', champs: [
    { nom: 'titre', label: 'Titre', requis: true },
    { nom: 'contenu', label: 'Contenu', type: 'textarea', requis: true },
  ], horodate: true },
  siteEvenements: { label: 'Événements', champs: [
    { nom: 'titre', label: 'Titre', requis: true },
    { nom: 'date', label: 'Date', type: 'date', requis: true },
    { nom: 'lieu', label: 'Lieu' },
    { nom: 'description', label: 'Description', type: 'textarea' },
  ] },
  sitePredications: { label: 'Prédications', champs: [
    { nom: 'titre', label: 'Titre', requis: true },
    { nom: 'orateur', label: 'Orateur' },
    { nom: 'date', label: 'Date', type: 'date', requis: true },
    { nom: 'lien', label: 'Lien (YouTube, audio…)' },
    { nom: 'resume', label: 'Résumé', type: 'textarea' },
  ] },
  siteAssemblees: { label: 'Assemblées', champs: [
    { nom: 'nom', label: 'Nom de l\'assemblée', requis: true },
    { nom: 'ville', label: 'Ville' },
    { nom: 'adresse', label: 'Adresse / repère' },
    { nom: 'horaires', label: 'Horaires des cultes' },
    { nom: 'contact', label: 'Contact' },
  ], horodate: true },
}

function Publier({ nom }) {
  const cfg = TYPES[nom]
  const vide = Object.fromEntries(cfg.champs.map((c) => [c.nom, '']))
  const [v, setV] = useState(vide)
  const [items, setItems] = useState([])

  useEffect(() => {
    const q = query(collection(db, nom), orderBy('date', 'desc'))
    return onSnapshot(q, (s) => setItems(s.docs.map((d) => ({ id: d.id, ...d.data() }))))
  }, [nom])

  async function ajouter(e) {
    e.preventDefault()
    const data = { ...v }
    if (cfg.horodate) data.date = serverTimestamp()
    await addDoc(collection(db, nom), data)
    setV(vide)
  }

  const titre = (i) => i.titre || i.nom

  return (
    <div>
      <form onSubmit={ajouter} className="carte">
        <h2 className="titre-carte">Ajouter — {cfg.label}</h2>
        {cfg.champs.map((c) => (
          <div key={c.nom} style={{ marginBottom: '0.6rem' }}>
            <div className="champ-label">{c.label}</div>
            {c.type === 'textarea' ? (
              <textarea className="champ-saisie champ-texte" rows={4} required={c.requis}
                value={v[c.nom]} onChange={(e) => setV({ ...v, [c.nom]: e.target.value })} />
            ) : (
              <input className="champ-saisie" type={c.type || 'text'} required={c.requis}
                value={v[c.nom]} onChange={(e) => setV({ ...v, [c.nom]: e.target.value })} />
            )}
          </div>
        ))}
        <button className="bouton-principal">Publier sur le site</button>
      </form>
      <ul className="liste" style={{ marginTop: '1rem' }}>
        {items.map((i) => (
          <li key={i.id} className="ligne-liste">
            <span>{titre(i)}</span>
            <button className="bouton-lien" onClick={() => window.confirm('Retirer du site ?') && deleteDoc(doc(db, nom, i.id))}>Retirer</button>
          </li>
        ))}
        {items.length === 0 && <p className="note">Rien de publié pour l'instant.</p>}
      </ul>
    </div>
  )
}

function Reception({ nom, label }) {
  const [items, setItems] = useState([])
  useEffect(() => {
    const q = query(collection(db, nom), orderBy('date', 'desc'))
    return onSnapshot(q, (s) => setItems(s.docs.map((d) => ({ id: d.id, ...d.data() }))))
  }, [nom])
  return (
    <div>
      <h2 className="titre-carte">{label} ({items.filter((i) => !i.traite).length} à traiter)</h2>
      <ul className="liste">
        {items.map((i) => (
          <li key={i.id} className="carte" style={{ opacity: i.traite ? 0.55 : 1 }}>
            <strong>{i.nom || 'Anonyme'}</strong>
            {i.contact && <span className="etiquette"> {i.contact}</span>}
            <p style={{ whiteSpace: 'pre-line' }}>{i.message}</p>
            <button className="bouton-lien" onClick={() => updateDoc(doc(db, nom, i.id), { traite: !i.traite })}>
              {i.traite ? 'Marquer à traiter' : 'Marquer traité'}
            </button>
          </li>
        ))}
        {items.length === 0 && <p className="note">Aucun message.</p>}
      </ul>
    </div>
  )
}

export default function GestionSite() {
  const [onglet, setOnglet] = useState('siteActualites')
  const tous = [...Object.keys(TYPES).map((k) => [k, TYPES[k].label]), ['demandesPriere', '🙏 Prières'], ['messagesContact', '✉️ Messages']]
  return (
    <div>
      <h1 className="titre-page">Site public</h1>
      <div style={{ display: 'flex', gap: '.4rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
        {tous.map(([k, l]) => (
          <button key={k} className={onglet === k ? 'bouton-principal' : 'bouton-secondaire'} onClick={() => setOnglet(k)}>{l}</button>
        ))}
      </div>
      {TYPES[onglet] && <Publier key={onglet} nom={onglet} />}
      {onglet === 'demandesPriere' && <Reception nom="demandesPriere" label="Demandes de prière" />}
      {onglet === 'messagesContact' && <Reception nom="messagesContact" label="Messages de contact" />}
    </div>
  )
}
