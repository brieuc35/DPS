# DPS Collective — Découvrir, Partager, Simplement

Site de DPS Collective, qui propose des activités à faire autour de Vitré : on
choisit celle qui donne envie, et on la vit aux côtés d’autres personnes qui ont
fait le même choix. Un fil interne, volontairement calme, permet d’échanger avant
et après la sortie.

## Contenu

| Page | Rôle |
| --- | --- |
| `index.html` | Accueil : le concept, les prochaines expériences, le fonctionnement, la communauté |
| `activites.html` | Le programme complet, avec recherche et tri |
| `communaute.html` | Fil social : cercles de discussion, composeur, réactions et réponses |
| `vision.html` | Le projet : la vision, le concept, la vie de la communauté, l'ambition et la promesse |
| `compte.html` | Espace membre : onglets « Se connecter » / « Créer un compte », puis profil et sorties réservées |
| `chat.html` | Discussions : le salon général et le fil de chaque sortie réservée |
| `mentions-legales.html` | Éditeur, hébergeur, propriété intellectuelle |
| `confidentialite.html` | Données collectées, base légale, durées, droits RGPD |
| `conditions.html` | Conditions d'utilisation : compte, inscription, annulation, comportement |

## Fonctionnalités

**Expériences**
- Grille de cartes compactes (4 thématiques, 4 activités) : vignette, ville,
  date, titre et jauge. Le nombre de colonnes s'adapte à la largeur disponible.
- Les vignettes portent un **pictogramme tracé**, pas un émoji : un émoji change
  de dessin selon le système, jure avec les lettres géométriques du sigle, et
  fait basculer la page du côté de la conversation alors qu'elle est une
  proposition.
- Recherche plein texte (titre, ville, description, thématique) et tri par
  date / prix / places disponibles.
- Jauge de remplissage — douze places pour chaque activité — et étiquette
  « Plus que N places » / « Complet » quand la sortie se remplit.
- Réservation en modale : récapitulatif de prix en direct, validation des champs,
  adhésion à la charte obligatoire, écran de confirmation.
- Une ancre du type `activites.html#brasserie` pré-remplit la recherche avec le
  nom de la thématique — le filtre reste visible et effaçable — y compris sans
  rechargement de page.

**Communauté**
- Portail d'entrée : le fil ne s'ouvre qu'après avoir répondu à « Pourquoi
  souhaitez-vous rentrer dans la communauté ? ». La réponse est conservée
  localement, la question n'est donc posée qu'une fois — et pas du tout à un
  membre, qui a déjà adhéré à la charte en s'inscrivant.
- Fil filtrable par cercle, avec compteur de messages par cercle.
- Publication de messages, réactions (« soutiens ») et réponses.
- Garde-fou de bienveillance : si un message contient un terme susceptible de
  blesser, un rappel s’affiche et invite à relire. Le second envoi passe —
  l’outil accompagne, il ne censure pas.
- Signalement d’un message vers la modération.

**Comptes & discussions**
- Deux entrées dans la navigation : « Se connecter » et « Créer un compte ».
  Une fois la session ouverte, elles laissent place au prénom du membre et à un
  accès direct aux discussions.
- Inscription validée champ par champ : prénom, nom, adresse, mot de passe de
  huit caractères confirmé, adhésion à la charte. Le mot de passe n'est jamais
  conservé en clair (empreinte SHA-256 salée).
- Deux niveaux de fils : **le salon**, ouvert à tous les membres, et **le
  groupe d'une sortie**, visible de ses seuls inscrits.
- Réserver une place emmène directement dans le groupe de la sortie, où un
  bandeau confirme la réservation. Sans compte, la réservation aboutit quand
  même : l'écran de confirmation propose alors d'en créer un pour entrer dans
  le fil.
- Le formulaire de réservation est prérempli pour un membre connecté, et le
  portail d'entrée de la communauté n'est plus posé à quelqu'un qui a déjà
  adhéré à la charte en s'inscrivant.
- **Suppression du compte**, à côté de « Se déconnecter ». Le panneau reste
  replié tant qu'on ne l'ouvre pas, et demande le mot de passe : il confirme
  l'intention, et Firebase exige de toute façon une authentification récente
  avant d'effacer un compte. Sont effacés le compte, ses inscriptions — les
  places sont **rendues au compteur dans une transaction**, sans quoi une sortie
  resterait affichée complète — et les messages écrits. L'ordre importe : après
  la suppression du compte, le membre n'a plus le droit d'écrire dans Firestore
  et ses données resteraient orphelines.

**Transversal**
- Thème clair chaud par défaut, sombre — lui aussi réchauffé — si le système
  le demande. Il n'y a pas de bascule dans l'interface, et rien n'est mémorisé :
  une préférence conservée sans moyen d'en changer enfermerait le visiteur dans
  un choix fait une fois. Le thème est appliqué avant le premier rendu, sans
  clignotement, et suit le système s'il change en cours de visite.
- Navigation : Accueil, Le projet, Communauté, puis le bouton « Trouver une
  activité » et les deux entrées de compte, à sa droite. Le pied de page reprend
  les mêmes accès. Sous 900 px le menu se replie en burger et les entrées de
  compte l'y rejoignent : elles existent en deux exemplaires dans le document,
  dont un seul est affiché.
- Apparitions au défilement, désactivées si l’utilisateur a demandé de réduire
  les animations (`prefers-reduced-motion`) et sans effet si JavaScript est absent.
- Accessibilité : lien d’évitement, focus visible, piège à focus et fermeture
  par `Échap` dans la modale, libellés `aria` sur les contrôles dynamiques.
- Tout contenu saisi par l’utilisateur est échappé avant insertion dans le DOM.

## Pages légales

Trois pages, liées depuis le pied de page de tout le site :
`mentions-legales.html`, `confidentialite.html` et `conditions.html`.

Elles décrivent le comportement **réel** du code : la politique de
confidentialité liste les champs effectivement écrits dans Firestore et les
clés effectivement posées dans le `localStorage`. Toute évolution du modèle de
données doit s'y répercuter.

> **Il reste des champs à renseigner.** Identité de l'éditeur, statut juridique,
> SIRET, adresse et adresse électronique de contact ne peuvent venir que du
> porteur du projet. Ils apparaissent surlignés « à compléter » sur les pages :
> tant qu'ils y sont, les mentions légales ne satisfont pas à l'article 6 de la
> LCEN, et les droits RGPD ne sont pas exerçables faute de destinataire.

**Les polices sont servies par le site** (`assets/fonts/`) et non par Google.
Charger une police depuis `fonts.googleapis.com` transmet l'adresse IP du
visiteur à un tiers avant tout consentement ; les deux fichiers pèsent 56 Ko, ce
qui ne justifiait pas ce traitement. Le site ne fait donc plus **aucune requête
vers un hôte tiers** pour s'afficher — ce que la page de confidentialité peut
affirmer sans réserve.

## Ligne éditoriale

Le site suit une progression : **comprendre → avoir envie → participer**.
L'activité est le point de départ, l'expérience est le cœur, le collectif lui
donne sa dimension. Trois règles en découlent, et elles expliquent la plupart
des choix de texte :

- **La rencontre n'est pas le produit.** Elle arrive parce qu'on a choisi la
  même sortie, pas parce qu'on est venu la chercher. Aucune page ne promet de
  « faire de belles rencontres ».
- **Le collectif ne doit pas intimider.** On ne met en avant ni le nombre de
  participants, ni le fait qu'on ne connaît personne. Les formulations qui
  faisaient peser le groupe — « rejoignez un groupe », « venir seul·e est la
  norme », « briser la glace » — ont été retirées.
- **On n'invente rien.** Ni témoignages, ni participants, ni partenaires, ni
  statistiques, ni déroulé d'activité non validé avec le lieu. C'est ce qui a
  fait disparaître la section « ils y sont allés », les messages de décor du
  fil, le nombre de modérateurs et le programme détaillé des sorties.

Les jauges partent donc de zéro et le fil démarre vide. Moins flatteur, mais
c'est l'état réel du projet — et la première vraie question posée n'y sera pas
noyée.

## Firebase

Les comptes passent par **Firebase Authentication** (projet `dps-collective`).
Ce sont de vrais comptes : même identité d'un appareil à l'autre, mot de passe
géré par Google et jamais stocké par le site.

- `assets/js/firebase-config.js` — la configuration du projet. Ces valeurs sont
  **publiques par construction** : elles identifient le projet, elles
  n'autorisent rien. Ce qui protège les données, ce sont les règles de sécurité.
- `assets/js/firebase-init.js` — module ES qui charge le SDK et expose
  `window.DPS_AUTH`. Le reste du site est en scripts classiques : ce fichier
  fait la jonction, et maintient un instantané synchrone de la session pour que
  l'en-tête, le portail du chat et le préremplissage n'aient pas à l'attendre.
- `assets/vendor/firebase/` — copie locale du SDK, version figée. Voir le
  `LISEZMOI.md` du dossier pour la provenance et la mise à jour.

**Mode local.** Si le SDK ne démarre pas — ou si l'on pose
`localStorage.setItem('dps.modeLocal', 'true')` — `comptes.js` retombe sur une
implémentation `localStorage` : comptes cantonnés au navigateur, mot de passe
réduit à une empreinte SHA-256 salée. C'est ce mode qui fait vivre l'aperçu
hors ligne du site et les tests automatisés. Ce n'est pas une authentification :
qui a la main sur le navigateur a la main sur ces comptes-là.

### Firestore

Messages et réservations sont partagés par **Firestore**
(`assets/js/firebase-donnees.js`) :

- **Le salon et les fils de groupe** sont en temps réel — un message envoyé
  apparaît chez les autres sans rechargement. En mode partagé, les échanges
  d'exemple ne s'affichent plus : ce sont des décors de démonstration, et
  répondre à quelqu'un qui n'existe pas serait une mauvaise surprise.
- **Les réservations** passent par une transaction. La relecture du compteur et
  son écriture sont atomiques, donc deux personnes ne peuvent pas emporter la
  même dernière place. Les jauges affichées viennent alors du compteur partagé,
  et se mettent à jour d'un appareil à l'autre.

### Deux choses à faire avant que ça fonctionne

**1. Déployer les règles de sécurité.** Le fichier `firestore.rules` est la
serrure du site ; tant qu'il n'est pas déployé, la base refuse tout et le chat
reste vide.

```bash
firebase login
firebase deploy --only firestore:rules
```

Ou, sans la CLI : console Firebase → *Firestore Database* → *Règles*, coller le
contenu de `firestore.rules`, publier.

**2. Créer l'index composite.** La lecture d'un fil trie par date en filtrant
sur la conversation, ce que Firestore refuse sans index dédié. Au premier
chargement, la console du navigateur affiche une erreur **contenant un lien
direct** : l'ouvrir crée l'index en un clic. Comptez une minute de
construction.

### Ce qui reste ensuite

- **Le compteur de places n'est pas inviolable.** Les règles bornent son pas
  dans les deux sens, mais elles ne peuvent pas contrôler qu'une transaction est
  cohérente de bout en bout. Le jour où une place vaudra de
  l'argent, ce calcul devra passer dans une Cloud Function, seule autorisée à
  écrire le compteur.
- **Aucun paiement.** Voir plus bas.

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
- **Sable** — les fonds clairs vont franchement vers l'abricot (`#fcf0e2`), pas
  vers le gris ni le blanc pur ; les surfaces restent plus claires que la page
  (`#fffaf4`) pour que les cartes s'en détachent, et les ombres sont teintées de
  brun, une ombre grise suffisant à éteindre un fond crème.
- **Braise** — les fonds sombres sont des bruns chauds, presque terre cuite
  (`#1a120c`), et non un noir bleuté : une pièce éclairée le soir plutôt qu'un
  écran de terminal.
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
index.html, activites.html, communaute.html, vision.html, compte.html, chat.html
firestore.rules         Règles de sécurité de la base — à déployer
assets/
  css/styles.css        Feuille de styles unique (jetons de design + composants)
  js/donnees.js         Thématiques, activités, cercles, publications et messages d’exemple
  js/app.js             Thème, navigation, apparitions, notifications, utilitaires
  js/comptes.js         Inscription, connexion, session, état de l’en-tête
  js/firebase-config.js Configuration du projet Firebase (publique)
  js/firebase-init.js   Module ES : charge le SDK et ouvre la session
  js/firebase-donnees.js Module ES : messages et réservations dans Firestore
  js/activites.js       Grille, filtres et parcours de réservation
  js/communaute.js      Fil social
  js/page-compte.js     Onglets et formulaires de l’espace membre
  js/chat.js            Salon général et fils de groupe
  img/
  vendor/firebase/      Copie locale du SDK Firebase (app + auth)
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
- **Polices** : Outfit (titres) et Manrope (texte) sont servies depuis
  `assets/fonts/`, sous SIL Open Font License 1.1, avec des polices système en
  repli. Voir le `LISEZMOI.md` du dossier.
