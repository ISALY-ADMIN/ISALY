import type { BlogArticle } from './types'

export const droitsLocataireColocation: BlogArticle = {
  slug: 'droits-locataire-colocation',
  title: 'Vos droits en tant que locataire en colocation',
  category: 'Droits',
  date: '2026-06-22',
  excerpt: 'Loi 89, bail individuel ou collectif, dépôt de garantie, préavis, clause de solidarité : le point complet sur vos droits de colocataire.',
  keywords: ['droits colocataire', 'loi 89 colocation', 'bail colocation', 'dépôt de garantie colocation', 'préavis colocation', 'clause de solidarité'],
  emoji: '⚖️',
  related: ['rediger-bail-colocation', 'guide-colocation-paris', 'comment-choisir-colocataire'],
  blocks: [
    { type: 'p', text: 'La colocation n’est pas une zone de non-droit : elle est encadrée par la loi du 6 juillet 1989, la même qui protège tous les locataires en France, complétée par la loi ALUR de 2014 qui a donné à la colocation une définition légale précise. Pourtant, beaucoup de colocataires ignorent leurs droits les plus élémentaires. Ce guide fait le point.' },

    { type: 'h2', text: 'Bail unique ou baux individuels : deux régimes très différents' },
    { type: 'h3', text: 'Le bail unique (collectif)' },
    { type: 'p', text: 'Tous les colocataires signent le même contrat. Vous êtes collectivement responsables du logement et, presque toujours, une clause de solidarité vous engage à payer le loyer entier si un colocataire fait défaut. Depuis la loi ALUR, cette solidarité prend fin au maximum six mois après le départ d’un colocataire (si un remplaçant n’a pas repris le bail avant). Point important : le congé donné par un seul colocataire ne met pas fin au bail pour les autres.' },
    { type: 'h3', text: 'Les baux individuels' },
    { type: 'p', text: 'Chaque colocataire signe son propre contrat avec le propriétaire, pour sa chambre et l’usage des parties communes. Pas de solidarité : si votre voisin de chambre ne paie pas, cela ne vous concerne pas juridiquement. Votre chambre doit alors faire au minimum 9 m² et 20 m³, les parties communes étant partagées. C’est le régime le plus protecteur pour le colocataire.' },

    { type: 'h2', text: 'Le dépôt de garantie : montants et restitution' },
    { type: 'ul', items: [
      'Location vide : maximum 1 mois de loyer hors charges.',
      'Location meublée : maximum 2 mois de loyer hors charges.',
      'Restitution : 1 mois après la remise des clés si l’état des lieux de sortie est conforme à celui d’entrée, 2 mois sinon.',
      'Pénalité de retard : 10 % du loyer mensuel par mois de retard entamé — beaucoup de locataires l’ignorent et ne la réclament jamais.',
    ] },
    { type: 'p', text: 'En bail unique, le dépôt est global : le propriétaire n’est tenu de le restituer qu’au départ du dernier colocataire. Organisez le remboursement entre vous lors des changements de colocataires — et documentez-le par écrit.' },

    { type: 'h2', text: 'Préavis : combien de temps avant de partir ?' },
    { type: 'p', text: 'Le préavis standard est de trois mois pour une location vide et d’un mois pour un meublé. Il tombe à un mois pour une location vide dans les cas suivants :' },
    { type: 'ul', items: [
      'Logement situé en zone tendue (Paris, Lyon, Marseille, Bordeaux, Lille et la plupart des grandes agglomérations).',
      'Mutation professionnelle, perte d’emploi ou premier emploi.',
      'État de santé justifiant un changement de domicile.',
      'Bénéficiaire du RSA ou de l’AAH.',
    ] },
    { type: 'p', text: 'Le congé doit être notifié par lettre recommandée avec accusé de réception, par acte d’huissier ou remis en main propre contre récépissé. Un simple message au propriétaire n’a aucune valeur juridique.' },

    { type: 'h2', text: 'Vos droits au quotidien' },
    { type: 'h3', text: 'Un logement décent' },
    { type: 'p', text: 'Le propriétaire doit fournir un logement sans risque pour la santé et la sécurité : pas d’humidité excessive, chauffage fonctionnel, installation électrique aux normes, surface minimale respectée. En cas de manquement, mettez-le en demeure par écrit ; sans réaction, la commission départementale de conciliation puis le juge peuvent imposer les travaux, voire réduire le loyer.' },
    { type: 'h3', text: 'Les quittances de loyer' },
    { type: 'p', text: 'La quittance est gratuite et obligatoire dès que vous la demandez. Elle est indispensable pour vos dossiers futurs (elle prouve que vous payez), pour les APL et pour certaines démarches administratives.' },
    { type: 'h3', text: 'La vie privée' },
    { type: 'p', text: 'Le propriétaire ne peut pas entrer dans le logement sans votre accord, ni imposer des visites hors cadre légal (relocation ou vente, maximum 2 heures par jour ouvrable). Une clause qui l’autoriserait à entrer librement est réputée non écrite.' },

    { type: 'h2', text: 'APL en colocation : oui, chacun y a droit' },
    { type: 'p', text: 'Chaque colocataire peut percevoir les APL individuellement, à condition que son nom figure sur le bail. Le montant est calculé sur votre quote-part de loyer. C’est une raison de plus d’exiger que tous les occupants soient officiellement sur le contrat — un colocataire "officieux" n’a droit à rien.' },

    { type: 'h2', text: 'En résumé' },
    { type: 'p', text: 'Exigez un bail écrit où figure votre nom, vérifiez la clause de solidarité, faites un état des lieux minutieux, demandez vos quittances et ne versez jamais plus que le dépôt de garantie légal. Sur ISALY, les baux de colocation sont générés conformes à la loi de 1989 et signés électroniquement — chaque colocataire garde une copie et les quittances sont automatiques.' },
  ],
}
