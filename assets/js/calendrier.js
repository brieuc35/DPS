/**
 * DPS Collective — Calendrier des activités
 * ---------------------------------------------------------------------------
 * Remplit tout élément portant [data-calendrier] à partir de `ACTIVITES` :
 * aucune date n'est saisie ici, le calendrier est une seconde lecture du même
 * catalogue que la grille de cartes. Ajouter une sortie dans `donnees.js`
 * suffit à la voir apparaître à sa case.
 *
 * Deux rendus pour une seule source :
 *
 * - **grille mensuelle** sur écran large, en `<table>` — c'est la structure
 *   qu'un lecteur d'écran sait annoncer (« ligne 3, colonne mercredi »), et
 *   celle que tout le monde reconnaît d'un coup d'œil ;
 * - **agenda** sur écran étroit, la liste des seuls jours occupés. Sept
 *   colonnes sur 390 px donneraient des cases de 50 px, où aucun nom
 *   d'activité ne tient — et le but du calendrier est justement de les lire.
 *
 * Le basculement se fait sur `matchMedia`, pas en CSS : rendre les deux et en
 * masquer un doublerait le DOM, et surtout les boutons de navigation en double
 * exemplaire.
 */

const CAL_SEUIL_GRILLE = '(min-width: 860px)';

/** Lundi en tête : la semaine française commence là, pas au dimanche. */
const CAL_JOURS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

/** Le mois affiché, toujours ramené au 1er à minuit. */
const etatCalendrier = {
  mois: null,
};

/* ==========================================================================
   Dates
   ========================================================================== */

/** Clé de regroupement « 2026-08-15 », en heure locale. */
function calCle(date) {
  const mois = String(date.getMonth() + 1).padStart(2, '0');
  const jour = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${mois}-${jour}`;
}

function calPremierDuMois(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

/**
 * Rang du jour dans une semaine commençant le lundi : 0 pour lundi, 6 pour
 * dimanche. `getDay()` compte à partir du dimanche, d'où le décalage.
 */
function calRangDansLaSemaine(date) {
  return (date.getDay() + 6) % 7;
}

/** Les activités du catalogue regroupées par jour. */
function calActivitesParJour() {
  const parJour = new Map();

  ACTIVITES.forEach((activite) => {
    const date = new Date(activite.date);
    if (Number.isNaN(date.getTime())) return;

    const cle = calCle(date);
    if (!parJour.has(cle)) parJour.set(cle, []);
    parJour.get(cle).push(activite);
  });

  // Plusieurs sorties le même jour se lisent dans l'ordre des horaires.
  parJour.forEach((liste) => {
    liste.sort((a, b) => new Date(a.date) - new Date(b.date));
  });

  return parJour;
}

/**
 * Le mois sur lequel s'ouvrir : celui de la première sortie à venir. À défaut
 * — catalogue vide, ou toutes les dates passées — le mois courant, qui reste
 * le repère le plus utile.
 */
function calMoisInitial() {
  const maintenant = Date.now();
  const prochaines = ACTIVITES.map((activite) => new Date(activite.date))
    .filter((date) => !Number.isNaN(date.getTime()) && date.getTime() >= maintenant)
    .sort((a, b) => a - b);

  return calPremierDuMois(prochaines[0] || new Date());
}

/* ==========================================================================
   Rendu
   ========================================================================== */

function calNomDuMois(date) {
  const nom = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(date);
  return nom.charAt(0).toUpperCase() + nom.slice(1);
}

function calHeure(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(date);
}

/**
 * La pastille d'une sortie. C'est un bouton : elle ouvre la même modale de
 * réservation que la carte correspondante, plutôt que de renvoyer le visiteur
 * chercher l'activité dans la grille.
 */
function calGabaritPastille(activite) {
  const theme = trouverThematique(activite.thematique);
  const restantes = placesRestantes(activite);
  const complet = restantes === 0;

  return `
    <button type="button" class="cal-sortie${complet ? ' cal-sortie--complet' : ''}"
            style="--cal-degrade:${theme.degrade}"
            data-cal-sortie="${echapper(activite.id)}">
      <span class="cal-sortie__heure">${echapper(calHeure(activite.date))}</span>
      <span class="cal-sortie__titre">${echapper(activite.titre)}</span>
      ${complet ? '<span class="cal-sortie__etat">Complet</span>' : ''}
    </button>
  `;
}

/** Grille mensuelle : six semaines au plus, du lundi précédant le 1er. */
function calGabaritGrille(parJour) {
  const mois = etatCalendrier.mois;
  const debut = calPremierDuMois(mois);
  const cleAujourdhui = calCle(new Date());

  // On remonte au lundi de la semaine du 1er, puis on avance de sept en sept
  // jusqu'à dépasser le mois : le nombre de semaines s'ajuste tout seul.
  const curseur = new Date(debut);
  curseur.setDate(curseur.getDate() - calRangDansLaSemaine(debut));

  const semaines = [];
  while (
    curseur.getMonth() === mois.getMonth() ||
    curseur < debut ||
    semaines.length === 0 ||
    semaines[semaines.length - 1].some((jour) => jour.getMonth() === mois.getMonth())
  ) {
    const semaine = [];
    for (let i = 0; i < 7; i += 1) {
      semaine.push(new Date(curseur));
      curseur.setDate(curseur.getDate() + 1);
    }
    semaines.push(semaine);
    if (semaines.length >= 6) break;
  }

  const lignes = semaines
    .map((semaine) => {
      const cellules = semaine
        .map((jour) => {
          const cle = calCle(jour);
          const horsMois = jour.getMonth() !== mois.getMonth();
          const sorties = parJour.get(cle) || [];

          return `
            <td class="cal-case${horsMois ? ' cal-case--hors-mois' : ''}${
            cle === cleAujourdhui ? ' cal-case--aujourdhui' : ''
          }">
              <span class="cal-case__numero">${jour.getDate()}</span>
              ${sorties.map(calGabaritPastille).join('')}
            </td>
          `;
        })
        .join('');

      return `<tr>${cellules}</tr>`;
    })
    .join('');

  return `
    <table class="cal-grille">
      <caption class="sr-only">Les sorties de ${echapper(calNomDuMois(mois))}</caption>
      <thead>
        <tr>
          ${CAL_JOURS.map(
            (jour) =>
              `<th scope="col"><abbr title="${jour}">${jour.slice(0, 3)}</abbr></th>`
          ).join('')}
        </tr>
      </thead>
      <tbody>${lignes}</tbody>
    </table>
  `;
}

/** Agenda : les seuls jours occupés du mois, en liste. */
function calGabaritAgenda(parJour) {
  const mois = etatCalendrier.mois;

  const jours = [...parJour.keys()]
    .filter((cle) => {
      const date = new Date(`${cle}T00:00`);
      return date.getFullYear() === mois.getFullYear() && date.getMonth() === mois.getMonth();
    })
    .sort();

  if (!jours.length) {
    return `
      <p class="cal-vide">Aucune sortie proposée en ${echapper(
        calNomDuMois(mois).toLowerCase()
      )} pour l’instant.</p>
    `;
  }

  const entrees = jours
    .map((cle) => {
      const date = new Date(`${cle}T00:00`);
      const intitule = new Intl.DateTimeFormat('fr-FR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      }).format(date);

      return `
        <li class="cal-agenda__jour">
          <p class="cal-agenda__date">${echapper(
            intitule.charAt(0).toUpperCase() + intitule.slice(1)
          )}</p>
          ${(parJour.get(cle) || []).map(calGabaritPastille).join('')}
        </li>
      `;
    })
    .join('');

  return `<ul class="cal-agenda">${entrees}</ul>`;
}

function rendreCalendrier() {
  const conteneurs = $$('[data-calendrier]');
  if (!conteneurs.length) return;

  if (!etatCalendrier.mois) etatCalendrier.mois = calMoisInitial();

  const parJour = calActivitesParJour();
  const enGrille = window.matchMedia(CAL_SEUIL_GRILLE).matches;

  const vue = enGrille ? calGabaritGrille(parJour) : calGabaritAgenda(parJour);

  conteneurs.forEach((conteneur) => {
    conteneur.innerHTML = `
      <div class="cal-entete">
        <button type="button" class="cal-nav" data-cal-mois="-1"
                aria-label="Mois précédent">
          ${picto('<path d="M15 6l-6 6 6 6"/>', 18)}
        </button>
        <p class="cal-titre" role="status" aria-live="polite">${echapper(
          calNomDuMois(etatCalendrier.mois)
        )}</p>
        <button type="button" class="cal-nav" data-cal-mois="1"
                aria-label="Mois suivant">
          ${picto('<path d="M9 6l6 6-6 6"/>', 18)}
        </button>
      </div>
      ${vue}
    `;
  });
}

/* ==========================================================================
   Branchement
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  const conteneurs = $$('[data-calendrier]');
  if (!conteneurs.length) return;

  rendreCalendrier();

  conteneurs.forEach((conteneur) => {
    conteneur.addEventListener('click', (evenement) => {
      const navigation = evenement.target.closest('[data-cal-mois]');
      if (navigation) {
        const pas = Number(navigation.dataset.calMois);
        etatCalendrier.mois = new Date(
          etatCalendrier.mois.getFullYear(),
          etatCalendrier.mois.getMonth() + pas,
          1
        );
        rendreCalendrier();
        return;
      }

      const sortie = evenement.target.closest('[data-cal-sortie]');
      // `ouvrirModale` vient d'activites.js, chargé avant celui-ci sur les
      // pages qui portent un calendrier. Le test garde le calendrier
      // utilisable si ce script venait à manquer.
      if (sortie && typeof ouvrirModale === 'function') {
        ouvrirModale(sortie.dataset.calSortie, sortie);
      }
    });
  });

  // Le passage grille ↔ agenda ne dépend que de la largeur : on réagit au
  // changement de palier plutôt qu'à chaque pixel de redimensionnement.
  const palier = window.matchMedia(CAL_SEUIL_GRILLE);
  const surChangement = () => rendreCalendrier();
  if (palier.addEventListener) palier.addEventListener('change', surChangement);
  else palier.addListener(surChangement);

  // Les jauges partagées arrivent après coup : « Complet » doit suivre.
  window.addEventListener('dps:donnees-pretes', rendreCalendrier);
});
