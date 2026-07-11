import type { BlogArticle } from './types'

export const redigerBailColocation: BlogArticle = {
  slug: 'rediger-bail-colocation',
  title: 'Comment rédiger un bail de colocation conforme à la loi',
  category: 'Droits',
  date: '2026-07-05',
  excerpt: 'Clauses obligatoires, clause de solidarité, annexes légales, pièges du bail type : le guide du bail de colocation conforme loi 89 et ALUR.',
  keywords: ['bail colocation', 'rédiger bail colocation', 'clause solidarité', 'contrat colocation', 'bail type loi 89', 'annexes bail'],
  emoji: '📝',
  related: ['droits-locataire-colocation', 'guide-colocation-paris', 'comment-choisir-colocataire'],
  blocks: [
    { type: 'p', text: 'Un bail de colocation mal rédigé, c’est la garantie de litiges : dépôt de garantie contesté, solidarité illimitée, charges floues, congés invalides. Depuis la loi ALUR, le bail d’habitation doit suivre un contrat type réglementaire — mais la colocation ajoute ses spécificités. Voici comment rédiger (ou vérifier) un bail de colocation solide, que vous soyez propriétaire ou colocataire.' },

    { type: 'h2', text: 'Choisir la structure : bail unique ou baux individuels' },
    { type: 'p', text: 'Avant de rédiger quoi que ce soit, tranchez la question structurelle. Le bail unique est plus simple à gérer (un contrat, un loyer global) et sécurise le propriétaire via la solidarité. Les baux individuels — un contrat par chambre avec jouissance des parties communes — protègent mieux chaque colocataire et facilitent les entrées/sorties, mais imposent une chambre d’au moins 9 m² et 20 m³ par occupant. En pratique : bail unique pour les groupes d’amis constitués, baux individuels pour les colocations qui tournent.' },

    { type: 'h2', text: 'Les mentions obligatoires du bail (loi 89, art. 3)' },
    { type: 'ul', items: [
      'Identité complète du bailleur (ou de son mandataire) et de chaque colocataire signataire.',
      'Date de prise d’effet et durée : 3 ans minimum pour un bail vide (6 ans si bailleur personne morale), 1 an pour un meublé, 9 mois pour un bail étudiant meublé.',
      'Description du logement : surface habitable, nombre de pièces, équipements, annexes (cave, parking).',
      'Montant du loyer, modalités de paiement et de révision (indice IRL), et en zone tendue le loyer de référence majoré.',
      'Montant du dépôt de garantie : 1 mois hors charges maximum en vide, 2 mois en meublé.',
      'Modalités de récupération des charges : provisions avec régularisation annuelle, ou forfait (meublé uniquement).',
      'Montant du dernier loyer payé par le précédent locataire s’il a quitté le logement depuis moins de 18 mois.',
    ] },

    { type: 'h2', text: 'La clause de solidarité : à rédiger avec précision' },
    { type: 'p', text: 'C’est la clause la plus sensible du bail unique. Bien rédigée, elle précise que les colocataires (et leurs cautions) sont tenus solidairement du paiement du loyer et des charges. Depuis la loi ALUR, la solidarité d’un colocataire sortant s’éteint automatiquement : dès qu’un nouveau colocataire le remplace au bail, ou au plus tard six mois après la date d’effet de son congé. Une clause qui prévoirait une solidarité plus longue est réputée non écrite — inutile donc d’essayer.' },
    { type: 'quote', text: 'À vérifier avant de signer : la durée de solidarité après départ, le sort du dépôt de garantie en cas de remplacement, et la procédure d’agrément d’un nouveau colocataire.' },

    { type: 'h2', text: 'Les annexes obligatoires' },
    { type: 'ul', items: [
      'Dossier de diagnostic technique : DPE, constat de risque d’exposition au plomb, état des risques naturels et technologiques, diagnostic électricité/gaz si installation de plus de 15 ans.',
      'État des lieux d’entrée, établi contradictoirement — c’est lui qui protège le dépôt de garantie.',
      'Notice d’information sur les droits et obligations des locataires (arrêté du 29 mai 2015).',
      'Inventaire et état détaillé du mobilier pour un meublé (liste légale minimale du décret de 2015 : literie, plaques, four ou micro-ondes, réfrigérateur, vaisselle, luminaires, etc.).',
      'Extrait du règlement de copropriété le cas échéant.',
    ] },

    { type: 'h2', text: 'Les pièges classiques à éviter' },
    { type: 'h3', text: 'Côté colocataires' },
    { type: 'ul', items: [
      'Le colocataire absent du bail : sans son nom sur le contrat, aucun droit au maintien dans les lieux, aucune APL.',
      'Le forfait charges en location vide : illégal — en vide, seules les provisions avec régularisation sont permises.',
      'Les clauses abusives : interdiction de recevoir, visite libre du propriétaire, pénalités automatiques — réputées non écrites, mais mieux vaut les faire retirer avant signature.',
    ] },
    { type: 'h3', text: 'Côté propriétaire' },
    { type: 'ul', items: [
      'Oublier d’adapter la caution : chaque acte de cautionnement doit viser explicitement la solidarité pour être efficace.',
      'Négliger l’avenant lors d’un changement de colocataire : sans avenant, l’ancien reste engagé et le nouveau n’a aucun droit.',
      'Dépasser l’encadrement des loyers en zone tendue : le trop-perçu est remboursable et l’amende peut atteindre 5 000 €.',
    ] },

    { type: 'h2', text: 'Signature et vie du bail' },
    { type: 'p', text: 'Le bail se signe en autant d’exemplaires que de parties (chaque colocataire doit recevoir le sien). La signature électronique a la même valeur juridique que la signature papier depuis le règlement eIDAS — c’est aujourd’hui la méthode la plus simple pour faire signer trois colocataires et deux garants sans organiser une réunion.' },
    { type: 'p', text: 'Sur ISALY, le bail de colocation est généré automatiquement conforme à la loi de 1989 : clauses obligatoires pré-remplies, clause de solidarité ALUR, annexes jointes, signature électronique de toutes les parties et quittances mensuelles automatiques. Propriétaire comme colocataires gardent chacun leur exemplaire dans leur espace personnel.' },
  ],
}
