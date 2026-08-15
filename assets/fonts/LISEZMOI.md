# Polices — copie locale

`outfit.woff2` et `manrope.woff2` sont les fichiers publiés par Google Fonts,
sous **SIL Open Font License 1.1** — libre d'usage, y compris commercial, avec
maintien de la licence.

## Pourquoi une copie plutôt que le CDN

Charger une police depuis `fonts.googleapis.com` transmet à Google l'adresse IP
de chaque visiteur, avant tout consentement. C'est un traitement de données
qu'il faudrait déclarer, et que rien n'oblige à subir : les deux fichiers pèsent
56 Ko au total.

En les servant nous-mêmes, le site ne fait plus **aucune requête vers un tiers**
pour s'afficher, et la page de confidentialité peut le dire sans réserve.

## Mettre à jour

Récupérer les `.woff2` depuis <https://fonts.google.com>, les déposer ici sous
le même nom, et vérifier que les plages `unicode-range` de `styles.css`
correspondent toujours.
