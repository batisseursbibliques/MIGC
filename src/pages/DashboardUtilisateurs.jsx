import React, { useEffect, useState } from 'react'
import { collection, onSnapshot, query, where, orderBy } from 'firebase/firestore'
import { db } from '../lib/firebase.js'
import { creerCompte, messageErreurCompte, nommerPasteur, ROLES_LOCAUX } from '../lib/comptes.js'

export default function DashboardUtilisateurs({ role, brancheId }) {
  const [utilisateurs, setUtilisateurs] = useState([])
  const [branches, setBranches] = useState([])
  const [departements, setDepartements] = useState([])
  const [nom, setNom] = useState('')
  const [email, setEmail] = useState('')
  const [motDePasse, setMotDePasse] = useState('')
  const [pays, setPays] = useState('')
  const [roleCree, setRoleCree] = useState(
    role === 'national' || role === 'admin' ? 'pasteur' : 'departement'
  )
  const [brancheCible, setBrancheCible] = useState(brancheId || '')
  const [departementCible, setDepartementCible] = useState('')
  const [statutMessage, setStatutMessage] = useState(null)
    const [enCours, setEnCours] = useState(false)

  const estGestionnaire = role === 'national' || role === 'admin'

  useEffect(() => {
    const contrainte = estGestionnaire ? [] : [where('brancheId', '==', brancheId)]
    const q = query(collection(db, 'utilisateurs'), ...contrainte)
    return onSnapshot(q, (snap) => setUtilisateurs(snap.docs.map((d) => ({ id: d.id, ...d.data() }))))
  }, [role, brancheId])

  useEffect(() => {
    if (!estGestionnaire) return
    const q = query(collection(db, 'branches'), orderBy('nom'))
    return onSnapshot(q, (snap) => setBranches(snap.docs.map((d) => ({ id: d.id, ...d.data() }))))
  }, [role])

  // Départements : ceux de l'église du pasteur, ou de l'église choisie par l'Archevêque
  const brancheDepts = role === 'pasteur' ? brancheId : (roleCree === 'departement' ? brancheCible : '')
  useEffect(() => {
    if (!brancheDepts) { setDepartements([]); return }
    const q = query(collection(db, 'branches', brancheDepts, 'departements'), orderBy('nom'))
    return onSnapshot(q, (snap) => setDepartements(snap.docs.map((d) => ({ id: d.id, ...d.data() }))))
  }, [brancheDepts])

  async function creerCompteSubmit(e) {
    e.preventDefault()
    setStatutMessage(null)
    setEnCours(true)
    const brancheFinale = estGestionnaire ? brancheCible : brancheId
    const eglise = branches.find((b) => b.id === brancheFinale)
    try {
      if (roleCree === 'pasteur' && eglise?.mere && eglise.direction === 'archeveque' &&
        !window.confirm("Ce pasteur prendra la direction de l'église mère et vous passerez à la supervision générale. Continuer ?")) { setEnCours(false); return }
      const { uid } = await creerCompte({
        nom, email, motDePasse, role: roleCree, brancheId: brancheFinale || null,
        departementId: roleCree === 'departement' ? (departementCible || null) : null, pays: pays || null,
      })
      if (roleCree === 'pasteur' && brancheFinale) await nommerPasteur(brancheFinale, uid, nom)
      setStatutMessage({ type: 'succes', texte: `Compte créé pour ${nom}. Il peut se connecter tout de suite avec son e-mail et ce mot de passe temporaire ; il sera invité à le changer.` })
      setNom(''); setEmail(''); setMotDePasse('')
    } catch (err) {
      setStatutMessage({ type: 'erreur', texte: messageErreurCompte(err) })
    }
    setEnCours(false)
  }

  return (
    <div className="grille-deux">
      <section className="carte">
        <h2 className="titre-carte">Créer un compte</h2>
        <form onSubmit={creerCompteSubmit} className="formulaire">
          <input type="text" placeholder="Nom complet" value={nom} onChange={(e) => setNom(e.target.value)} className="champ-saisie" required />
          <input type="email" placeholder="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} className="champ-saisie" required />
          <input
            type="text" placeholder="Mot de passe temporaire (6 caractères min.)" value={motDePasse}
            onChange={(e) => setMotDePasse(e.target.value)} className="champ-saisie" required minLength={6}
          />

          {estGestionnaire && (
            <>
              <input
                type="text" placeholder="Pays (ex : Bénin, Côte d'Ivoire…)"
                value={pays} onChange={(e) => setPays(e.target.value)} className="champ-saisie"
              />
              <select value={roleCree} onChange={(e) => setRoleCree(e.target.value)} className="champ-saisie">
                <optgroup label="Bureau national">
                  <option value="admin">Gestionnaire de comptes</option>
                  <option value="secretaire_general">Secrétaire Général</option>
                  <option value="tresorier_general">Trésorier Général</option>
                </optgroup>
                <optgroup label="Branche locale">
                  <option value="pasteur">Pasteur Responsable</option>
                  <option value="pasteur_suppleant">Pasteur Suppléant</option>
                  <option value="secretaire">Secrétaire Local</option>
                  <option value="secretaire_adjoint">Secrétaire Adjoint</option>
                  <option value="tresorier">Trésorier Local</option>
                  <option value="tresorier_adjoint">Trésorier Adjoint</option>
                  <option value="departement">Responsable de département</option>
                </optgroup>
              </select>
              {ROLES_LOCAUX.includes(roleCree) && (
                <select value={brancheCible} onChange={(e) => setBrancheCible(e.target.value)} className="champ-saisie">
                  <option value="">— Choisir l'église —</option>
                  {[...branches].sort((a, b) => (b.mere ? 1 : 0) - (a.mere ? 1 : 0)).map((b) => <option key={b.id} value={b.id}>{b.mere ? `Église mère — ${b.nom}` : b.nom}</option>)}
                </select>
              )}
            </>
          )}

          {(role === 'pasteur' || (estGestionnaire && roleCree === 'departement')) && (
            <select value={departementCible} onChange={(e) => setDepartementCible(e.target.value)} className="champ-saisie" required>
              <option value="">— Choisir le département —</option>
              {departements.map((d) => <option key={d.id} value={d.id}>{d.nom}</option>)}
            </select>
          )}

          <button
            type="submit"
            className="bouton-principal"
            disabled={enCours || (estGestionnaire && ROLES_LOCAUX.includes(roleCree) && !brancheCible) || ((role === 'pasteur' || (estGestionnaire && roleCree === 'departement')) && !departementCible)}
          >
            {enCours ? 'Création…' : 'Créer le compte'}
          </button>
        </form>

        {statutMessage && (
          <p className={statutMessage.type === 'erreur' ? 'alerte' : 'note'}>{statutMessage.texte}</p>
        )}

      </section>

      <section className="carte">
        <h2 className="titre-carte">Comptes ({utilisateurs.length})</h2>
        <ul className="liste">
          {utilisateurs.map((u) => (
            <li key={u.id} className="ligne-liste">
              <span>{u.nom}</span>
              <span className="etiquette">{u.role}</span>
            </li>
          ))}
          {utilisateurs.length === 0 && <p className="note">Aucun compte pour l'instant.</p>}
        </ul>
        <p className="note" style={{ marginTop: '1rem' }}>
          Un compte créé ici fonctionne immédiatement : aucune autre démarche technique n'est nécessaire.
        </p>
      </section>
    </div>
  )
}
