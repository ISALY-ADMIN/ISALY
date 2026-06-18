import { jsPDF } from 'jspdf'

export interface BailFormData {
  bailleurNom: string
  bailleurAdresse: string
  locataireNoms: string
  garantNom: string
  mandataireNom: string

  adresse: string
  surface: string
  nbPieces: string
  periodeConstruction: string
  equipements: string[]
  dpe: string

  dateEffet: string
  duree: string
  evenementJustificatif: string

  loyerMensuel: string
  chargesType: string
  chargesMontant: string
  depotGarantie: string
  dateExigibilite: string
  zoneTendue: string
  loyerReference: string

  travaux: string

  conditionsParticulieres: string
  annexes: string[]
}

const CLAUSE_SOLIDARITE = `Les preneurs sont tenus solidairement et indivisiblement de l'exécution de toutes les conditions du présent bail et du paiement des loyers, charges et accessoires, y compris après le départ de l'un d'entre eux, jusqu'à l'expiration du bail.`
const CLAUSE_RESOLUTOIRE = `À défaut de paiement au terme convenu de l'une quelconque des échéances de loyer ou de charges, ou en cas de non-versement du dépôt de garantie, le présent bail sera résilié de plein droit, deux mois après une mise en demeure restée infructueuse, conformément à l'article 24 de la loi du 6 juillet 1989.`
const CLAUSE_HONORAIRES = `Les honoraires de location dus par le bailleur et, le cas échéant, par le locataire au titre des prestations mentionnées à l'article 5 de la loi du 6 juillet 1989 sont répartis conformément aux dispositions réglementaires en vigueur.`

function addSection(doc: jsPDF, y: number, title: string): number {
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(17, 24, 39)
  doc.text(title, 15, y)
  doc.setDrawColor(78, 203, 160)
  doc.setLineWidth(0.5)
  doc.line(15, y + 1.5, 195, y + 1.5)
  return y + 8
}

function addRow(doc: jsPDF, y: number, label: string, value: string): number {
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9.5)
  doc.setTextColor(107, 114, 128)
  doc.text(label, 15, y)
  doc.setTextColor(17, 24, 39)
  const lines = doc.splitTextToSize(value || '—', 110)
  doc.text(lines, 80, y)
  return y + Math.max(6, lines.length * 5)
}

function addParagraph(doc: jsPDF, y: number, text: string): number {
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(75, 85, 99)
  const lines = doc.splitTextToSize(text, 180)
  doc.text(lines, 15, y)
  return y + lines.length * 4.2 + 4
}

function ensureSpace(doc: jsPDF, y: number, needed = 30): number {
  if (y > 270 - needed) {
    doc.addPage()
    return 20
  }
  return y
}

export function generateBailPdf(data: BailFormData, signatures: { bailleur: string | null; locataire: string | null }): jsPDF {
  const doc = new jsPDF()
  let y = 18

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.setTextColor(17, 24, 39)
  doc.text('CONTRAT DE LOCATION', 105, y, { align: 'center' })
  y += 5
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(107, 114, 128)
  doc.text('Logement non meublé — Loi n°89-462 du 6 juillet 1989', 105, y, { align: 'center' })
  y += 10

  y = addSection(doc, y, 'I. Désignation des parties')
  y = addRow(doc, y, 'Bailleur', data.bailleurNom)
  y = addRow(doc, y, 'Adresse du bailleur', data.bailleurAdresse)
  y = addRow(doc, y, 'Locataire(s)', data.locataireNoms)
  if (data.garantNom) y = addRow(doc, y, 'Garant', data.garantNom)
  if (data.mandataireNom) y = addRow(doc, y, 'Mandataire', data.mandataireNom)
  y += 4

  y = ensureSpace(doc, y)
  y = addSection(doc, y, 'II. Objet du contrat')
  y = addRow(doc, y, 'Adresse du logement', data.adresse)
  y = addRow(doc, y, 'Surface habitable', `${data.surface} m²`)
  y = addRow(doc, y, 'Nombre de pièces', data.nbPieces)
  y = addRow(doc, y, 'Période de construction', data.periodeConstruction)
  y = addRow(doc, y, 'Équipements', data.equipements.join(', ') || 'Aucun')
  y = addRow(doc, y, 'DPE', data.dpe)
  y += 4

  y = ensureSpace(doc, y)
  y = addSection(doc, y, 'III. Durée du contrat')
  y = addRow(doc, y, "Date de prise d'effet", data.dateEffet)
  y = addRow(doc, y, 'Durée', data.duree)
  if (data.evenementJustificatif) y = addRow(doc, y, 'Événement justificatif', data.evenementJustificatif)
  y += 4

  y = ensureSpace(doc, y)
  y = addSection(doc, y, 'IV. Conditions financières')
  y = addRow(doc, y, 'Loyer mensuel', `${data.loyerMensuel} €`)
  y = addRow(doc, y, 'Charges', `${data.chargesType} — ${data.chargesMontant} €`)
  y = addRow(doc, y, 'Dépôt de garantie', `${data.depotGarantie} €`)
  y = addRow(doc, y, "Date d'exigibilité du loyer", data.dateExigibilite)
  y = addRow(doc, y, 'Zone tendue', data.zoneTendue)
  if (data.zoneTendue === 'Oui') y = addRow(doc, y, 'Loyer de référence', `${data.loyerReference} €`)
  y += 4

  if (data.travaux) {
    y = ensureSpace(doc, y)
    y = addSection(doc, y, 'V. Travaux')
    y = addParagraph(doc, y, data.travaux)
  }

  y = ensureSpace(doc, y)
  y = addSection(doc, y, 'VI. Garanties')
  y = addRow(doc, y, 'Montant du dépôt de garantie', `${data.depotGarantie} €`)
  y += 4

  y = ensureSpace(doc, y, 60)
  y = addSection(doc, y, 'VII. Clause de solidarité')
  y = addParagraph(doc, y, CLAUSE_SOLIDARITE)

  y = ensureSpace(doc, y, 60)
  y = addSection(doc, y, 'VIII. Clause résolutoire')
  y = addParagraph(doc, y, CLAUSE_RESOLUTOIRE)

  y = ensureSpace(doc, y, 40)
  y = addSection(doc, y, 'IX. Honoraires de location')
  y = addParagraph(doc, y, CLAUSE_HONORAIRES)

  if (data.conditionsParticulieres) {
    y = ensureSpace(doc, y)
    y = addSection(doc, y, 'X. Conditions particulières')
    y = addParagraph(doc, y, data.conditionsParticulieres)
  }

  y = ensureSpace(doc, y)
  y = addSection(doc, y, 'XI. Annexes')
  y = addParagraph(doc, y, data.annexes.length > 0 ? data.annexes.join(', ') : 'Aucune annexe jointe')

  // Signatures
  y = ensureSpace(doc, y, 70)
  y = addSection(doc, y, 'Signatures')
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(75, 85, 99)
  doc.text('Le bailleur — Lu et approuvé', 15, y)
  doc.text('Le locataire — Lu et approuvé', 110, y)
  y += 4
  if (signatures.bailleur) doc.addImage(signatures.bailleur, 'PNG', 15, y, 70, 26)
  if (signatures.locataire) doc.addImage(signatures.locataire, 'PNG', 110, y, 70, 26)
  y += 30
  doc.setFontSize(8)
  doc.setTextColor(156, 163, 175)
  doc.text(`Document généré le ${new Date().toLocaleDateString('fr-FR')} via ISALY`, 15, y)

  return doc
}
