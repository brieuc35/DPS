# DPS — Découvrir, Partager, Simplement

Site vitrine d’une plateforme d’activités à taille humaine : on réserve une place
seul·e (randonnée, visite d’usine, brasserie, atelier…) et on rejoint un petit
groupe. Un réseau social interne, volontairement calme et bienveillant, permet
aux participants d’échanger avant et après la sortie.

## Contenu

| Page | Rôle |
| --- | --- |
| `index.html` | Accueil : proposition de valeur, six activités à la une, fonctionnement, charte, témoignages |
| `activites.html` | Catalogue complet avec recherche, filtres par thématique et tri |
| `communaute.html` | Fil social : cercles de discussion, composeur, réactions et réponses |

## Fonctionnalités

**Activités**
- Grille de cases thématiques (8 thématiques, 12 activités).
- Recherche plein texte (titre, lieu, description, thématique), filtres par
  thématique et tri par date / prix / places disponibles.
- Jauge de remplissage du groupe et étiquette « Plus que N places » / « Complet ».
- Réservation en modale : récapitulatif de prix en direct, validation des champs,
  adhésion à la charte obligatoire, écran de confirmation.
- Une ancre du type `activites.html#brasserie` présélectionne une thématique,
  y compris sans rechargement de page.

**Communauté**
- Fil filtrable par cercle, avec compteur de messages par cercle.
- Publication de messages, réactions (« soutiens ») et réponses.
- Garde-fou de bienveillance : si un message contient un terme susceptible de
  blesser, un rappel s’affiche et invite à relire. Le second envoi passe —
  l’outil accompagne, il ne censure pas.
- Signalement d’un message vers la modération.

**Transversal**
- Thème clair / sombre, initialisé selon la préférence système puis mémorisé.
- Navigation responsive avec menu mobile.
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

- **Données** : `assets/js/donnees.js` tient lieu de base de données. Dans une
  version connectée à un back-end, ces tableaux seraient remplacés par des
  appels API — le reste du code n’en dépend qu’à travers `ACTIVITES`,
  `THEMATIQUES`, `CERCLES` et `PUBLICATIONS`.
- **Persistance** : réservations, publications, réactions et réponses sont
  conservées dans `localStorage` (clés préfixées `dps.`). Les accès sont
  protégés : en navigation privée ou cookies bloqués, le site fonctionne sans
  mémoriser.
- **Polices** : Fraunces et Inter sont chargées depuis Google Fonts, avec des
  polices système en repli si le réseau les bloque.
