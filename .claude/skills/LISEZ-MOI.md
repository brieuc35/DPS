# Compétences UI/UX — code tiers

Ce dossier ne contient rien qui soit propre à DPS Collective. C'est une copie
du plugin **UI/UX Pro Max**, posée dans le dépôt pour que les compétences
soient disponibles sans que personne ait à installer quoi que ce soit.

| | |
|---|---|
| Origine | https://github.com/nextlevelbuilder/ui-ux-pro-max-skill |
| Version | 2.13.0 |
| Commit copié | `09170ee` |
| Licence | MIT — voir `LICENCE-ui-ux-pro-max.txt` |
| Copié le | 27 septembre 2026 |

## Ce qu'il y a dedans

| Compétence | Poids | À quoi elle sert |
|---|---|---|
| `ui-ux-pro-max` | 3,7 Mo | Le cœur : 79 styles, 192 palettes, 74 appariements de polices, 119 règles UX, 25 types de graphiques |
| `ui-styling` | 5,8 Mo | shadcn/ui, Radix et Tailwind — **le site n'emploie aucun des trois** |
| `design` | 388 Ko | Identité, jetons de design, génération de logo |
| `design-system` | 272 Ko | Architecture de jetons en trois couches, spécifications de composants |
| `brand` | 164 Ko | Voix de marque, cohérence, cadres de message |
| `slides` | 40 Ko | Présentations HTML |
| `banner-design` | 24 Ko | Bannières pour réseaux sociaux et publicité |

`ui-styling` pèse à lui seul plus de la moitié du dossier et documente une
pile technique que ce site n'utilise pas : il est écrit en CSS à la main,
sans framework. Le retirer est sans effet sur le reste :

```sh
git rm -r .claude/skills/ui-styling
```

## Ce que cela change pour le site

**Rien.** Aucune page ne référence ce dossier, aucun script ne le charge.
Ces fichiers ne servent qu'aux assistants de code qui travaillent sur le
projet. Le plugin ne déclare ni hook ni serveur MCP : rien ne s'exécute de
soi-même. Les scripts Python qu'il contient ne tournent que si une compétence
est sollicitée, pour chercher dans ses bases locales.

Une conséquence à connaître tout de même : le dépôt porte un `.nojekyll`, ce
qui fait que GitHub Pages sert **tous** les fichiers, y compris ceux des
dossiers commençant par un point. Ce dossier est donc accessible en ligne. Ce
n'est pas un problème — son contenu est public et sous licence MIT — mais il
compte dans ce que le dépôt publie.

## Mettre à jour

On ne modifie pas ces fichiers : toute retouche serait perdue à la prochaine
mise à jour, et ferait diverger la copie de l'original sans trace.

```sh
git clone --depth 1 https://github.com/nextlevelbuilder/ui-ux-pro-max-skill /tmp/uiux
rm -rf .claude/skills/*/
cp -r /tmp/uiux/.claude/skills/. .claude/skills/
cp /tmp/uiux/LICENSE .claude/skills/LICENCE-ui-ux-pro-max.txt
```

Puis mettre à jour la version et le commit dans le tableau ci-dessus — sans
quoi on ne sait plus ce qui est installé.

## L'autre voie

Le plugin s'installe aussi sans toucher au dépôt, ce qui le rend disponible
sur tous les projets au lieu de celui-ci seulement :

```
/plugin marketplace add nextlevelbuilder/ui-ux-pro-max-skill
/plugin install ui-ux-pro-max@ui-ux-pro-max-skill
```

Les deux voies font double emploi. Si l'installation par plugin est retenue
un jour, ce dossier peut disparaître.
