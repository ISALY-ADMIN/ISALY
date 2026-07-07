import { jsPDF } from 'jspdf'

/** Générateurs jsPDF : quittance de loyer, avenant au bail, modèles vierges (EDL, attestation assurance). */

const INK = [17, 24, 39] as const
const GREY = [107, 114, 128] as const
const MINT = [16, 185, 129] as const

function title(doc: jsPDF, text: string, sub?: string): number {
  doc.setFont('helvetica', 'bold'); doc.setFontSize(15); doc.setTextColor(...INK)
  doc.text(text, 105, 20, { align: 'center' })
  if (sub) {
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(...GREY)
    doc.text(sub, 105, 26, { align: 'center' })
  }
  doc.setDrawColor(...MINT); doc.setLineWidth(0.6); doc.line(15, 30, 195, 30)
  return 40
}

function row(doc: jsPDF, y: number, label: string, value: string): number {
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(...GREY)
  doc.text(label, 15, y)
  doc.setFont('helvetica', 'bold'); doc.setTextColor(...INK)
  const lines = doc.splitTextToSize(value || '—', 105)
  doc.text(lines, 85, y)
  return y + Math.max(7, lines.length * 5.5)
}

function paragraph(doc: jsPDF, y: number, text: string, size = 9.5): number {
  doc.setFont('helvetica', 'normal'); doc.setFontSize(size); doc.setTextColor(75, 85, 99)
  const lines = doc.splitTextToSize(text, 180)
  doc.text(lines, 15, y)
  return y + lines.length * 4.6 + 5
}

function footer(doc: jsPDF, y: number) {
  doc.setFontSize(8); doc.setTextColor(156, 163, 175)
  doc.text(`Document généré le ${new Date().toLocaleDateString('fr-FR')} via ISALY`, 15, Math.max(y, 280))
}

// ── Quittance de loyer ────────────────────────────────────────────

export interface QuittanceData {
  bailleurNom: string
  bailleurAdresse: string
  locataireNom: string
  adresseLogement: string
  moisLabel: string // ex: "juillet 2026"
  loyerHC: number
  charges: number
  lieu: string
}

export function generateQuittancePdf(q: QuittanceData): jsPDF {
  const doc = new jsPDF()
  let y = title(doc, 'QUITTANCE DE LOYER', `Période : ${q.moisLabel}`)

  y = row(doc, y, 'Bailleur', q.bailleurNom)
  if (q.bailleurAdresse) y = row(doc, y, 'Adresse du bailleur', q.bailleurAdresse)
  y = row(doc, y, 'Locataire', q.locataireNom)
  y = row(doc, y, 'Logement loué', q.adresseLogement)
  y += 6

  const total = q.loyerHC + q.charges
  y = paragraph(doc, y,
    `Je soussigné(e) ${q.bailleurNom}, bailleur, donne quittance à ${q.locataireNom} pour la somme de ` +
    `${total.toLocaleString('fr-FR')} euros, au titre du loyer et des charges du logement désigné ci-dessus ` +
    `pour la période de ${q.moisLabel}, et déclare que le locataire est à jour de ses paiements pour cette période.`, 10.5)
  y += 4

  y = row(doc, y, 'Loyer hors charges', `${q.loyerHC.toLocaleString('fr-FR')} €`)
  y = row(doc, y, 'Provisions pour charges', `${q.charges.toLocaleString('fr-FR')} €`)
  doc.setDrawColor(229, 231, 235); doc.line(15, y - 2, 195, y - 2)
  y += 3
  y = row(doc, y, 'TOTAL', `${total.toLocaleString('fr-FR')} €`)
  y += 14

  doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(...INK)
  doc.text(`Fait à ${q.lieu || '________________'}, le ${new Date().toLocaleDateString('fr-FR')}`, 15, y)
  y += 10
  doc.setTextColor(...GREY); doc.setFontSize(9)
  doc.text('Signature du bailleur :', 15, y)
  doc.setDrawColor(209, 213, 219); doc.rect(15, y + 3, 70, 24)

  y = paragraph(doc, y + 36,
    'Cette quittance annule tous les reçus qui auraient pu être établis précédemment en cas de paiement partiel ' +
    'du montant ci-dessus. Elle est à conserver pendant trois ans par le locataire (article 7-1 de la loi n°89-462).', 8)
  footer(doc, y)
  return doc
}

// ── Avenant au bail ───────────────────────────────────────────────

export interface AvenantData {
  bailleurNom: string
  locataireNom: string
  adresseLogement: string
  dateBail: string
  objet: string
  modifications: string
}

export function generateAvenantPdf(a: AvenantData): jsPDF {
  const doc = new jsPDF()
  let y = title(doc, 'AVENANT AU CONTRAT DE LOCATION', 'Loi n°89-462 du 6 juillet 1989')

  y = row(doc, y, 'Bailleur', a.bailleurNom)
  y = row(doc, y, 'Locataire', a.locataireNom)
  y = row(doc, y, 'Logement concerné', a.adresseLogement)
  y = row(doc, y, 'Bail initial', a.dateBail ? `Contrat prenant effet le ${a.dateBail}` : '—')
  y += 6

  doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(...INK)
  doc.text("Objet de l'avenant", 15, y); y += 6
  y = paragraph(doc, y, a.objet || '—', 10.5)

  doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(...INK)
  doc.text('Modifications convenues', 15, y); y += 6
  y = paragraph(doc, y, a.modifications || '—', 10.5)

  y = paragraph(doc, y + 2,
    'Toutes les autres clauses et conditions du bail initial demeurent inchangées et continuent de produire ' +
    'leurs pleins et entiers effets. Le présent avenant fait partie intégrante du contrat de location.', 9.5)
  y += 8

  doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(...INK)
  doc.text(`Fait le ${new Date().toLocaleDateString('fr-FR')}, en deux exemplaires originaux.`, 15, y)
  y += 10
  doc.setTextColor(...GREY); doc.setFontSize(9)
  doc.text('Le bailleur — Lu et approuvé', 15, y)
  doc.text('Le locataire — Lu et approuvé', 110, y)
  doc.setDrawColor(209, 213, 219)
  doc.rect(15, y + 3, 70, 24)
  doc.rect(110, y + 3, 70, 24)
  footer(doc, y + 36)
  return doc
}

// ── Modèles vierges ───────────────────────────────────────────────

export function generateQuittanceModele(): jsPDF {
  return generateQuittancePdf({
    bailleurNom: '________________________________',
    bailleurAdresse: '________________________________',
    locataireNom: '________________________________',
    adresseLogement: '________________________________',
    moisLabel: '____________ 20____',
    loyerHC: 0,
    charges: 0,
    lieu: '',
  })
}

export function generateEdlModele(): jsPDF {
  const doc = new jsPDF()
  let y = title(doc, "ÉTAT DES LIEUX D'ENTRÉE", 'À annexer au contrat de location — loi n°89-462')
  y = row(doc, y, 'Bailleur', '________________________________')
  y = row(doc, y, 'Locataire(s)', '________________________________')
  y = row(doc, y, 'Adresse du logement', '________________________________')
  y = row(doc, y, "Date de l'état des lieux", '____ / ____ / ________')
  y = row(doc, y, 'Relevé compteur électricité', '________________')
  y = row(doc, y, 'Relevé compteur eau', '________________')
  y = row(doc, y, 'Relevé compteur gaz', '________________')
  y = row(doc, y, 'Nombre de clés remises', '________________')
  y += 4

  const pieces = ['Entrée', 'Séjour', 'Cuisine', 'Chambre 1', 'Chambre 2', 'Salle de bain', 'WC', 'Autre']
  for (const piece of pieces) {
    if (y > 245) { doc.addPage(); y = 20 }
    doc.setFont('helvetica', 'bold'); doc.setFontSize(10.5); doc.setTextColor(...INK)
    doc.text(piece, 15, y); y += 5
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(...GREY)
    doc.text('Sols / Murs / Plafonds / Équipements — état (neuf, bon, usagé, mauvais) et observations :', 15, y); y += 3
    doc.setDrawColor(209, 213, 219); doc.rect(15, y, 180, 16); y += 22
  }
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(...GREY)
  if (y > 250) { doc.addPage(); y = 20 }
  doc.text('Signature du bailleur', 15, y)
  doc.text('Signature du locataire', 110, y)
  doc.setDrawColor(209, 213, 219)
  doc.rect(15, y + 3, 70, 24)
  doc.rect(110, y + 3, 70, 24)
  footer(doc, y + 36)
  return doc
}

export function generateAttestationAssuranceModele(): jsPDF {
  const doc = new jsPDF()
  let y = title(doc, "ATTESTATION D'ASSURANCE HABITATION", 'Modèle à faire compléter par votre assureur')
  y = paragraph(doc, y,
    "Je soussigné(e) ______________________________, représentant la compagnie d'assurance " +
    '______________________________, atteste que :', 10.5)
  y = row(doc, y + 2, 'Assuré(e)', '________________________________')
  y = row(doc, y, 'Adresse du logement assuré', '________________________________')
  y = row(doc, y, 'N° de contrat', '________________________________')
  y = row(doc, y, 'Période de validité', 'du ____ / ____ / ________ au ____ / ____ / ________')
  y += 4
  y = paragraph(doc, y,
    "est titulaire d'un contrat d'assurance couvrant les risques locatifs (incendie, dégâts des eaux, " +
    "explosion) pour le logement désigné ci-dessus, conformément à l'article 7 g) de la loi n°89-462 " +
    'du 6 juillet 1989.', 10.5)
  y += 8
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(...INK)
  doc.text('Fait à ________________, le ____ / ____ / ________', 15, y)
  y += 10
  doc.setTextColor(...GREY); doc.setFontSize(9)
  doc.text("Cachet et signature de l'assureur :", 15, y)
  doc.setDrawColor(209, 213, 219); doc.rect(15, y + 3, 80, 28)
  footer(doc, y + 40)
  return doc
}
