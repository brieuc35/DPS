/**
 * DPS Collective — Données de démonstration
 * ---------------------------------------------------------------------------
 * Ce fichier tient lieu de « base de données » pour la maquette : il alimente
 * la grille d'activités et le fil de la communauté. Dans une version connectée
 * à un back-end, ces tableaux seraient remplacés par des appels API.
 */

/* Thématiques : servent aux couleurs, aux pictogrammes et à la recherche. */
const THEMATIQUES = [
  { id: 'patrimoine', nom: 'Patrimoine',            emoji: '⛏️', degrade: 'linear-gradient(150deg, #5fd3e0, #2f6fe0)' },
  { id: 'loisir',     nom: 'Jeux & loisirs',        emoji: '🎱', degrade: 'linear-gradient(150deg, #7c4df0, #3b39c4)' },
  { id: 'entreprise', nom: 'Visites d’entreprise',  emoji: '🍏', degrade: 'linear-gradient(150deg, #f7b267, #e8556d)' },
  { id: 'brasserie',  nom: 'Brasseries',            emoji: '🍺', degrade: 'linear-gradient(150deg, #f2718c, #b03fd0)' },
];

/* Activités proposées. `placesPrises` évolue avec les réservations locales.
   Les programmes et prestations ci-dessous sont des textes d'attente : ils
   restent volontairement génériques tant qu'ils n'ont pas été validés avec
   chaque partenaire. */
const ACTIVITES = [
  {
    id: 'mine-bleue',
    titre: 'La Mine Bleue',
    thematique: 'patrimoine',
    lieu: 'Segré-en-Anjou, Maine-et-Loire',
    date: '2026-08-15T14:00',
    duree: '2 h',
    prix: 15,
    placesTotal: 12,
    placesPrises: 9,
    niveau: 'Accessible à tous',
    hote: { nom: 'DPS Collective', initiales: 'DP', couleur: 'avatar' },
    resume: 'Descente dans une ardoisière et visite guidée du fond.',
    programme: [
      'Accueil du groupe et tour de table',
      'Descente vers le fond et visite guidée',
      'Temps de questions avec le guide',
      'Moment convivial à la remontée',
    ],
    inclus: ['Visite guidée', 'Équipement fourni sur place'],
  },
  {
    id: 'initiation-billard',
    titre: 'Initiation au billard',
    thematique: 'loisir',
    lieu: 'Vitré, Ille-et-Vilaine',
    date: '2026-08-16T18:30',
    duree: '2 h',
    prix: 8,
    placesTotal: 12,
    placesPrises: 4,
    niveau: 'Débutant bienvenu',
    hote: { nom: 'DPS Collective', initiales: 'DP', couleur: 'avatar--prune' },
    resume: 'Les bases de la queue et du placement, sans aucun prérequis.',
    programme: [
      'Présentation du groupe autour des tables',
      'Prise en main : tenue, visée, effets simples',
      'Petites parties en binômes qui tournent',
      'Verre partagé pour clore la soirée',
    ],
    inclus: ['Prêt du matériel', 'Encadrement', 'Location des tables'],
  },
  {
    id: 'cidrerie-loic-raison',
    titre: 'Usine cidrerie Loïc Raison',
    thematique: 'entreprise',
    lieu: 'Domagné, Ille-et-Vilaine',
    date: '2026-08-17T10:00',
    duree: '2 h',
    prix: 10,
    placesTotal: 12,
    placesPrises: 7,
    niveau: 'Accessible à tous',
    hote: { nom: 'DPS Collective', initiales: 'DP', couleur: 'avatar--terre' },
    resume: 'De la pomme à la bouteille, les coulisses de la cidrerie.',
    programme: [
      'Accueil et présentation du site',
      'Parcours de fabrication commenté',
      'Échange avec l’équipe de production',
      'Dégustation en fin de visite',
    ],
    inclus: ['Visite guidée', 'Dégustation'],
  },
  {
    id: 'brasserie-athanor',
    titre: 'Brasserie Athanor',
    thematique: 'brasserie',
    lieu: 'Argentré-du-Plessis, Ille-et-Vilaine',
    date: '2026-08-18T18:00',
    duree: '2 h',
    prix: 10,
    placesTotal: 12,
    placesPrises: 11,
    niveau: 'Accessible à tous',
    hote: { nom: 'DPS Collective', initiales: 'DP', couleur: 'avatar--ambre' },
    resume: 'Visite de la salle de brassage et dégustation commentée.',
    programme: [
      'Accueil du groupe au comptoir',
      'Visite de la salle de brassage',
      'Le métier raconté par le brasseur',
      'Dégustation commentée',
    ],
    inclus: ['Visite guidée', 'Dégustation', 'Option sans alcool'],
  },
];

/* Cercles de discussion du réseau social. */
const CERCLES = [
  { id: 'tous',        nom: 'Tout le fil',          emoji: '🌍' },
  { id: 'patrimoine',  nom: 'Patrimoine',           emoji: '⛏️' },
  { id: 'entreprise',  nom: 'Visites d’entreprise', emoji: '🍏' },
  { id: 'brasserie',   nom: 'Brasseries',           emoji: '🍺' },
  { id: 'loisir',      nom: 'Jeux & loisirs',       emoji: '🎱' },
  { id: 'premierpas',  nom: 'Premiers pas',         emoji: '🌱' },
];

/* Publications d'exemple pour amorcer le fil. */
const PUBLICATIONS = [
  {
    id: 'pub-1',
    auteur: 'Camille R.',
    initiales: 'CR',
    couleur: 'avatar',
    cercle: 'patrimoine',
    badge: 'Hôte',
    date: '2026-07-30T09:12',
    contenu:
      'On boucle le groupe pour la Mine Bleue du 15 : neuf inscrits qui ne se connaissaient pas la semaine dernière ⛏️\nPensez à prévoir une petite laine, il ne fait pas chaud au fond.',
    jaimes: 24,
    reponses: [
      { auteur: 'Sonia L.', initiales: 'SL', couleur: 'avatar--ambre', texte: 'Noté pour la laine, merci ! J’ai hâte.' },
      { auteur: 'Marc T.', initiales: 'MT', couleur: 'avatar--ciel', texte: 'Il reste de la place ? Je peux me libérer ce jour-là.' },
    ],
  },
  {
    id: 'pub-2',
    auteur: 'Théo N.',
    initiales: 'TN',
    couleur: 'avatar--prune',
    cercle: 'premierpas',
    badge: 'Nouveau',
    date: '2026-07-30T07:40',
    contenu:
      'Je viens d’arriver du côté de Vitré et je ne connais personne. J’avoue que réserver une activité seul m’intimide un peu… Est-ce que ça se passe bien quand on vient sans connaître qui que ce soit ?',
    jaimes: 41,
    reponses: [
      { auteur: 'Nadia K.', initiales: 'NK', couleur: 'avatar--prune', texte: 'La moitié des participants viennent seuls ! On commence toujours par un tour de table.' },
      { auteur: 'Étienne M.', initiales: 'EM', couleur: 'avatar--terre', texte: 'Viens à l’initiation billard dimanche, je te présenterai le groupe 🙂' },
    ],
  },
  {
    id: 'pub-3',
    auteur: 'Sofia B.',
    initiales: 'SB',
    couleur: 'avatar--ambre',
    cercle: 'brasserie',
    badge: 'Hôte',
    date: '2026-07-29T18:05',
    contenu:
      'Il reste une place pour la brasserie Athanor le 18 🍺 Si quelqu’un hésite : non, il ne faut rien connaître à la bière, et oui, il y a une option sans alcool pour la dégustation.',
    jaimes: 15,
    reponses: [
      { auteur: 'Amine Z.', initiales: 'AZ', couleur: 'avatar--ciel', texte: 'Je prends la place, merci pour la précision sur le sans alcool !' },
    ],
  },
  {
    id: 'pub-4',
    auteur: 'Leïla F.',
    initiales: 'LF',
    couleur: 'avatar--prune',
    cercle: 'loisir',
    badge: null,
    date: '2026-07-29T12:22',
    contenu:
      'Première fois que je touchais une queue de billard hier soir 🎱 J’ai raté à peu près tout, et j’ai passé un excellent moment. Personne ne s’est moqué, c’est tout ce que je demandais.',
    jaimes: 33,
    reponses: [],
  },
];
