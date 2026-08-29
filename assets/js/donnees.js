/**
 * DPS Collective — Données de démonstration
 * ---------------------------------------------------------------------------
 * Ce fichier tient lieu de « base de données » pour la maquette : il alimente
 * la grille d'activités et le fil de la communauté. Dans une version connectée
 * à un back-end, ces tableaux seraient remplacés par des appels API.
 */

/* Thématiques : couleurs, pictogrammes et recherche.

   Les pictogrammes sont des tracés, pas des émojis : un émoji change de dessin
   selon le système, jure avec les lettres géométriques du sigle, et donne au
   site un air de conversation plutôt que de proposition. */
const THEMATIQUES = [
  { id: 'patrimoine', nom: 'Patrimoine',            icone: '<path d="M3 21l7-7"/><path d="M13 11a9 9 0 0 1 8-5 14 14 0 0 0-8 5Z"/><path d="M13 11a9 9 0 0 0-5 8 14 14 0 0 1 5-8Z"/><path d="M13 11l3 3"/>', degrade: 'linear-gradient(150deg, #5fd3e0, #2f6fe0)' },
  { id: 'loisir',     nom: 'Jeux & loisirs',        icone: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3.4"/>', degrade: 'linear-gradient(150deg, #7c4df0, #3b39c4)' },
  { id: 'entreprise', nom: 'Visites d’entreprise',  icone: '<path d="M3 21h18"/><path d="M4 21V10l6 3.5V10l6 3.5V6h4v15"/><path d="M7 21v-3.5"/>', degrade: 'linear-gradient(150deg, #f7b267, #e8556d)' },
  { id: 'brasserie',  nom: 'Brasseries',            icone: '<path d="M6 8h9v11a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2Z"/><path d="M15 11h2.5a2.5 2.5 0 0 1 0 5H15"/><path d="M6 8c0-2 1.4-3 3-3 .4-1.2 1.5-2 2.8-2 1.4 0 2.6 1 2.9 2.3"/>', degrade: 'linear-gradient(150deg, #f2718c, #b03fd0)' },
];

/* Activités proposées.

   `placesPrises` est le point de départ des jauges : zéro, parce que les
   inscriptions sont désormais réelles. C'est aussi la valeur qui amorce le
   compteur partagé de Firestore au tout premier passage — la faire mentir
   ferait mentir les vraies jauges.

   `placesMinimum` est le seuil en dessous duquel la sortie n'est pas encore
   garantie — la traduction chiffrée de ce que les CGU disaient déjà en
   termes vagues (« une sortie peut être annulée ou reportée, notamment faute
   de participants »). Les deux doivent rester cohérents : si ce nombre
   change ici, il change aussi dans conditions.html.

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
    placesMinimum: 3,
    placesPrises: 0,
    niveau: 'Accessible à tous',
    hote: { nom: 'DPS Collective', initiales: 'DP', couleur: 'avatar' },
    cadeau: 'Une réduction pour revivre la descente vous est offerte à la fin de la visite.',
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
    placesMinimum: 3,
    placesPrises: 0,
    niveau: 'Débutant bienvenu',
    hote: { nom: 'DPS Collective', initiales: 'DP', couleur: 'avatar--prune' },
    cadeau: 'Une offre pour 4 heures de billard vous est offerte à l’issue de l’initiation.',
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
    placesMinimum: 3,
    placesPrises: 0,
    niveau: 'Accessible à tous',
    hote: { nom: 'DPS Collective', initiales: 'DP', couleur: 'avatar--terre' },
    cadeau: 'Une bouteille de cidre vous est offerte à l’issue de la visite.',
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
    placesMinimum: 3,
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
  { id: 'tous',        nom: 'Tout le fil',          icone: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3a15 15 0 0 1 0 18 15 15 0 0 1 0-18Z"/>' },
  { id: 'patrimoine',  nom: 'Patrimoine',           icone: '<path d="M3 21l7-7"/><path d="M13 11a9 9 0 0 1 8-5 14 14 0 0 0-8 5Z"/><path d="M13 11a9 9 0 0 0-5 8 14 14 0 0 1 5-8Z"/><path d="M13 11l3 3"/>' },
  { id: 'entreprise',  nom: 'Visites d’entreprise', icone: '<path d="M3 21h18"/><path d="M4 21V10l6 3.5V10l6 3.5V6h4v15"/><path d="M7 21v-3.5"/>' },
  { id: 'brasserie',   nom: 'Brasseries',           icone: '<path d="M6 8h9v11a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2Z"/><path d="M15 11h2.5a2.5 2.5 0 0 1 0 5H15"/><path d="M6 8c0-2 1.4-3 3-3 .4-1.2 1.5-2 2.8-2 1.4 0 2.6 1 2.9 2.3"/>' },
  { id: 'loisir',      nom: 'Jeux & loisirs',       icone: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3.4"/>' },
  { id: 'premierpas',  nom: 'Premiers pas',         icone: '<path d="M12 21v-7"/><path d="M12 14c0-3.3 2.7-6 6-6 0 3.3-2.7 6-6 6Z"/><path d="M12 16c0-2.8-2.2-5-5-5 0 2.8 2.2 5 5 5Z"/>' },
];

/* Publications d'exemple pour amorcer le fil. */
/* Le fil démarre vide.

   Les publications d'exemple ont été retirées : elles mettaient en scène des
   personnes qui n'existent pas, avec des sorties qui n'ont pas eu lieu. Un fil
   qui commence à zéro est moins flatteur, mais c'est le vrai état du projet —
   et la première vraie question posée n'en sera pas noyée. */
const PUBLICATIONS = [];

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
    icone: '<path d="M20 15a2 2 0 0 1-2 2H8l-4 4V5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2Z"/>',
    description: 'Tous les membres, toutes les sorties. On y dit bonjour, on y pose ses questions.',
  },
  ...ACTIVITES.map((activite) => ({
    id: `groupe-${activite.id}`,
    nom: activite.titre,
    icone: (THEMATIQUES.find((t) => t.id === activite.thematique) || {}).icone || '',
    description: `Le groupe des inscrits · ${activite.lieu.split(',')[0]}`,
    activiteId: activite.id,
  })),
];

/* Aucun message de décor, pour la même raison que le fil : personne ne doit
   répondre à quelqu'un qui n'existe pas. */
const MESSAGES_EXEMPLE = {};
