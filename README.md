# DPS Collective — Découvrir, Partager, Simplement

Site vitrine d’une plateforme d’activités à taille humaine : on réserve une place
seul·e (randonnée, visite d’usine, brasserie, atelier…) et on rejoint un petit
groupe. Un réseau social interne, volontairement calme et bienveillant, permet
aux participants d’échanger avant et après la sortie.

## Contenu

| Page | Rôle |
| --- | --- |
| `index.html` | Accueil : proposition de valeur, les activités à la une, fonctionnement, charte, témoignages |
| `activites.html` | Catalogue complet avec recherche, filtres par thématique et tri |
| `communaute.html` | Fil social : cercles de discussion, composeur, réactions et réponses |
| `vision.html` | Le projet : la vision, le concept, la vie de la communauté, l'ambition et la promesse |

## Fonctionnalités

**Activités**
- Grille de cases thématiques compactes (4 thématiques, 4 activités) : visuel,
  ville, date, titre et jauge de groupe. Le nombre de colonnes s'adapte à la
  largeur disponible. Le détail complet est dans la fiche de réservation.
- Recherche plein texte (titre, ville, description, thématique) et tri par
  date / prix / places disponibles.
- Jauge de remplissage du groupe — douze places pour toutes les activités,
  conformément à la promesse affichée sur l'accueil — et étiquette
  « Plus que N places » / « Complet ».
- Réservation en modale : récapitulatif de prix en direct, validation des champs,
  adhésion à la charte obligatoire, écran de confirmation.
- Une ancre du type `activites.html#brasserie` pré-remplit la recherche avec le
  nom de la thématique — le filtre reste visible et effaçable — y compris sans
  rechargement de page.

**Communauté**
- Portail d'entrée : le fil ne s'ouvre qu'après avoir répondu à « Pourquoi
  souhaitez-vous rentrer dans la communauté ? ». La réponse est conservée
  localement, la question n'est donc posée qu'une fois.
- Fil filtrable par cercle, avec compteur de messages par cercle.
- Publication de messages, réactions (« soutiens ») et réponses.
- Garde-fou de bienveillance : si un message contient un terme susceptible de
  blesser, un rappel s’affiche et invite à relire. Le second envoi passe —
  l’outil accompagne, il ne censure pas.
- Signalement d’un message vers la modération.

**Transversal**
- Thème sombre par défaut — le monde du logo — sauf si le système demande
  explicitement le thème clair. Le choix de l'utilisateur est mémorisé et
  appliqué avant le premier rendu, sans clignotement.
- Navigation : Accueil, Le projet, Communauté. Le catalogue s'atteint par le
  bouton « Trouver une activité », identique sur les quatre pages, et par les
  liens du pied de page. Menu replié en burger sous 900 px.
- Apparitions au défilement, désactivées si l’utilisateur a demandé de réduire
  les animations (`prefers-reduced-motion`) et sans effet si JavaScript est absent.
- Accessibilité : lien d’évitement, focus visible, piège à focus et fermeture
  par `Échap` dans la modale, libellés `aria` sur les contrôles dynamiques.
- Tout contenu saisi par l’utilisateur est échappé avant insertion dans le DOM.

## Lancer le site

Aucune dépendance ni étape de build : ce sont des fichiers statiques.

```bash
python3 -m http.server 8000
# puis ouvrir http://localhost:8000
```

Le site peut être publié tel quel sur GitHub Pages, Netlify ou tout hébergeur
de fichiers statiques.

## Direction artistique

Elle découle du logo : un sigle en dégradé posé sur un fond nuit, des lettres
géométriques, une porte ouverte comme motif.

- **Spectre** — ambre `#f5a65a` → magenta `#ec4899` → violet `#7c4df0` →
  cyan `#5fd3e0`, dans l'ordre de lecture du sigle (D chaud, P médian, S froid).
  Il habille le sigle, les jauges, les vignettes thématiques et la signature.
- **Fond nuit** `#08080f`, décliné jusqu'à `#262649` pour les surfaces. Les
  neutres du thème clair sont légèrement tirés vers le violet plutôt que gris.
- **Typographie** — Outfit en titres (géométrique, comme les lettres du logo),
  Manrope en texte courant, capitales très espacées pour les libellés, à
  l'image du « COLLECTIVE » du logo.
- **Le logo** est le fichier fourni par la marque (`assets/img/logo.png`,
  découpé sur le sigle) : ses couleurs propres tiennent aussi bien sur fond
  clair que sur fond nuit, aucune variante de thème n'est nécessaire.
  `logo-complet.png` conserve le verrouillage entier (sigle, « COLLECTIVE » et
  baseline) pour les aperçus de partage, `favicon.png` le « D » seul.
- Chaque thématique reçoit un pan du spectre, pour que les vignettes forment
  une seule famille au lieu de couleurs indépendantes.

## Organisation

```
index.html, activites.html, communaute.html
assets/
  css/styles.css        Feuille de styles unique (jetons de design + composants)
  js/donnees.js         Thématiques, activités, cercles et publications d’exemple
  js/app.js             Thème, navigation, apparitions, notifications, utilitaires
  js/activites.js       Grille, filtres et parcours de réservation
  js/communaute.js      Fil social
  img/favicon.svg
```

## Notes techniques

- **Données** : `assets/js/donnees.js` tient lieu de base de données. Les
  quatre activités correspondent à des lieux réels autour de Vitré ; en
  revanche, durées, programmes et prestations incluses sont des textes
  d'attente, à valider avec chaque partenaire avant mise en ligne publique. Dans une
  version connectée à un back-end, ces tableaux seraient remplacés par des
  appels API — le reste du code n’en dépend qu’à travers `ACTIVITES`,
  `THEMATIQUES`, `CERCLES` et `PUBLICATIONS`.
- **Persistance** : réservations, publications, réactions et réponses sont
  conservées dans `localStorage` (clés préfixées `dps.`), tout comme la
  réponse au portail d'entrée de la communauté. Les accès sont
  protégés : en navigation privée ou cookies bloqués, le site fonctionne sans
  mémoriser.
- **Polices** : Outfit (titres) et Manrope (texte) sont chargées depuis Google
  Fonts, avec des polices système en repli si le réseau les bloque.
