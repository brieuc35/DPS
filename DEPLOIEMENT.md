# Déployer les règles Firestore

Les règles de sécurité (`firestore.rules`) sont la vraie serrure du site : la clé
d'API publiée dans les pages n'autorise rien par elle-même. Toute modification de
ce fichier reste sans effet tant qu'elle n'est pas **publiée** sur le projet
Firebase `dps-collective`.

## Le plus simple : la console

1. https://console.firebase.google.com/project/dps-collective/firestore/rules
2. Remplacer tout le contenu de l'éditeur par celui de `firestore.rules`.
3. **Publier**.

## En ligne de commande

Depuis la racine du dépôt, une seule fois :

    npm install -g firebase-tools
    firebase login

Puis, à chaque modification des règles :

    firebase deploy --only firestore:rules

`firebase.json` et `.firebaserc` désignent déjà le fichier et le projet : il n'y
a pas de `firebase init` à lancer.

> `firebase.json` ne décrit **que** les règles, volontairement. Y ajouter une
> section `indexes` ferait du dépôt la référence des index, et un déploiement
> supprimerait l'index composite créé à la main dans la console.
> Le site étant hébergé par GitHub Pages, il n'y a pas non plus de section
> `hosting`.

## Vérifier que c'est bien parti

Dans la console, l'onglet **Règles** affiche la date de la dernière publication.
Côté site, deux tests qui comptent :

- supprimer un compte qui avait une inscription, puis vérifier que la place
  est bien revenue dans la jauge de la sortie ;
- depuis un compte connecté, publier un message dans le fil de la communauté
  et vérifier qu'il apparaît — c'est le signe que les collections
  `publications`, `reponses` et `jaimes` sont bien couvertes par les règles
  publiées.
