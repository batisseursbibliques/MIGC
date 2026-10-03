import React from 'react'

export default class FiletErreur extends React.Component {
  constructor(props) { super(props); this.state = { erreur: null } }
  static getDerivedStateFromError(erreur) { return { erreur } }
  componentDidCatch(erreur, info) { console.error('Erreur affichage', erreur, info) }
  render() {
    if (!this.state.erreur) return this.props.children
    return (
      <div style={{ maxWidth: 480, margin: '3rem auto', padding: '1.5rem', fontFamily: 'Inter, sans-serif', textAlign: 'center' }}>
        <h2 style={{ color: '#2A3A9B' }}>Un problème est survenu</h2>
        <p>La page n'a pas pu s'afficher. Rechargez l'application ; si le problème continue, envoyez le message ci-dessous à votre développeur.</p>
        <pre style={{ textAlign: 'left', whiteSpace: 'pre-wrap', background: '#F7F8FC', padding: '0.75rem', borderRadius: 8, fontSize: '0.8rem' }}>{String(this.state.erreur?.message ?? this.state.erreur)}</pre>
        <button onClick={() => window.location.reload()} style={{ background: '#2A3A9B', color: '#fff', border: 0, borderRadius: 8, padding: '0.6rem 1.2rem', fontSize: '1rem' }}>Recharger</button>
      </div>
    )
  }
}
