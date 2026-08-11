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
- Thème clair chaud par défaut, sauf si le système demande explicitement le
  thème sombre — lui aussi réchauffé. Le choix de l'utilisateur est mémorisé et
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

## Mise en ligne

Le site est publié tel quel par GitHub Pages depuis la branche `main`, à la
racine du dépôt : <https://brieuc35.github.io/DPS/>.

À activer une fois, dans *Settings → Pages* du dépôt : **Source** = *Deploy
from a branch*, **Branch** = `main`, **dossier** = `/ (root)`. Chaque push sur
`main` republie ensuite le site en une minute environ.

Deux détails liés à cet hébergement :

- `.nojekyll` désactive le traitement Jekyll, inutile ici puisque les fichiers
  sont déjà servables en l'état.
- Les balises `og:url` / `og:image` pointent en absolu vers l'adresse Pages,
  seule forme comprise par les aperçus de partage. Elles sont à mettre à jour
  en cas de nom de domaine propre.

Rien n'empêche par ailleurs de déposer les mêmes fichiers sur Netlify ou tout
autre hébergeur statique.

## Direction artistique

Elle découle du logo : un sigle en dégradé, des lettres géométriques, une porte
ouverte comme motif. Les fonds, eux, sont volontairement chauds : le site doit
mettre à l'aise quelqu'un qui hésite à réserver seul, pas l'impressionner.

- **Spectre** — ambre `#f5a65a` → magenta `#ec4899` → violet `#7c4df0` →
  cyan `#5fd3e0`, dans l'ordre de lecture du sigle (D chaud, P médian, S froid).
  Il habille le sigle, les jauges, les vignettes thématiques et la signature.
- **Sable** — les fonds clairs vont vers l'ivoire (`#fdf8f2`) et le papier, pas
  vers le gris ni le blanc pur ; même les ombres sont teintées de brun, une
  ombre grise suffisant à éteindre un fond crème.
- **Braise** — les fonds sombres sont des bruns profonds (`#14100e`) et non un
  noir bleuté : une pièce éclairée le soir plutôt qu'un écran de terminal.
- **Le halo** du haut de page reprend l'ambre du sigle. Il s'éteint sur la
  couleur de fond avant la fin de la section, pour qu'aucune couture n'apparaisse
  au raccord.
- Les seuls écarts au chaud sont assumés : le violet des boutons et le cyan de
  la thématique « Patrimoine » viennent du logo et tiennent la marque.
- Les contrastes texte/fond ont été mesurés page par page dans les deux thèmes :
  tous atteignent le seuil AA. C'est ce qui a imposé un magenta plus foncé sur
  les boutons pleins et une extrémité sombre au dégradé de la charte.
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
