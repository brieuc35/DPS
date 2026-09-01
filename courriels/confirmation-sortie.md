# Gabarit « confirmation-sortie »

Ce fichier est la **source** du courriel de confirmation. Il n'est pas lu par le
site : le texte vit dans Firestore, dans la collection `templates`, document
`confirmation-sortie`. On le garde ici pour qu'il soit versionné, relu et
modifiable comme le reste — un texte qui n'existe que dans une console finit
toujours par diverger de ce que tout le monde croit qu'il dit.

**Après toute modification ici, recopier dans Firestore.** Les deux ne se
synchronisent pas tout seuls.

## Où le coller

Console Firebase → Firestore → collection `templates` → document
`confirmation-sortie`, avec trois champs texte : `subject`, `html`, `text`.

Les règles de sécurité interdisent au site de lire ou d'écrire cette
collection : seule l'extension y accède, avec le SDK admin.

## Les variables disponibles

Elles viennent de `donneesConfirmation()` dans `assets/js/activites.js`, et la
liste est verrouillée dans `firestore.rules`. En ajouter une demande de la
déclarer aux trois endroits.

| variable | contenu | vide quand |
|---|---|---|
| `prenom` | le prénom du membre | jamais |
| `titre` | le nom de la sortie | jamais |
| `lieu` | commune et département | jamais |
| `date` | « 4 octobre, 14:00 » | la sortie n'est pas encore programmée |
| `duree` | « 2 h » | non renseignée |
| `prix` | le tarif en euros, sans le symbole | jamais |
| `cadeau` | la phrase du cadeau de fin | la sortie n'en propose pas |
| `manquants` | nombre de participants encore nécessaires | le seuil est atteint |

Les trois champs qui peuvent être vides commandent chacun un passage du
message : c'est ce qui permet à un seul gabarit de couvrir une sortie datée
comme une sortie en attente de date.

---

## `subject`

```
Votre place pour {{titre}}
```

## `text`

La version texte n'est pas une politesse : certains clients de messagerie
n'affichent que celle-là, et un message sans partie texte part plus volontiers
en indésirable.

```
Bonjour {{prenom}},

Votre place est retenue pour {{titre}}.

Lieu : {{lieu}}
{{#if date}}Rendez-vous : {{date}}{{else}}La date n'est pas encore fixée avec le lieu. Elle le sera dès que le groupe sera formé, et vous la recevrez avant tout le monde.{{/if}}
{{#if duree}}Durée : environ {{duree}}{{/if}}
Tarif : {{prix}} EUR, réglés sur place — rien n'est prélevé par le site.

{{#if manquants}}Cette sortie a besoin de {{manquants}} participant(s) de plus pour être garantie. En dessous de ce seuil, elle peut être annulée ou reportée : nous vous préviendrions.
{{/if}}
{{#if cadeau}}Un cadeau vous attend à la fin : {{cadeau}}
{{/if}}
Vous pouvez vous désister librement jusqu'à 48 heures avant la sortie. En deçà,
prévenez-nous tout de même : une place libérée profite à quelqu'un d'autre.

À bientôt,
DPS Collective — Vitré et alentours
https://brieuc35.github.io/DPS/
```

## `html`

Sobre volontairement. Les clients de messagerie ne comprennent ni les feuilles
de styles externes, ni la moitié du CSS moderne : tout est en attributs de
style, en tableaux, et l'ensemble reste lisible même si le style saute
entièrement. Les couleurs sont celles de la charte — ivoire, prune, et l'orange
du sigle en une seule touche.

```html
<div style="margin:0;padding:24px;background:#f5efe4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#2a1622">
  <div style="max-width:560px;margin:0 auto;background:#fffdfa;border:1px solid #e2d7c4;border-radius:16px;overflow:hidden">

    <div style="height:4px;background:linear-gradient(90deg,#fe6d01,#f45791,#3550a7,#40848e)"></div>

    <div style="padding:32px 28px">
      <p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:#6f5462">Votre place est retenue</p>
      <h1 style="margin:0 0 20px;font-size:24px;line-height:1.25;color:#2a1622">{{titre}}</h1>

      <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#2a1622">Bonjour {{prenom}},</p>

      <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;font-size:15px;line-height:1.6;color:#2a1622;border-collapse:collapse">
        <tr>
          <td style="padding:8px 0;color:#6f5462;width:96px;vertical-align:top">Lieu</td>
          <td style="padding:8px 0">{{lieu}}</td>
        </tr>
        {{#if date}}
        <tr>
          <td style="padding:8px 0;color:#6f5462;vertical-align:top">Rendez-vous</td>
          <td style="padding:8px 0"><strong>{{date}}</strong></td>
        </tr>
        {{/if}}
        {{#if duree}}
        <tr>
          <td style="padding:8px 0;color:#6f5462;vertical-align:top">Durée</td>
          <td style="padding:8px 0">environ {{duree}}</td>
        </tr>
        {{/if}}
        <tr>
          <td style="padding:8px 0;color:#6f5462;vertical-align:top">Tarif</td>
          <td style="padding:8px 0">{{prix}}&nbsp;€, réglés sur place</td>
        </tr>
      </table>

      {{#unless date}}
      <p style="margin:20px 0 0;padding:14px 16px;background:#fae0cb;border-radius:10px;font-size:14px;line-height:1.6;color:#2a1622">
        La date n’est pas encore fixée avec le lieu. Elle le sera dès que le groupe
        sera formé, et vous la recevrez avant tout le monde.
      </p>
      {{/unless}}

      {{#if manquants}}
      <p style="margin:16px 0 0;padding:14px 16px;background:#ece4d5;border-radius:10px;font-size:14px;line-height:1.6;color:#2a1622">
        Cette sortie a besoin de <strong>{{manquants}} participant(s) de plus</strong>
        pour être garantie. En dessous de ce seuil, elle peut être annulée ou
        reportée — nous vous préviendrions.
      </p>
      {{/if}}

      {{#if cadeau}}
      <p style="margin:16px 0 0;padding:14px 16px;background:#fae0cb;border-radius:10px;font-size:14px;line-height:1.6;color:#2a1622">
        <strong>Un cadeau vous attend à la fin.</strong><br>{{cadeau}}
      </p>
      {{/if}}

      <p style="margin:24px 0 0;font-size:14px;line-height:1.6;color:#6f5462">
        Vous pouvez vous désister librement jusqu’à 48&nbsp;heures avant la sortie.
        En deçà, prévenez-nous tout de même : une place libérée profite à
        quelqu’un d’autre.
      </p>

      <p style="margin:24px 0 0">
        <a href="https://brieuc35.github.io/DPS/activites.html"
           style="display:inline-block;padding:12px 22px;background:#2a1622;color:#fffdfa;text-decoration:none;border-radius:999px;font-size:14px;font-weight:600">Voir le programme</a>
      </p>
    </div>

    <div style="padding:18px 28px;background:#f5efe4;border-top:1px solid #e2d7c4;font-size:12px;line-height:1.6;color:#6f5462">
      DPS Collective — Vitré et alentours, Ille-et-Vilaine<br>
      Vous recevez ce message parce que vous vous êtes inscrit·e à une sortie
      depuis votre compte.
    </div>
  </div>
</div>
```
