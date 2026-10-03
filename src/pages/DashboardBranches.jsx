import React, { useEffect, useState } from 'react'
import { collection, addDoc, doc, updateDoc, onSnapshot, query, where } from 'firebase/firestore'
import { db } from '../lib/firebase.js'
import { useAuth } from '../context/AuthContext.jsx'
import { creerCompte, messageErreurCompte, nommerPasteur, reprendreDirection } from '../lib/comptes.js'

export default function DashboardBranches({ branches }) {
  const { user, profil } = useAuth()
  const [nom, setNom] = useState('')
  const [ville, setVille] = useState('')
  const [estMere, setEstMere] = useState(false)
  const [seuilSolde, setSeuilSolde] = useState('50000') // Plafond par défaut (à confirmer par le BEN) : 50 000 FCFA
  const [brancheSelectionnee, setBrancheSelectionnee] = useState(null)
  const mere = branches.find((b) => b.mere)

  async function creerBranche(e) {
    e.preventDefault()
    if (!nom.trim()) return
    const donnees = { nom, ville, pasteurNom: '', pasteurUid: null, mere: false, direction: null, seuilSolde: seuilSolde ? Number(seuilSolde) : null }
    if (estMere && !mere) Object.assign(donnees, { mere: true, direction: 'archeveque', pasteurUid: user.uid, pasteurNom: profil?.nom ?? 'Archevêque' })
    await addDoc(collection(db, 'branches'), donnees)
    setNom(''); setVille(''); setSeuilSolde('50000'); setEstMere(false)
  }

  const brancheAffichee = branches.find((b) => b.id === brancheSelectionnee)
  const triees = [...branches].sort((a, b) => (b.mere ? 1 : 0) - (a.mere ? 1 : 0))

  return (
    <div className="grille-deux">
      <section className="carte">
        <h2 className="titre-carte">Créer une église</h2>
        <form onSubmit={creerBranche} className="formulaire">
          <input type="text" placeholder="Nom de l'église" value={nom} onChange={(e) => setNom(e.target.value)} className="champ-saisie" required />
          <input type="text" placeholder="Ville" value={ville} onChange={(e) => setVille(e.target.value)} className="champ-saisie" />
          <input type="number" placeholder="Plafond de caisse (FCFA)" value={seuilSolde} onChange={(e) => setSeuilSolde(e.target.value)} className="champ-saisie" />
          {!mere && (
            <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start', fontSize: '0.92rem' }}>
              <input type="checkbox" checked={estMere} onChange={(e) => setEstMere(e.target.checked)} style={{ marginTop: '0.25rem' }} />
              <span>C'est l'<strong>église mère</strong> : elle est dirigée par l'Archevêque lui-même.</span>
            </label>
          )}
          <button type="submit" className="bouton-principal">Créer l'église</button>
        </form>
        <p className="note">
          Une fois l'église créée, cliquez dessus pour <strong>créer le compte de son pasteur</strong> et le nommer responsable.
          Les autres comptes (secrétaire, trésorier, départements) se créent dans « Utilisateurs ».
        </p>

        <h2 className="titre-carte" style={{ marginTop: '2rem' }}>Églises ({branches.length})</h2>
        <ul className="liste">
          {triees.map((b) => (
            <li key={b.id} className="ligne-liste" style={{ cursor: 'pointer' }} onClick={() => setBrancheSelectionnee(b.id)}>
              <span>{b.nom}{b.mere && <span className="etiquette" style={{ marginLeft: '0.5rem' }}>Église mère</span>}</span>
              <span className="etiquette">{b.mere && b.direction === 'archeveque' ? "dirigée par l'Archevêque" : b.pasteurNom || 'sans pasteur nommé'}</span>
            </li>
          ))}
          {branches.length === 0 && <p className="note">Aucune église pour l'instant. Créez d'abord l'église mère.</p>}
        </ul>
      </section>

      <section className="carte">
        {brancheAffichee ? (
          <DetailBranche key={brancheAffichee.id} branche={brancheAffichee} onFermer={() => setBrancheSelectionnee(null)} />
        ) : (
          <p className="note">Sélectionnez une église pour voir ou modifier ses informations et son pasteur.</p>
        )}
      </section>
    </div>
  )
}

function DetailBranche({ branche, onFermer }) {
  const { user, profil } = useAuth()
  const [ville, setVille] = useState(branche.ville || '')
  const [seuilSolde, setSeuilSolde] = useState(branche.seuilSolde ?? '')
  const [pasteurs, setPasteurs] = useState([])
  const [choix, setChoix] = useState('')
  const [creation, setCreation] = useState(false)
  const [f, setF] = useState({ nom: '', email: '', mdp: '' })
  const [msg, setMsg] = useState(null)
  const [enCours, setEnCours] = useState(false)
  const nomArch = profil?.nom ?? 'Archevêque'

  useEffect(() => onSnapshot(query(collection(db, 'utilisateurs'), where('brancheId', '==', branche.id)),
    (s) => setPasteurs(s.docs.map((d) => ({ id: d.id, ...d.data() })).filter((u) => u.role === 'pasteur' || u.role === 'pasteur_suppleant'))), [branche.id])

  async function enregistrer(e) {
    e.preventDefault()
    await updateDoc(doc(db, 'branches', branche.id), { ville, seuilSolde: seuilSolde === '' ? null : Number(seuilSolde) })
    setMsg({ ok: true, t: 'Informations enregistrées.' })
  }

  async function nommer() {
    const p = pasteurs.find((x) => x.id === choix); if (!p) return
    if (branche.mere && branche.direction === 'archeveque' &&
      !window.confirm(`Confier la direction de l'église mère à ${p.nom} ? Vous passerez à la supervision générale (vous pourrez reprendre la direction à tout moment).`)) return
    await nommerPasteur(branche.id, p.id, p.nom); setChoix(''); setMsg({ ok: true, t: `${p.nom} est maintenant pasteur responsable.` })
  }

  async function reprendre() {
    if (!window.confirm("Reprendre vous-même la direction de l'église mère ? Le pasteur actuel garde son compte, mais ne dirige plus l'église.")) return
    await reprendreDirection(branche.id, user.uid, nomArch); setMsg({ ok: true, t: "Vous dirigez de nouveau l'église mère." })
  }

  async function creerPasteur(e) {
    e.preventDefault(); setMsg(null)
    if (branche.mere && branche.direction === 'archeveque' &&
      !window.confirm("Ce pasteur prendra la direction de l'église mère et vous passerez à la supervision générale. Continuer ?")) return
    setEnCours(true)
    try {
      const { uid } = await creerCompte({ nom: f.nom, email: f.email, motDePasse: f.mdp, role: 'pasteur', brancheId: branche.id })
      await nommerPasteur(branche.id, uid, f.nom)
      setMsg({ ok: true, t: `Compte créé. ${f.nom} peut se connecter avec son e-mail et le mot de passe temporaire ; il sera invité à le changer.` })
      setF({ nom: '', email: '', mdp: '' }); setCreation(false)
    } catch (err) { setMsg({ ok: false, t: messageErreurCompte(err) }) }
    setEnCours(false)
  }

  const dirigeeParArch = branche.mere && branche.direction === 'archeveque'

  return (
    <div>
      <div className="ligne-liste" style={{ borderBottom: 'none', marginBottom: '0.5rem' }}>
        <h2 className="titre-carte" style={{ margin: 0 }}>{branche.nom}{branche.mere ? ' · Église mère' : ''}</h2>
        <button className="bouton-lien" onClick={onFermer}>Fermer</button>
      </div>

      <h3 style={{ fontSize: '1rem', margin: '1rem 0 0.4rem' }}>Direction de l'église</h3>
      <p className="note" style={{ marginTop: 0 }}>
        {dirigeeParArch ? <>Dirigée par <strong>l'Archevêque</strong> en personne.</> : branche.pasteurNom ? <>Pasteur responsable : <strong>{branche.pasteurNom}</strong></> : "Aucun pasteur n'est encore nommé."}
      </p>

      {pasteurs.length > 0 && (
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.6rem' }}>
          <select value={choix} onChange={(e) => setChoix(e.target.value)} className="champ-saisie" style={{ flex: 1, minWidth: '12rem' }}>
            <option value="">— Choisir un pasteur de cette église —</option>
            {pasteurs.map((p) => <option key={p.id} value={p.id}>{p.nom}{p.role === 'pasteur_suppleant' ? ' (suppléant)' : ''}</option>)}
          </select>
          <button type="button" className="bouton-principal" disabled={!choix} onClick={nommer}>Nommer</button>
        </div>
      )}

      {branche.mere && !dirigeeParArch && <button type="button" className="bouton-pdf" onClick={reprendre} style={{ marginBottom: '0.6rem' }}>Reprendre la direction moi-même</button>}

      {!creation ? (
        <button type="button" className="bouton-pdf" onClick={() => setCreation(true)}>+ Créer le compte d'un pasteur</button>
      ) : (
        <form onSubmit={creerPasteur} className="formulaire">
          <input type="text" placeholder="Nom complet du pasteur" value={f.nom} onChange={(e) => setF({ ...f, nom: e.target.value })} className="champ-saisie" required />
          <input type="email" placeholder="E-mail" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} className="champ-saisie" required />
          <input type="text" placeholder="Mot de passe temporaire (6 caractères min.)" value={f.mdp} onChange={(e) => setF({ ...f, mdp: e.target.value })} className="champ-saisie" required minLength={6} />
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button type="submit" className="bouton-principal" disabled={enCours}>{enCours ? 'Création…' : 'Créer et nommer'}</button>
            <button type="button" className="bouton-lien" onClick={() => setCreation(false)}>Annuler</button>
          </div>
        </form>
      )}
      {msg && <p className={msg.ok ? 'note' : 'alerte'} style={{ marginTop: '0.6rem' }}>{msg.t}</p>}

      <h3 style={{ fontSize: '1rem', margin: '1.5rem 0 0.4rem' }}>Informations</h3>
      <form onSubmit={enregistrer} className="formulaire">
        <label className="champ-label">Ville</label>
        <input type="text" value={ville} onChange={(e) => setVille(e.target.value)} className="champ-saisie" />
        <label className="champ-label">Plafond de caisse (FCFA)</label>
        <input type="number" value={seuilSolde} onChange={(e) => setSeuilSolde(e.target.value)} className="champ-saisie" />
        <button type="submit" className="bouton-principal">Enregistrer</button>
      </form>
    </div>
  )
}
