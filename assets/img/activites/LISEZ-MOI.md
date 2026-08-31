# Photographies des activités

Ce dossier reçoit la photographie de couverture de chaque sortie.

La direction artistique repose dessus : sur une page volontairement sobre,
c'est l'image qui donne envie, le texte ne fait que confirmer. Tant qu'une
activité n'a pas de photo, sa carte affiche le motif de la marque — la porte
du sigle sur la couleur de la thématique. C'est un substitut assumé, pas une
illustration : aucune image de banque n'est employée, parce qu'elle ferait
croire à un lieu que personne n'a photographié.

## Pour ajouter une photo

1. Déposer le fichier ici, nommé comme l'identifiant de l'activité —
   `mine-bleue.jpg`, `cidrerie-loic-raison.jpg`…
2. Dans `assets/js/donnees.js`, renseigner le champ `photo` de l'activité :

   ```js
   photo: 'assets/img/activites/mine-bleue.jpg',
   ```

Rien d'autre à modifier. La carte bascule d'elle-même du motif à l'image.

## Format

- **Cadrage 3:2** (par exemple 1200 × 800). La vignette recadre au centre,
  donc le sujet doit y être ; les bords peuvent être rognés.
- **1200 px de large** suffisent : au-delà, on fait payer au visiteur des
  pixels qu'il ne verra pas.
- **JPEG** pour une photographie, à 80-85 % de qualité.
- Des situations réelles, en lumière naturelle, des gens en train de faire
  quelque chose. Une photo du lieu vide est moins désirable qu'un détail
  vivant.

## Droits

N'employer que des images dont les droits sont acquis, et s'assurer de
l'accord des personnes reconnaissables. Une photo prise pendant une sortie
est ce qu'il y a de mieux : elle est juste, et elle appartient au collectif.
