# SDK Firebase — copie locale

Ces fichiers viennent du paquet npm `firebase`, version **12.17.1**. Ce sont les
bundles navigateur publiés par Google, identiques à ceux servis par
`https://www.gstatic.com/firebasejs/12.17.1/`.

## Pourquoi une copie plutôt que le CDN

- Le site ne dépend d'aucun hôte tiers à l'exécution : il fonctionne derrière un
  réseau qui filtre `gstatic.com`, et se teste hors ligne.
- La version est figée. Une mise à jour est un changement visible dans l'historique
  git, pas une modification silencieuse côté Google.

## La seule modification apportée

Les bundles publiés importent `firebase-app` par une URL absolue :

```js
import{...}from"https://www.gstatic.com/firebasejs/12.17.1/firebase-app.js";
```

Elle a été remplacée par `"./firebase-app.js"`, sans quoi la copie locale irait
quand même chercher le CDN. Rien d'autre n'a été touché.

## Mettre à jour

```bash
npm pack firebase                       # récupère firebase-<version>.tgz
tar xzf firebase-<version>.tgz
for f in firebase-app.js firebase-auth.js; do
  sed 's#https://www.gstatic.com/firebasejs/<version>/firebase-app.js#./firebase-app.js#g' \
    "package/$f" > "assets/vendor/firebase/$f"
done
```

Pensez à relire les notes de version avant : une montée de version majeure peut
changer l'API utilisée par `assets/js/firebase-init.js`.
