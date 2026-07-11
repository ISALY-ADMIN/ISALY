import type { BlogArticle } from './types'

export const commentChoisirColocataire: BlogArticle = {
  slug: 'comment-choisir-colocataire',
  title: 'Comment choisir le bon colocataire ? 7 critères essentiels',
  category: 'Conseils',
  date: '2026-07-01',
  excerpt: 'Rythme de vie, propreté, finances, communication : les 7 critères qui font la différence entre une coloc réussie et un enfer quotidien.',
  keywords: ['choisir colocataire', 'compatibilité colocation', 'trouver colocataire', 'entretien colocation', 'coloc réussie'],
  emoji: '🤝',
  related: ['guide-colocation-paris', 'colocation-vs-studio', 'droits-locataire-colocation'],
  blocks: [
    { type: 'p', text: 'La majorité des colocations qui tournent mal n’échouent ni sur le loyer ni sur le logement : elles échouent sur l’humain. Un colocataire choisi à la va-vite parce qu’il « avait l’air sympa » en visite de vingt minutes, c’est le scénario classique du conflit à répétition trois mois plus tard. Voici les 7 critères qui comptent vraiment — et comment les évaluer avant de vous engager.' },

    { type: 'h2', text: '1. Le rythme de vie : le critère numéro un' },
    { type: 'p', text: 'Lève-tôt contre couche-tard, télétravailleur contre horaires de bureau, fêtard contre casanier : les incompatibilités de rythme sont la première source de conflit en colocation. Elles ne se négocient pas — on ne change pas son horloge interne pour faire plaisir. Posez des questions concrètes : à quelle heure te lèves-tu en semaine ? Tu travailles depuis la maison ? Tu invites souvent du monde le soir ?' },

    { type: 'h2', text: '2. Le rapport à la propreté' },
    { type: 'p', text: 'Inutile de chercher quelqu’un de « propre » — tout le monde se déclare propre. Cherchez quelqu’un qui a le même seuil de tolérance que vous. Une vaisselle qui traîne une soirée, c’est acceptable ou insupportable ? Un planning ménage, c’est indispensable ou infantilisant ? Les frictions naissent de l’écart entre les standards, pas du niveau absolu.' },

    { type: 'h2', text: '3. La solidité financière' },
    { type: 'p', text: 'En bail unique avec clause de solidarité, le loyer impayé de votre colocataire devient votre dette. Vérifier la capacité financière n’est pas de la méfiance, c’est de la prudence élémentaire :' },
    { type: 'ul', items: [
      'Revenus stables représentant idéalement 3 fois la part de loyer, ou un garant solide.',
      'Situation claire : CDI, CDD long, études avec garant — les situations floues sont un signal.',
      'Ponctualité de paiement passée : un ancien colocataire ou propriétaire peut en témoigner.',
    ] },

    { type: 'h2', text: '4. La communication en cas de désaccord' },
    { type: 'p', text: 'Tout le monde est charmant quand tout va bien. La vraie question : comment cette personne gère-t-elle un désaccord ? Passif-agressif qui laisse des post-it, évitant qui laisse pourrir, ou adulte capable de dire « il faut qu’on parle du ménage » calmement ? En entretien, demandez comment s’est passée sa dernière dispute de coloc et comment elle s’est résolue. La réponse est très révélatrice.' },

    { type: 'h2', text: '5. La vision de la vie commune' },
    { type: 'p', text: 'Il existe deux grandes familles de colocation : la coloc « famille » où l’on dîne ensemble et partage les week-ends, et la coloc « cohabitation » où chacun vit sa vie en se croisant poliment. Les deux fonctionnent très bien — le désastre, c’est de mélanger les deux attentes. Clarifiez ce point dès la première conversation : repas partagés ou frigos séparés ? Soirées communes ou chacun chez soi ?' },

    { type: 'h2', text: '6. La stabilité du projet' },
    { type: 'p', text: 'Un colocataire qui repart au bout de trois mois, c’est une nouvelle recherche, une visite de remplaçants, un dossier à refaire — et parfois une part de loyer à assumer entre-temps. Interrogez la durée envisagée : stage de six mois, CDI récent, projet d’achat, départ à l’étranger prévu ? Alignez les horizons.' },

    { type: 'h2', text: '7. Les habitudes spécifiques qui ne pardonnent pas' },
    { type: 'ul', items: [
      'Tabac : fumeur dedans, dehors, ou zéro tolérance — à trancher avant, pas après.',
      'Animaux : allergies, peurs, ou au contraire chat déjà présent dans le logement.',
      'Invités récurrents : le conjoint qui dort là 5 nuits sur 7 est un colocataire qui ne paie pas.',
      'Musique et instruments : batterie et murs fins font rarement bon ménage.',
    ] },

    { type: 'h2', text: 'Comment évaluer tout ça sans interrogatoire ?' },
    { type: 'p', text: 'Un café d’une heure vaut mieux que trois visites express. Proposez une rencontre informelle hors du logement, posez des questions ouvertes (« raconte-moi ta coloc idéale ») plutôt que fermées, et faites confiance aux détails : la personne qui répond aux messages en quatre jours pendant la recherche répondra pareil pour le loyer.' },
    { type: 'p', text: 'C’est précisément le problème qu’ISALY résout avec le matching de compatibilité : le test analyse votre rythme de vie, votre rapport à la propreté, vos habitudes sociales et votre budget sur 40+ critères, et ne vous présente que des profils réellement compatibles — avec un score détaillé critère par critère. Vous partez d’une base solide au lieu de découvrir les incompatibilités après l’emménagement.' },
  ],
}
