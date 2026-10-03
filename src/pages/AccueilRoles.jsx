import React, { useEffect, useMemo, useState } from 'react'
import { collection, collectionGroup, onSnapshot, orderBy, query } from 'firebase/firestore'
import { db } from '../lib/firebase.js'
import { Entete, Chiffres, Chiffre, Grille, Bloc, Vide, Ligne, Barres, Repartition, Acces, COULEURS_STATUT, fcfa, sixMois, dateMvt, dateCourte, salutation, moisCourant } from './AccueilComposants.jsx'

const ecoute = (ref, set, avec = (d) => d) => onSnapshot(ref, (s) => set(s.docs.map((d) => avec({ id: d.id, ...d.data() }, d))), () => set([]))
const soldeDe = (mv) => mv.reduce((a, m) => (m.type === 'depense' ? a - m.montant : a + m.montant), 0)

// ── Secrétaire Général ───────────────────────────────────────────────────────
export function AccueilSG({ profil, onNaviguer }) {
  const [branches, setBranches] = useState([]); const [membres, setMembres] = useState([])
  const [pvBen, setPvBen] = useState([]); const [courriers, setCourriers] = useState([]); const [pvEglises, setPvEglises] = useState([])
  useEffect(() => ecoute(collection(db, 'branches'), setBranches), [])
  useEffect(() => ecoute(collectionGroup(db, 'membres'), setMembres, (d, s) => ({ ...d, brancheId: s.ref.parent.parent.id })), [])
  useEffect(() => ecoute(query(collection(db, 'pvNationaux'), orderBy('date', 'desc')), setPvBen), [])
  useEffect(() => ecoute(query(collection(db, 'courrierNational'), orderBy('date', 'desc')), setCourriers), [])
  useEffect(() => ecoute(collectionGroup(db, 'pv'), setPvEglises), [])
  const actifs = membres.filter((m) => m.statut !== 'parti').length
  const parStatut = COULEURS_STATUT.map(([k, label, couleur]) => ({ label, couleur, n: membres.filter((m) => m.statut === k).length }))
  const mc = moisCourant(); const duMois = courriers.filter((c) => String(c.date).startsWith(mc)).length
  return (
    <div className="tb">
      <Entete titre={`${salutation()}, ${profil.nom ?? 'Secrétaire Général'}.`} sous="Secrétariat Général du Bureau Exécutif National" />
      <Chiffres>
        <Chiffre valeur={branches.length} label={branches.length > 1 ? 'Églises locales' : 'Église locale'} onClick={() => onNaviguer('rapportsBranches')} />
        <Chiffre valeur={actifs} label="Membres actifs" onClick={() => onNaviguer('membres')} />
        <Chiffre valeur={pvBen.length} label="PV du BEN" onClick={() => onNaviguer('pv')} />
        <Chiffre valeur={duMois} label="Courriers ce mois-ci" onClick={() => onNaviguer('courrier')} />
      </Chiffres>
      <Grille>
        <Bloc titre="Derniers procès-verbaux du BEN">
          {pvBen.length === 0 && <Vide>Aucun procès-verbal enregistré.</Vide>}
          {pvBen.slice(0, 4).map((p) => <Ligne key={p.id} titre={p.objet} detail={dateCourte(p.date)} onClick={() => onNaviguer('pv')} />)}
        </Bloc>
        <Bloc titre="Derniers courriers">
          {courriers.length === 0 && <Vide>Aucun courrier enregistré.</Vide>}
          {courriers.slice(0, 4).map((c) => <Ligne key={c.id} titre={c.objet} detail={`${c.sens === 'entrant' ? 'Reçu de' : 'Envoyé à'} ${c.expediteur} · ${dateCourte(c.date)}`} onClick={() => onNaviguer('courrier')} />)}
        </Bloc>
        <Bloc titre="Membres"><p className="tb-gros">{membres.length} <small>enregistrés</small></p><Repartition items={parStatut} total={membres.length} /></Bloc>
        <Bloc titre="Les églises">
          {branches.length === 0 && <Vide>Aucune église enregistrée.</Vide>}
          {branches.map((b) => <Ligne key={b.id} titre={b.nom} detail={b.ville} droite={<b>{membres.filter((m) => m.brancheId === b.id && m.statut !== 'parti').length} membres</b>} onClick={() => onNaviguer('rapportsBranches')} />)}
          {pvEglises.length > 0 && <p className="tb-vide" style={{ marginTop: '.6rem' }}>{pvEglises.length} procès-verbal(aux) d'églises locales reçu(s).</p>}
        </Bloc>
      </Grille>
      <Acces onNaviguer={onNaviguer} liens={[['membres', 'Registre des membres'], ['pv', 'PV du BEN'], ['courrier', 'Courrier du BEN'], ['rapportsBranches', 'PV des églises']]} />
    </div>
  )
}

// ── Trésorière Générale ──────────────────────────────────────────────────────
export function AccueilTG({ profil, onNaviguer }) {
  const [branches, setBranches] = useState([]); const [mouvements, setMouvements] = useState([]); const [virements, setVirements] = useState([])
  useEffect(() => ecoute(collection(db, 'branches'), setBranches), [])
  useEffect(() => ecoute(collectionGroup(db, 'caisse'), setMouvements, (d, s) => ({ ...d, brancheId: s.ref.parent.parent.id })), [])
  useEffect(() => ecoute(collectionGroup(db, 'virements'), setVirements, (d, s) => ({ ...d, brancheId: s.ref.parent.parent.id })), [])
  const mois = useMemo(() => sixMois(mouvements), [mouvements])
  const attente = virements.filter((v) => v.statut === 'declare')
  const recu = virements.filter((v) => v.statut === 'valide').reduce((a, v) => a + (v.montant || 0), 0)
  const nom = (id) => branches.find((b) => b.id === id)?.nom ?? id
  const parEglise = branches.map((b) => ({ ...b, solde: soldeDe(mouvements.filter((m) => m.brancheId === b.id)) }))
  return (
    <div className="tb">
      <Entete titre={`${salutation()}, ${profil.nom ?? 'Trésorière Générale'}.`} sous="Trésorerie Générale du Bureau Exécutif National" />
      <Chiffres>
        <Chiffre valeur={fcfa(soldeDe(mouvements))} label="Solde cumulé des caisses" large onClick={() => onNaviguer('consolidation')} />
        <Chiffre valeur={fcfa(recu)} label="Reversements validés" onClick={() => onNaviguer('virements')} />
        <Chiffre valeur={attente.length} label={attente.length > 1 ? 'Reversements à valider' : 'Reversement à valider'} alerte={attente.length > 0} onClick={() => onNaviguer('virements')} />
      </Chiffres>
      <Grille>
        <Bloc titre="À valider" pleine pastille={attente.length}>
          {attente.length === 0 && <Vide>Aucun reversement en attente.</Vide>}
          {attente.map((v) => <Ligne key={v.id} titre={nom(v.brancheId)} detail={`${fcfa(v.montant)}${v.reference ? ` · ${v.reference}` : ''}`} onClick={() => onNaviguer('virements')} />)}
        </Bloc>
        <Bloc titre="Entrées et sorties, 6 derniers mois"><Barres mois={mois} /></Bloc>
        <Bloc titre="Caisse de chaque église">
          {branches.length === 0 && <Vide>Aucune église enregistrée.</Vide>}
          {parEglise.map((e) => <Ligne key={e.id} titre={e.nom} detail={e.ville} droite={<b>{fcfa(e.solde)}</b>} onClick={() => onNaviguer('branches')} />)}
        </Bloc>
      </Grille>
      <Acces onNaviguer={onNaviguer} liens={[['virements', 'Reversements'], ['consolidation', 'Consolidation'], ['branches', 'Caisses des églises'], ['projetsNationaux', 'Projets du BEN'], ['projetsBranches', 'Projets des églises']]} />
    </div>
  )
}

// ── Conseiller ───────────────────────────────────────────────────────────────
export function AccueilConseiller({ profil, onNaviguer }) {
  const [dossiers, setDossiers] = useState([]); const [conflits, setConflits] = useState([])
  useEffect(() => ecoute(query(collection(db, 'dossiersConseil'), orderBy('creeLe', 'desc')), setDossiers), [])
  useEffect(() => ecoute(query(collection(db, 'conflitsMIGC'), orderBy('creeLe', 'desc')), setConflits), [])
  const ouverts = dossiers.filter((d) => d.statut !== 'clos'); const urgents = ouverts.filter((d) => d.priorite === 'haute')
  const enCours = conflits.filter((c) => c.etat !== 'resolu')
  return (
    <div className="tb">
      <Entete titre={`${salutation()}, ${profil.nom ?? 'Conseiller'}.`} sous="Conseil du Bureau Exécutif National" />
      <Chiffres>
        <Chiffre valeur={ouverts.length} label={ouverts.length > 1 ? 'Dossiers ouverts' : 'Dossier ouvert'} onClick={() => onNaviguer('dossiers')} />
        <Chiffre valeur={urgents.length} label="Priorité haute" alerte={urgents.length > 0} onClick={() => onNaviguer('dossiers')} />
        <Chiffre valeur={enCours.length} label={enCours.length > 1 ? 'Conflits en médiation' : 'Conflit en médiation'} onClick={() => onNaviguer('conflits')} />
        <Chiffre valeur={conflits.length - enCours.length} label="Conflits résolus" onClick={() => onNaviguer('conflits')} />
      </Chiffres>
      <Grille>
        <Bloc titre="Dossiers à traiter" pastille={ouverts.length}>
          {ouverts.length === 0 && <Vide>Aucun dossier ouvert.</Vide>}
          {[...ouverts].sort((a, b) => (a.priorite === 'haute' ? -1 : 0) - (b.priorite === 'haute' ? -1 : 0)).slice(0, 5).map((d) => <Ligne key={d.id} titre={d.titre} detail={d.priorite === 'haute' ? 'Priorité haute' : d.priorite === 'basse' ? 'Priorité basse' : 'Priorité normale'} onClick={() => onNaviguer('dossiers')} />)}
        </Bloc>
        <Bloc titre="Conflits en médiation" pastille={enCours.length}>
          {enCours.length === 0 && <Vide>Aucun conflit en cours.</Vide>}
          {enCours.slice(0, 5).map((c) => <Ligne key={c.id} titre={c.parties} detail={c.description?.slice(0, 80)} onClick={() => onNaviguer('conflits')} />)}
        </Bloc>
      </Grille>
      <Acces onNaviguer={onNaviguer} liens={[['dossiers', 'Dossiers de conseil'], ['conflits', 'Gestion des conflits'], ['notes', 'Notes confidentielles']]} />
    </div>
  )
}
