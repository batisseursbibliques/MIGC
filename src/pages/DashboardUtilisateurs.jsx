import React, { useEffect, useState } from 'react'
import { createUserWithEmailAndPassword, getAuth } from 'firebase/auth'
import {
  collection, doc, setDoc, updateDoc, onSnapshot, query, where, orderBy,
} from 'firebase/firestore'
import { db, getSecondaryApp } from '../lib/firebase.js'

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
  const [dernierUid, setDernierUid] = useState(null)
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

  useEffect(() => {
    if (role !== 'pasteur' || !brancheId) return
    const q = query(collection(db, 'branches', brancheId, 'departements'), orderBy('nom'))
    return onSnapshot(q, (snap) => setDepartements(snap.docs.map((d) => ({ id: d.id, ...d.data() }))))
  }, [role, brancheId])

  async function creerCompte(e) {
    e.preventDefault()
    setStatutMessage(null)
    setEnCours(true)
    const brancheFinale = estGestionnaire ? brancheCible : brancheId

    const authSecondaire = getAuth(getSecondaryApp())

    try {
      const identifiants = await createUserWithEmailAndPassword(authSecondaire, email, motDePasse)
      const nouvelUid = identifiants.user.uid

      const donneesProfil = {
        nom, role: roleCree,
        brancheId: brancheFinale || null,
        departementId: null,
        pays: pays || null,
      }
      if (roleCree === 'departement') donneesProfil.departementId = departementCible || null

      await setDoc(doc(db, 'utilisateurs', nouvelUid), donneesProfil)

      if (roleCree === 'departement' && departementCible) {
        await updateDoc(doc(db, 'branches', brancheFinale, 'departements', departementCible), {
          responsableUid: nouvelUid,
        })
      }

      setDernierUid({ uid: nouvelUid, ...donneesProfil })
      setStatutMessage({ type: 'succes', texte: 'Compte créé. Transmettez les informations ci-dessous au gestionnaire technique pour activation.' })
      setNom('')
      setEmail('')
      setMotDePasse('')
    } catch (err) {
      setStatutMessage({ type: 'erreur', texte: "Erreur : " + (err.message || 'création impossible') })
    } finally {
      await authSecondaire.signOut().catch(() => {})
      setEnCours(false)
    }
  }

  return (
    <div className="grille-deux">
      <section className="carte">
        <h2 className="titre-carte">Créer un compte</h2>
        <form onSubmit={creerCompte} className="formulaire">
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
                </optgroup>
              </select>
              {['pasteur', 'pasteur_suppleant', 'secretaire', 'secretaire_adjoint', 'tresorier', 'tresorier_adjoint'].includes(roleCree) && (
                <select value={brancheCible} onChange={(e) => setBrancheCible(e.target.value)} className="champ-saisie">
                  <option value="">— Choisir la branche —</option>
                  {branches.map((b) => <option key={b.id} value={b.id}>{b.nom}</option>)}
                </select>
              )}
            </>
          )}

          {role === 'pasteur' && (
            <select value={departementCible} onChange={(e) => setDepartementCible(e.target.value)} className="champ-saisie" required>
              <option value="">— Choisir le département —</option>
              {departements.map((d) => <option key={d.id} value={d.id}>{d.nom}</option>)}
            </select>
          )}

          <button
            type="submit"
            className="bouton-principal"
            disabled={
              enCours
              || (estGestionnaire && ['pasteur', 'pasteur_suppleant', 'secretaire', 'secretaire_adjoint', 'tresorier', 'tresorier_adjoint'].includes(roleCree) && !brancheCible)
              || (role === 'pasteur' && !departementCible)
            }
          >
            {enCours ? 'Création…' : 'Créer le compte'}
          </button>
        </form>

        {statutMessage && (
          <p className={statutMessage.type === 'erreur' ? 'alerte' : 'note'}>{statutMessage.texte}</p>
        )}

        {dernierUid && (
          <div className="carte" style={{ marginTop: '1rem', background: '#F0F6FF' }}>
            <p className="note" style={{ marginBottom: '0.5rem' }}>
              Informations à transmettre pour l'activation de l'accès :
            </p>
            <p className="etiquette" style={{ display: 'block', wordBreak: 'break-all' }}>
              uid : {dernierUid.uid}<br />
              rôle : {dernierUid.role}<br />
              branche : {dernierUid.brancheId || '—'}
              {dernierUid.departementId && <>, département : {dernierUid.departementId}</>}
            </p>
          </div>
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
          Un compte créé ici peut se connecter tout de suite avec son e-mail et son mot de
          passe. L'accès aux données sera activé après la mise à jour des règles de sécurité
          (opération technique réalisée par le gestionnaire de l'application).
        </p>
      </section>
    </div>
  )
}
