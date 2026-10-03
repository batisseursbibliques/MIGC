// Export PDF des registres et documents de la MIGC (généré dans le navigateur, rien n'est envoyé sur Internet).
import { LOGO_MIGC } from '../assets/logo-migc.js'

const NOM_ORG = 'Mission Internationale de la Gloire de Christ (MIGC)'
const BLEU = [42, 58, 155]
const GRIS = [90, 95, 120]

export const dateFr = (v) => {
  if (!v) return '—'
  const d = v?.toDate ? v.toDate() : /^\d{4}-\d{2}-\d{2}$/.test(String(v)) ? new Date(`${v}T00:00`) : new Date(v)
  return isNaN(d) ? '—' : d.toLocaleDateString('fr-FR')
}
export const fcfa = (n) => `${Math.round(Number(n) || 0).toLocaleString('fr-FR').replace(/[\u202f\u00a0]/g, ' ')} FCFA`
const propre = (s) => String(s ?? '').replace(/[\u202f\u00a0\u2009]/g, ' ')
const slug = (s) => propre(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase()

async function charger() {
  const [{ jsPDF }, autoTable] = await Promise.all([import('jspdf'), import('jspdf-autotable')])
  return { jsPDF, autoTable: autoTable.default ?? autoTable.autoTable }
}

function entete(doc, { titre, sousTitre, eglise }) {
  const L = doc.internal.pageSize.getWidth()
  try { doc.addImage(LOGO_MIGC, 'PNG', 14, 10, 20, 20) } catch { /* logo facultatif */ }
  doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(...BLEU)
  doc.text(NOM_ORG, 38, 18)
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(...GRIS)
  doc.text(eglise ? propre(eglise) : 'Siège : Dégakon, Cotonou (Bénin)', 38, 24)
  doc.setDrawColor(...BLEU); doc.setLineWidth(0.6); doc.line(14, 33, L - 14, 33)
  doc.setFont('helvetica', 'bold'); doc.setFontSize(16); doc.setTextColor(20, 24, 69)
  const lignes = doc.splitTextToSize(propre(titre), L - 28)
  doc.text(lignes, 14, 43)
  let y = 43 + lignes.length * 7
  if (sousTitre) { doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(...GRIS); doc.text(propre(sousTitre), 14, y); y += 6 }
  return y + 2
}

function pieds(doc) {
  const n = doc.internal.getNumberOfPages(); const L = doc.internal.pageSize.getWidth(); const H = doc.internal.pageSize.getHeight()
  const quand = new Date().toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'short' })
  for (let i = 1; i <= n; i++) {
    doc.setPage(i); doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(...GRIS)
    doc.setDrawColor(200, 204, 225); doc.setLineWidth(0.2); doc.line(14, H - 13, L - 14, H - 13)
    doc.text(`Document généré le ${propre(quand)}`, 14, H - 8)
    doc.text(`Page ${i} / ${n}`, L - 14, H - 8, { align: 'right' })
  }
}

// Registre sous forme de tableau
// colonnes : [{ titre, valeur: (ligne) => texte, largeur?: nombre, align?: 'right' }]
export async function exporterTableau({ titre, sousTitre, eglise, colonnes, lignes, resume = [], paysage, nomFichier }) {
  const { jsPDF, autoTable } = await charger()
  const doc = new jsPDF({ orientation: paysage ?? colonnes.length > 5 ? 'landscape' : 'portrait', unit: 'mm', format: 'a4' })
  let y = entete(doc, { titre, sousTitre, eglise })
  if (resume.length) {
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(20, 24, 69)
    resume.forEach(([k, v]) => { doc.text(`${propre(k)} : ${propre(v)}`, 14, y); y += 5.5 })
    y += 2
  }
  autoTable(doc, {
    startY: y,
    head: [colonnes.map((c) => propre(c.titre))],
    body: lignes.length ? lignes.map((l) => colonnes.map((c) => propre(c.valeur(l)))) : [[{ content: 'Aucune écriture enregistrée.', colSpan: colonnes.length, styles: { halign: 'center', textColor: GRIS } }]],
    styles: { font: 'helvetica', fontSize: 9, cellPadding: 2, overflow: 'linebreak', valign: 'top' },
    headStyles: { fillColor: BLEU, textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [244, 245, 252] },
    columnStyles: Object.fromEntries(colonnes.map((c, i) => [i, { ...(c.largeur ? { cellWidth: c.largeur } : {}), ...(c.align ? { halign: c.align } : {}) }])),
    margin: { top: 38, left: 14, right: 14, bottom: 18 },
    didDrawPage: (d) => { if (d.pageNumber > 1) { doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(...BLEU); doc.text(propre(titre), 14, 20) } },
  })
  pieds(doc)
  doc.save(`${slug(nomFichier || titre)}-${new Date().toISOString().slice(0, 10)}.pdf`)
}

// Document rédigé (message, procès-verbal…) : une suite de rubriques
// infos : [[étiquette, valeur]] ; rubriques : [{ titre, texte }]
export async function exporterDocument({ titre, sousTitre, eglise, infos = [], rubriques = [], nomFichier }) {
  const { jsPDF } = await charger()
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const L = doc.internal.pageSize.getWidth(); const H = doc.internal.pageSize.getHeight()
  let y = entete(doc, { titre, sousTitre, eglise })
  const place = (h) => { if (y + h > H - 20) { doc.addPage(); y = 20 } }
  infos.filter(([, v]) => v).forEach(([k, v]) => {
    place(6); doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(20, 24, 69); doc.text(`${propre(k)} :`, 14, y)
    doc.setFont('helvetica', 'normal'); doc.text(propre(v), 14 + doc.getTextWidth(`${propre(k)} : `) + 1, y); y += 5.5
  })
  y += 3
  rubriques.filter((r) => r.texte && String(r.texte).trim()).forEach((r) => {
    place(14); doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(...BLEU); doc.text(propre(r.titre), 14, y); y += 6
    doc.setFont('helvetica', 'normal'); doc.setFontSize(11); doc.setTextColor(30, 30, 40)
    doc.splitTextToSize(propre(r.texte), L - 28).forEach((ligne) => { place(6); doc.text(ligne, 14, y); y += 5.6 })
    y += 4
  })
  pieds(doc)
  doc.save(`${slug(nomFichier || titre)}-${new Date().toISOString().slice(0, 10)}.pdf`)
}
