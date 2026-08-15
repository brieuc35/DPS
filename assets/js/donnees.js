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

/* Activités proposées.

   `placesPrises` est le point de départ des jauges : zéro, parce que les
   inscriptions sont désormais réelles. C'est aussi la valeur qui amorce le
   compteur partagé de Firestore au tout premier passage — la faire mentir
   ferait mentir les vraies jauges.

   Les programmes et prestations ci-dessous sont en revanche des textes
   d'attente : ils restent volontairement génériques tant qu'ils n'ont pas été
   validés avec chaque partenaire. */
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
    placesPrises: 0,
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
    placesPrises: 0,
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
    placesPrises: 0,
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
    placesPrises: 0,
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
      'Les inscriptions sont ouvertes pour la Mine Bleue du 15 ⛏️\nPensez à prévoir une petite laine : il fait 13 °C au fond, toute l’année.',
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
      'Les places pour la brasserie Athanor du 18 sont ouvertes 🍺 Si quelqu’un hésite : non, il ne faut rien connaître à la bière, et oui, il y a une option sans alcool pour la dégustation.',
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

/* ==========================================================================
   Conversations d'exemple
   --------------------------------------------------------------------------
   « general » est le salon ouvert à tous les membres ; « groupe-<activité> »
   réunit les inscrits d'une sortie. Ces messages sont le décor : ils tiennent
   lieu d'historique pour que le salon n'accueille pas les nouveaux venus sur
   une page vide. Les messages écrits depuis le site s'y ajoutent.
   ========================================================================== */

const CONVERSATIONS = [
  {
    id: 'general',
    nom: 'Le salon',
    emoji: '💬',
    description: 'Tous les membres, toutes les sorties. On y dit bonjour, on y pose ses questions.',
  },
  ...ACTIVITES.map((activite) => ({
    id: `groupe-${activite.id}`,
    nom: activite.titre,
    emoji: (THEMATIQUES.find((t) => t.id === activite.thematique) || {}).emoji || '📍',
    description: `Le groupe des inscrits · ${activite.lieu.split(',')[0]}`,
    activiteId: activite.id,
  })),
];

const MESSAGES_EXEMPLE = {
  general: [
    {
      id: 'm-g1', auteur: 'Camille R.', initiales: 'CR', couleur: 'avatar--terre',
      date: '2026-08-09T18:12',
      texte: 'Bonsoir tout le monde 👋 Pour celles et ceux qui viennent pour la première fois : on se retrouve toujours un quart d’heure avant, ça évite d’arriver en courant.',
    },
    {
      id: 'm-g2', auteur: 'Théo N.', initiales: 'TN', couleur: 'avatar--prune',
      date: '2026-08-09T18:31',
      texte: 'Merci, c’est noté. Je suis inscrit au billard lundi et je ne connais personne, donc ça me rassure.',
    },
    {
      id: 'm-g3', auteur: 'Sofia B.', initiales: 'SB', couleur: 'avatar--ambre',
      date: '2026-08-10T09:05',
      texte: 'Théo, on sera plusieurs dans ton cas 🙂 Viens simplement, le reste se fait tout seul.',
    },
  ],
  'groupe-mine-bleue': [
    {
      id: 'm-mb1', auteur: 'Camille R.', initiales: 'CR', couleur: 'avatar--terre',
      date: '2026-08-10T10:02',
      texte: 'Bienvenue dans le groupe de La Mine Bleue ⛏️ Rendez-vous sur place à 13 h 45, la descente part à 14 h pile.',
    },
    {
      id: 'm-mb2', auteur: 'Marc T.', initiales: 'MT', couleur: 'avatar--ciel',
      date: '2026-08-10T10:20',
      texte: 'Il fait quelle température au fond ? Je prévois une polaire ou ça suffit une chemise ?',
    },
    {
      id: 'm-mb3', auteur: 'Camille R.', initiales: 'CR', couleur: 'avatar--terre',
      date: '2026-08-10T10:24',
      texte: 'Une polaire, sans hésiter : il fait 13 °C toute l’année là-dessous.',
    },
  ],
  'groupe-initiation-billard': [
    {
      id: 'm-ib1', auteur: 'Étienne M.', initiales: 'EM', couleur: 'avatar--terre',
      date: '2026-08-10T20:14',
      texte: 'Salut le groupe 🎱 Personne n’a besoin de savoir jouer, c’est bien une initiation. On commence par la tenue de la queue.',
    },
    {
      id: 'm-ib2', auteur: 'Leïla F.', initiales: 'LF', couleur: 'avatar--prune',
      date: '2026-08-10T20:40',
      texte: 'Parfait, parce que mon niveau est proche de zéro. À lundi !',
    },
  ],
  'groupe-cidrerie-loic-raison': [
    {
      id: 'm-cr1', auteur: 'Nadia K.', initiales: 'NK', couleur: 'avatar--prune',
      date: '2026-08-09T14:30',
      texte: 'Petit rappel pour la cidrerie : chaussures fermées obligatoires, c’est une vraie usine 🍏',
    },
  ],
  'groupe-brasserie-athanor': [
    {
      id: 'm-ba1', auteur: 'Sofia B.', initiales: 'SB', couleur: 'avatar--ambre',
      date: '2026-08-10T19:02',
      texte: 'Rendez-vous devant la brasserie Athanor 🍺 Pensez à venir avec un moyen de rentrer : la dégustation, même petite, ça reste de la bière.',
    },
    {
      id: 'm-ba2', auteur: 'Amine Z.', initiales: 'AZ', couleur: 'avatar--ciel',
      date: '2026-08-10T19:15',
      texte: 'Je viens en train depuis Vitré, il y a de la place dans ma voiture au retour si quelqu’un est coincé.',
    },
  ],
};
