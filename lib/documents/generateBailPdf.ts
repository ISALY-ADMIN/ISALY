import { jsPDF } from 'jspdf'
import type { BailNonMeubleData } from '@/components/documents/BailNonMeubleForm'

export interface BailSignatureInput {
  name: string
  dataUrl: string | null
  signedAt: string | null
}

export interface BailSignaturesPayload {
  bailleur: BailSignatureInput
  locataire1: BailSignatureInput
  locataire2?: BailSignatureInput
}

const CLAUSE_SOLIDARITE = `Les preneurs sont tenus solidairement et indivisiblement de l'exécution de toutes les conditions du présent bail et du paiement des loyers, charges et accessoires, y compris après le départ de l'un d'entre eux, jusqu'à l'expiration du bail.`
const CLAUSE_RESOLUTOIRE = `À défaut de paiement au terme convenu de l'une quelconque des échéances de loyer ou de charges, ou en cas de non-versement du dépôt de garantie, le présent bail sera résilié de plein droit, deux mois après une mise en demeure restée infructueuse, conformément à l'article 24 de la loi du 6 juillet 1989.`

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

export function generateBailPdf(data: BailNonMeubleData, signatures: BailSignaturesPayload): jsPDF {
  const doc = new jsPDF()
  let y = 18

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(15)
  doc.setTextColor(17, 24, 39)
  doc.text('CONTRAT DE LOCATION/COLOCATION', 105, y, { align: 'center' })
  y += 5.5
  doc.text('LOGEMENT NON MEUBLÉ', 105, y, { align: 'center' })
  y += 5
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(107, 114, 128)
  doc.text('Loi n°89-462 du 6 juillet 1989', 105, y, { align: 'center' })
  y += 10

  // I. Désignation des parties
  y = addSection(doc, y, 'I. Désignation des parties')
  y = addRow(doc, y, 'Bailleur', data.bailleurNomPrenom)
  y = addRow(doc, y, 'Domicile / siège social', data.bailleurDomicile)
  y = addRow(doc, y, 'Qualité du bailleur', data.bailleurQualite)
  if (data.bailleurQualite === 'Personne morale') {
    y = addRow(doc, y, "Société civile entre parents jusqu'au 4e degré", data.bailleurSocieteCivileFamiliale ? 'Oui' : 'Non')
  }
  if (data.bailleurEmail) y = addRow(doc, y, 'Email du bailleur', data.bailleurEmail)
  if (data.mandataireActif) {
    y = addRow(doc, y, 'Mandataire', data.mandataireNom)
    y = addRow(doc, y, 'Adresse du mandataire', data.mandataireAdresse)
    y = addRow(doc, y, 'Activité du mandataire', data.mandataireActivite)
    y = addRow(doc, y, 'N° carte professionnelle', data.mandataireNumCarte)
  }
  if (data.garantNom) {
    y = addRow(doc, y, 'Garant', data.garantNom)
    y = addRow(doc, y, 'Adresse du garant', data.garantAdresse)
  }
  y = addRow(doc, y, 'Locataire 1', data.locataire1Nom)
  if (data.locataire1Email) y = addRow(doc, y, 'Email locataire 1', data.locataire1Email)
  if (data.locataire2Actif) {
    y = addRow(doc, y, 'Locataire 2', data.locataire2Nom)
    if (data.locataire2Email) y = addRow(doc, y, 'Email locataire 2', data.locataire2Email)
  }
  y += 4

  // II. Logement
  y = ensureSpace(doc, y)
  y = addSection(doc, y, 'II. Désignation du logement')
  y = addRow(doc, y, 'Adresse du logement', data.adresse)
  if (data.batiment) y = addRow(doc, y, 'Bâtiment / escalier / étage / porte', data.batiment)
  if (data.identifiantFiscal) y = addRow(doc, y, 'Identifiant fiscal', data.identifiantFiscal)
  y = addRow(doc, y, "Type d'immeuble", data.typeImmeuble)
  y = addRow(doc, y, 'Régime juridique', data.regimeJuridique)
  y = addRow(doc, y, 'Période de construction', data.periodeConstruction)
  y = addRow(doc, y, 'Surface habitable', `${data.surfaceHabitable} m²`)
  y = addRow(doc, y, 'Nombre de pièces principales', data.nbPiecesPrincipales)
  y = addRow(doc, y, 'Autres parties du logement', [...data.autresParties.filter(a => a !== 'Autre'), data.autresParties.includes('Autre') ? data.autrePartieTexte : ''].filter(Boolean).join(', ') || 'Aucune')
  y = addRow(doc, y, 'Équipements', [...data.equipements.filter(e => e !== 'Installations sanitaires' && e !== 'Autre'), data.equipements.includes('Installations sanitaires') ? `Installations sanitaires (${data.equipementSanitaireTexte})` : '', data.equipements.includes('Autre') ? data.equipementAutreTexte : ''].filter(Boolean).join(', ') || 'Aucun')
  y = addRow(doc, y, 'Chauffage', data.chauffageType === 'Collectif' ? `Collectif — ${data.chauffageModalites}` : 'Individuel')
  y = addRow(doc, y, 'Eau chaude', data.eauChaudeType === 'Collectif' ? `Collectif — ${data.eauChaudeModalites}` : 'Individuel')
  y = addRow(doc, y, 'DPE', data.dpe)
  y = addRow(doc, y, 'Destination des locaux', data.destination)
  y = addRow(doc, y, 'Locaux privatifs accessoires', [...data.locauxPrivatifs.filter(l => l !== 'Autre'), data.locauxPrivatifsNumeros ? `n° ${data.locauxPrivatifsNumeros}` : '', data.locauxPrivatifs.includes('Autre') ? data.locauxPrivatifsAutreTexte : ''].filter(Boolean).join(', ') || 'Aucun')
  y = addRow(doc, y, 'Locaux communs', [...data.locauxCommuns.filter(l => l !== 'Autre'), data.locauxCommuns.includes('Autre') ? data.locauxCommunsAutreTexte : ''].filter(Boolean).join(', ') || 'Aucun')
  if (data.equipementTic) y = addRow(doc, y, 'Équipement TIC', data.equipementTic)
  y += 4

  // III. Durée
  y = ensureSpace(doc, y)
  y = addSection(doc, y, 'III. Durée du contrat')
  y = addRow(doc, y, "Date de prise d'effet", data.dateEffet)
  y = addRow(doc, y, 'Durée', data.dureeType)
  if (data.dureeType === 'Durée réduite') {
    y = addRow(doc, y, "Nombre d'années", data.dureeReduiteAnnees)
    y = addRow(doc, y, 'Événement justificatif', data.dureeReduiteEvenement)
  }
  y += 4

  // IV. Conditions financières
  y = ensureSpace(doc, y)
  y = addSection(doc, y, 'IV. Conditions financières')
  y = addRow(doc, y, 'Loyer mensuel', `${data.loyerMensuel} €`)
  y = addRow(doc, y, 'Zone tendue', data.zoneTendue ? 'Oui' : 'Non')
  if (data.zoneTendue) {
    y = addRow(doc, y, "Soumis au décret d'encadrement", data.soumisDecretEncadrement ? 'Oui' : 'Non')
    y = addRow(doc, y, 'Loyer de référence', `${data.loyerReference} €/m²`)
    y = addRow(doc, y, 'Loyer de référence majoré', `${data.loyerReferenceMajore} €/m²`)
    if (data.complementLoyerActif) {
      y = addRow(doc, y, 'Complément de loyer', `${data.complementLoyerMontant} € — ${data.complementLoyerJustification}`)
    }
  }
  if (data.precedentLocataireMoins18Mois) {
    y = addRow(doc, y, 'Précédent locataire (< 18 mois)', `${data.dernierLoyerMontant} € versé le ${data.dernierLoyerDateVersement}, dernière révision le ${data.derniereRevisionDate}`)
  }
  y = addRow(doc, y, 'Révision du loyer', `Le ${data.revisionDateAnnuelle} — IRL ${data.revisionTrimestreIRL}`)
  y = addRow(doc, y, 'Charges récupérables', `${data.chargesModalite} — ${data.chargesMontant} €`)
  if (data.contributionPartageActif) {
    y = addRow(doc, y, 'Contribution partage économies de charges', `${data.contributionPartageMontant} € pendant ${data.contributionPartageDuree} — ${data.contributionPartageJustification}`)
  }
  if (data.assuranceCompteColocatairesActif) {
    const mensuel = data.assuranceAnnuelle ? (parseFloat(data.assuranceAnnuelle) / 12).toFixed(2) : '0.00'
    y = addRow(doc, y, 'Assurance pour compte des colocataires', `${data.assuranceAnnuelle} €/an (${mensuel} €/mois)`)
  }
  const assuranceMensuelle = data.assuranceCompteColocatairesActif && data.assuranceAnnuelle ? parseFloat(data.assuranceAnnuelle) / 12 : 0
  const totalMensuel = (parseFloat(data.loyerMensuel) || 0) + (parseFloat(data.chargesMontant) || 0) + (parseFloat(data.contributionPartageMontant) || 0) + assuranceMensuelle
  y = addRow(doc, y, "Jour d'exigibilité", data.jourExigibilite)
  y = addRow(doc, y, 'Total mensuel dû', `${totalMensuel.toFixed(2)} €`)
  y += 4

  // V. Travaux
  const hasTravaux = data.travauxAmeliorationTexte || data.majorationTravauxNature || data.diminutionTravauxNature
  if (hasTravaux) {
    y = ensureSpace(doc, y)
    y = addSection(doc, y, 'V. Travaux')
    if (data.travauxAmeliorationTexte) y = addRow(doc, y, "Travaux d'amélioration récents", `${data.travauxAmeliorationTexte} — ${data.travauxAmeliorationMontant} €`)
    if (data.majorationTravauxNature) y = addRow(doc, y, 'Majoration suite travaux bailleur', `${data.majorationTravauxNature} — ${data.majorationTravauxMontant} €`)
    if (data.diminutionTravauxNature) y = addRow(doc, y, 'Diminution suite travaux locataire', `${data.diminutionTravauxNature} — ${data.diminutionTravauxMontant} € pendant ${data.diminutionTravauxDuree}`)
    y += 4
  }

  // VI. Garanties et clauses
  y = ensureSpace(doc, y, 60)
  y = addSection(doc, y, 'VI. Garanties et clauses')
  y = addRow(doc, y, 'Dépôt de garantie', `${data.depotGarantie} €${data.depotGarantieLettres ? ` (${data.depotGarantieLettres})` : ''}`)
  y += 2
  y = addParagraph(doc, y, `Clause de solidarité — ${CLAUSE_SOLIDARITE}`)
  y = ensureSpace(doc, y, 40)
  y = addParagraph(doc, y, `Clause résolutoire — ${CLAUSE_RESOLUTOIRE}`)

  // VII. Honoraires de location
  if (data.mandataireActif) {
    y = ensureSpace(doc, y)
    y = addSection(doc, y, 'VII. Honoraires de location')
    y = addRow(doc, y, 'Plafond visite / dossier / rédaction', `${data.honorairesPlafondVisiteDossierRedaction} €/m²`)
    y = addRow(doc, y, "Plafond état des lieux", `${data.honorairesPlafondEtatLieux} €/m²`)
    if (data.honorairesBailleurDetail) y = addRow(doc, y, 'Honoraires à la charge du bailleur', data.honorairesBailleurDetail)
    if (data.honorairesLocataireDetail) y = addRow(doc, y, 'Honoraires à la charge du locataire', data.honorairesLocataireDetail)
    y += 4
  }

  // VIII. Conditions particulières
  if (data.conditionsParticulieres) {
    y = ensureSpace(doc, y)
    y = addSection(doc, y, 'VIII. Conditions particulières')
    y = addParagraph(doc, y, data.conditionsParticulieres)
  }

  // IX. Annexes
  y = ensureSpace(doc, y)
  y = addSection(doc, y, 'IX. Annexes')
  y = addParagraph(doc, y, data.annexes.length > 0 ? data.annexes.join(', ') : 'Aucune annexe jointe')

  // Signatures
  y = ensureSpace(doc, y, 80)
  y = addSection(doc, y, 'Signatures')
  const signers = [signatures.bailleur, signatures.locataire1, ...(signatures.locataire2 ? [signatures.locataire2] : [])]
  const colWidth = signers.length > 1 ? 90 : 180
  signers.forEach((signer, i) => {
    const x = 15 + i * colWidth
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(75, 85, 99)
    doc.text(`${signer.name || '—'} — Lu et approuvé`, x, y)
    let imgY = y + 4
    if (signer.dataUrl) {
      doc.addImage(signer.dataUrl, 'PNG', x, imgY, 70, 26)
      imgY += 28
    } else {
      imgY += 28
    }
    doc.setFontSize(8)
    doc.setTextColor(156, 163, 175)
    doc.text(signer.signedAt ? `Signé le ${new Date(signer.signedAt).toLocaleString('fr-FR')}` : 'Non signé', x, imgY)
  })
  y += 38
  doc.setFontSize(8)
  doc.setTextColor(156, 163, 175)
  y = ensureSpace(doc, y, 10)
  doc.text(`Document généré le ${new Date().toLocaleDateString('fr-FR')} via ISALY`, 15, y)

  return doc
}
