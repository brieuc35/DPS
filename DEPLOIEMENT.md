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

---

# Brancher l'envoi des courriels

Le site est statique : il ne peut pas expédier de courrier lui-même, et la clé
d'API de Brevo ne peut pas vivre dans la page — elle y serait lisible par tout
le monde, et n'importe qui pourrait envoyer en votre nom.

Le chemin retenu contourne les deux problèmes :

    le site écrit un document dans /mail
      → l'extension « Trigger Email from Firestore » le voit
        → elle envoie par le SMTP de Brevo

Le site ne connaît donc aucun secret, et ne rédige jamais le message : il
dépose un nom de gabarit et huit valeurs. Le texte, lui, vit dans Firestore.

## Ce qu'il y a à faire, une fois

### 1. Passer le projet en plan Blaze

Les extensions tournent sur Cloud Functions, indisponibles en plan Spark.

https://console.firebase.google.com/project/dps-collective/usage/details

Une carte bancaire est demandée. Le palier gratuit mensuel couvre très
largement le volume d'un collectif : quelques dizaines de courriels par mois
n'entament rien. Poser tout de même un budget d'alerte, par prudence.

### 2. Récupérer les identifiants SMTP de Brevo

Dans Brevo : **SMTP & API → SMTP**. Trois valeurs à noter.

| | |
|---|---|
| serveur | `smtp-relay.brevo.com` |
| port | `587` |
| identifiant | l'adresse en `@smtp-brevo.com` affichée sur la page |
| clé | à générer sur cette même page — elle ne se réaffiche jamais |

La clé SMTP n'est pas la clé d'API : ce sont deux choses distinctes chez Brevo.

Authentifier aussi le domaine d'expédition (**Expéditeurs → Domaines**), sinon
les messages partent en indésirables. Sans domaine à soi, se contenter d'une
adresse d'expéditeur vérifiée.

### 3. Installer l'extension

https://extensions.dev/extensions/firebase/firestore-send-email

À la configuration :

| paramètre | valeur |
|---|---|
| Firestore collection | `mail` |
| SMTP connection URI | `smtps://IDENTIFIANT@smtp-relay.brevo.com:587` |
| SMTP password | la clé SMTP — la saisir ici, jamais dans le dépôt |
| Default FROM address | `DPS Collective <votre@adresse>` |
| Templates collection | `templates` |
| Users collection | laisser vide |

L'adresse d'expédition doit être vérifiée chez Brevo, sinon tout est refusé.

### 4. Créer le gabarit

Console → Firestore → collection `templates` → document `confirmation-sortie`,
avec trois champs texte : `subject`, `html`, `text`.

Leur contenu est dans **`courriels/confirmation-sortie.md`**, versionné dans ce
dépôt pour être relisible et modifiable comme le reste. Les deux ne se
synchronisent pas : après modification du fichier, recopier dans Firestore.

### 5. Publier les règles

    firebase deploy --only firestore:rules

Sans cela, le site n'aura pas le droit d'écrire dans `/mail` et aucun courriel
ne partira — l'inscription, elle, fonctionnera quand même.

## Vérifier que ça marche

1. Se connecter sur le site avec un compte à soi, s'inscrire à une sortie.
2. Console → Firestore → `mail`. Un document `confirmation-<sortie>_<uid>` doit
   apparaître, et l'extension y écrire un champ `delivery` en quelques
   secondes : `state: SUCCESS` si tout va bien, `ERROR` avec le motif sinon.
3. Regarder sa boîte, et les indésirables.

En cas d'`ERROR`, la cause est presque toujours l'une des trois : identifiants
SMTP erronés, adresse d'expéditeur non vérifiée chez Brevo, ou projet resté en
plan Spark.

## Ce que les règles garantissent

La collection `/mail` déclenche des envois réels : ouverte, elle ferait du site
un relais de courrier, et le domaine d'expédition finirait sur les listes
noires. Quatre verrous, vérifiés sur l'émulateur (19 cas, chacun sur un
document neuf — une écriture sur un document existant s'évalue comme `update`
et serait refusée de toute façon, ce qui rendrait le test creux) :

- **l'identifiant est imposé** — `confirmation-<sortie>_<uid>` : une
  inscription, un courriel, pas un de plus ;
- **le destinataire vient du jeton d'authentification**, jamais du formulaire :
  on ne peut écrire qu'à soi ;
- **la réservation doit exister** : pas de confirmation pour une sortie où l'on
  n'est pas inscrit ;
- **le corps n'est jamais transmis par le site** : seulement un nom de gabarit
  et huit valeurs bornées. Le texte reste hors d'atteinte du navigateur.

Une limite demeure, assumée : le site ne demande pas encore de confirmer son
adresse à l'inscription. Quelqu'un peut donc créer un compte avec l'adresse
d'un tiers et lui faire parvenir jusqu'à un courriel par sortie au catalogue.
Le plafond est bas et le contenu est fixe. Le jour où la vérification d'adresse
existera, il suffira d'ajouter `request.auth.token.email_verified` à la règle.

## Qui reçoit, qui ne reçoit pas

Seuls les membres connectés. Une inscription sans compte reste possible, mais
aucun courriel ne peut partir : il n'y a alors pas d'adresse dont le site
puisse prouver qu'elle appartient bien à la personne, et lui écrire quand même
rouvrirait exactement la porte que les règles ferment. La modale le dit, et
propose de créer un compte.
