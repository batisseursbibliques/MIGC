import React, { useEffect, useState } from 'react'
import {
  collection, collectionGroup, onSnapshot, query, where, orderBy, doc, updateDoc, serverTimestamp,
} from 'firebase/firestore'
import { db } from '../lib/firebase.js'
import { useAuth } from '../context/AuthContext.jsx'
import DashboardCommunication from './DashboardCommunication.jsx'
import DashboardBranches from './DashboardBranches.jsx'
import DashboardRapports from './DashboardRapports.jsx'
import GestionProjets from './GestionProjets.jsx'
import VueMessagesPresident from './VueMessagesPresident.jsx'
import GestionMessages from './GestionMessages.jsx'
import DashboardUtilisateurs from './DashboardUtilisateurs.jsx'
import GestionSite from './GestionSite.jsx'

export default function DashboardNational({ page = 'vue', deconnexion }) {
  const { user, profil } = useAuth()
  const onglet = page
  const [branches, setBranches] = useState([])
  const [virements, setVirements] = useState([])

  useEffect(() => {
    const q = query(collection(db, 'branches'), orderBy('nom'))
    return onSnapshot(q, (snap) => setBranches(snap.docs.map((d) => ({ id: d.id, ...d.data() }))))
  }, [])

  useEffect(() => {
    // Nécessite un index composite (Firestore proposera un lien de création au premier lancement)
    const q = query(collectionGroup(db, 'virements'), where('statut', '==', 'declare'))
    return onSnapshot(q, (snap) => setVirements(snap.docs.map((d) => ({
      id: d.id,
      brancheId: d.ref.parent.parent.id,
      ...d.data(),
    }))))
  }, [])

  async function validerVirement(v) {
    const ref = doc(db, 'branches', v.brancheId, 'virements', v.id)
    await updateDoc(ref, {
      statut: 'valide',
      valideParUid: user.uid,
      dateValidation: serverTimestamp(),
    })
  }

  return (
    <div>
      {onglet === 'vue' && (
        <div className="grille-deux">
          <section className="carte">
            <h2 className="titre-carte">Églises locales ({branches.length})</h2>
            <ul className="liste">
              {branches.map((b) => (
                <li key={b.id} className="ligne-liste">
                  <span>{b.nom}</span>
                  <span className="etiquette">{b.ville}</span>
                </li>
              ))}
              {branches.length === 0 && <p className="note">Aucune branche enregistrée pour l'instant.</p>}
            </ul>
          </section>

          <section className="carte">
            <h2 className="titre-carte">Reversements en attente de validation</h2>
            <ul className="liste">
              {virements.map((v) => {
                const branche = branches.find((b) => b.id === v.brancheId)
                return (
                  <li key={v.id} className="ligne-liste">
                    <span>{branche?.nom ?? v.brancheId}</span>
                    <span>{v.montant.toLocaleString('fr-FR')} FCFA — réf. {v.reference || '—'}</span>
                    <button className="bouton-secondaire" onClick={() => validerVirement(v)}>Valider</button>
                  </li>
                )
              })}
              {virements.length === 0 && <p className="note">Aucun virement en attente.</p>}
            </ul>
          </section>
        </div>
      )}

      {onglet === 'branches' && (
        <DashboardBranches branches={branches} />
      )}

      {onglet === 'rapports' && (
        <DashboardRapports />
      )}

      {onglet === 'utilisateurs' && (
        <DashboardUtilisateurs role="national" />
      )}

      {onglet === 'site' && <GestionSite />}

      {onglet === 'communication' && (
        <DashboardCommunication uid={user.uid} peutPublierNational={true} />
      )}

      {onglet === 'messages' && (
        <VueMessagesNational uid={user.uid} nom={profil?.nom ?? 'Président'} />
      )}

      {onglet === 'projets' && (
        <VueProjetsNational />
      )}
    </div>
  )
}

// Vue Messages du président : ses propres messages + accordéon des autres pasteurs
function VueMessagesNational({ uid, nom }) {
  const [sousOnglet, setSousOnglet] = useState('mes-messages')

  return (
    <div>
      <nav className="onglets" style={{ marginBottom: '1.25rem' }}>
        <button
          className={sousOnglet === 'mes-messages' ? 'onglet actif' : 'onglet'}
          onClick={() => setSousOnglet('mes-messages')}
        >
          Mes messages
        </button>
        <button
          className={sousOnglet === 'pasteurs' ? 'onglet actif' : 'onglet'}
          onClick={() => setSousOnglet('pasteurs')}
        >
          Messages des pasteurs
        </button>
      </nav>

      {sousOnglet === 'mes-messages' && (
        <GestionMessages pasteurUid={uid} pasteurNom={nom} lectureSeule={false} />
      )}

      {sousOnglet === 'pasteurs' && <VueMessagesPresident />}
    </div>
  )
}

function VueProjetsNational() {
  const [vue, setVue] = useState('national')
  const [branches, setBranches] = useState([])
  const [brancheSelectionnee, setBrancheSelectionnee] = useState(null)
  const { user } = useAuth()

  useEffect(() => onSnapshot(collection(db, 'branches'), (snap) => {
    const b = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
    setBranches(b)
    if (b.length > 0 && !brancheSelectionnee) setBrancheSelectionnee(b[0].id)
  }), [])

  return (
    <div>
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem' }}>
        <button className={vue === 'national' ? 'bouton-principal' : 'bouton-secondaire'} onClick={() => setVue('national')}>
          Projets du BEN
        </button>
        <button className={vue === 'branches' ? 'bouton-principal' : 'bouton-secondaire'} onClick={() => setVue('branches')}>
          Projets des églises locales
        </button>
      </div>

      {vue === 'national' && (
        <GestionProjets brancheId={null} uid={user?.uid} lectureSeule={true} />
      )}

      {vue === 'branches' && (
        <div>
          <select
            value={brancheSelectionnee || ''}
            onChange={(e) => setBrancheSelectionnee(e.target.value)}
            className="champ-saisie"
            style={{ maxWidth: '300px', marginBottom: '1rem' }}
          >
            {branches.map((b) => <option key={b.id} value={b.id}>{b.nom}</option>)}
          </select>
          {brancheSelectionnee && (
            <GestionProjets brancheId={brancheSelectionnee} uid={null} lectureSeule={true} />
          )}
        </div>
      )}
    </div>
  )
}
