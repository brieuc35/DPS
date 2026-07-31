/**
 * DPS — Grille d'activités, filtres et réservation
 * ---------------------------------------------------------------------------
 * Alimente toute grille portant l'attribut [data-grille-activites] et gère la
 * modale de réservation (créée à la volée, donc disponible sur chaque page qui
 * charge ce script). Les réservations sont conservées dans localStorage.
 */

const CLE_RESERVATIONS = 'dps.reservations';

/* ==========================================================================
   État
   ========================================================================== */

const etatFiltres = {
  thematique: 'toutes',
  recherche: '',
  tri: 'date',
};

/** Réservations enregistrées localement : [{ activiteId, places, ... }] */
let reservations = Stockage.lire(CLE_RESERVATIONS, []);

/** Thématique retrouvée par identifiant, avec repli neutre. */
function trouverThematique(id) {
  return (
    THEMATIQUES.find((theme) => theme.id === id) || {
      id,
      nom: 'Activité',
      emoji: '📍',
      degrade: 'linear-gradient(150deg, #6b7f8c, #2f3f4a)',
    }
  );
}

/** Places déjà réservées localement pour une activité donnée. */
function placesReserveesLocalement(activiteId) {
  return reservations
    .filter((reservation) => reservation.activiteId === activiteId)
    .reduce((total, reservation) => total + reservation.places, 0);
}

/** Places encore disponibles, en tenant compte des réservations locales. */
function placesRestantes(activite) {
  const prises = activite.placesPrises + placesReserveesLocalement(activite.id);
  return Math.max(0, activite.placesTotal - prises);
}

/* ==========================================================================
   Rendu des cartes
   ========================================================================== */

function gabaritCarte(activite) {
  const theme = trouverThematique(activite.thematique);
  const restantes = placesRestantes(activite);
  const occupees = activite.placesTotal - restantes;
  const pourcentage = Math.round((occupees / activite.placesTotal) * 100);
  const presqueComplet = restantes > 0 && restantes <= 3;
  const complet = restantes === 0;

  const etiquetteDispo = complet
    ? '<span class="etiquette-flottante">Complet</span>'
    : presqueComplet
      ? `<span class="etiquette-flottante">Plus que ${restantes} place${restantes > 1 ? 's' : ''}</span>`
      : '';

  return `
    <article class="carte-activite apparait" data-activite="${activite.id}">
      <div class="carte-activite__visuel" style="background:${theme.degrade}">
        <div class="carte-activite__etiquettes">
          <span class="etiquette-flottante">${echapper(theme.nom)}</span>
          ${etiquetteDispo}
        </div>
        <span class="carte-activite__emoji" aria-hidden="true">${theme.emoji}</span>
      </div>

      <div class="carte-activite__corps">
        <div class="carte-activite__meta">
          <span><span aria-hidden="true">📍</span> ${echapper(activite.lieu)}</span>
          <span><span aria-hidden="true">🗓️</span> ${formaterDate(activite.date)}</span>
          <span><span aria-hidden="true">⏱️</span> ${echapper(activite.duree)}</span>
        </div>

        <h3 class="carte-activite__titre">${echapper(activite.titre)}</h3>
        <p class="carte-activite__desc">${echapper(activite.resume)}</p>

        <div class="jauge">
          <div class="jauge__entete">
            <span>${occupees} / ${activite.placesTotal} participants</span>
            <span>${complet ? 'Complet' : `${restantes} place${restantes > 1 ? 's' : ''} libre${restantes > 1 ? 's' : ''}`}</span>
          </div>
          <div class="jauge__barre" role="img"
               aria-label="${occupees} participants sur ${activite.placesTotal}">
            <div class="jauge__remplissage${presqueComplet || complet ? ' est-presque-complet' : ''}"
                 style="width:${pourcentage}%"></div>
          </div>
        </div>

        <div class="carte-activite__pied">
          <p class="prix">${activite.prix} €<small>par personne</small></p>
          <button type="button"
                  class="btn ${complet ? 'btn--fantome' : 'btn--primaire'}"
                  data-reserver="${activite.id}"
                  ${complet ? 'disabled' : ''}>
            ${complet ? 'Complet' : 'Réserver'}
          </button>
        </div>
      </div>
    </article>
  `;
}

/** Applique filtres, recherche et tri à la liste complète. */
function activitesFiltrees() {
  const requete = etatFiltres.recherche.trim().toLowerCase();

  const resultat = ACTIVITES.filter((activite) => {
    const bonneThematique =
      etatFiltres.thematique === 'toutes' ||
      activite.thematique === etatFiltres.thematique;

    if (!bonneThematique) return false;
    if (!requete) return true;

    const champs = [
      activite.titre,
      activite.lieu,
      activite.resume,
      trouverThematique(activite.thematique).nom,
    ]
      .join(' ')
      .toLowerCase();

    return champs.includes(requete);
  });

  const tris = {
    date: (a, b) => new Date(a.date) - new Date(b.date),
    prix: (a, b) => a.prix - b.prix,
    places: (a, b) => placesRestantes(b) - placesRestantes(a),
  };

  return resultat.sort(tris[etatFiltres.tri] || tris.date);
}

function rendreGrille() {
  const grille = $('[data-grille-activites]');
  if (!grille) return;

  const limite = Number(grille.dataset.limite) || Infinity;
  const liste = activitesFiltrees().slice(0, limite);
  const compteur = $('[data-compteur-activites]');

  if (compteur) {
    compteur.textContent =
      liste.length === 0
        ? 'Aucune activité'
        : `${liste.length} activité${liste.length > 1 ? 's' : ''} disponible${liste.length > 1 ? 's' : ''}`;
  }

  if (!liste.length) {
    grille.innerHTML = `
      <div class="message-vide">
        <span class="message-vide__emoji" aria-hidden="true">🧭</span>
        <h3>Rien ne correspond à votre recherche</h3>
        <p>Essayez une autre thématique, ou élargissez vos mots-clés.</p>
        <button type="button" class="btn btn--fantome" data-reinitialiser>Réinitialiser les filtres</button>
      </div>
    `;
    return;
  }

  grille.innerHTML = liste.map(gabaritCarte).join('');
  echelonnerApparitions(grille);
  initApparitions();
}

/* ==========================================================================
   Filtres
   ========================================================================== */

/**
 * Une ancre du type activites.html#brasserie présélectionne la thématique.
 * Renvoie true si l'état a changé.
 */
function appliquerAncre() {
  const ancre = window.location.hash.replace('#', '');
  if (!ancre || !THEMATIQUES.some((theme) => theme.id === ancre)) return false;
  if (etatFiltres.thematique === ancre) return false;

  etatFiltres.thematique = ancre;
  $$('[data-thematique]').forEach((bouton) =>
    bouton.setAttribute('aria-pressed', String(bouton.dataset.thematique === ancre))
  );
  return true;
}

function initFiltres() {
  appliquerAncre();

  const puces = $('[data-puces-thematiques]');

  if (puces) {
    const options = [{ id: 'toutes', nom: 'Toutes', emoji: '✨' }, ...THEMATIQUES];

    puces.innerHTML = options
      .map(
        (option) => `
          <li>
            <button type="button" class="puce" data-thematique="${option.id}"
                    aria-pressed="${option.id === etatFiltres.thematique}">
              <span aria-hidden="true">${option.emoji}</span> ${echapper(option.nom)}
            </button>
          </li>`
      )
      .join('');

    puces.addEventListener('click', (evenement) => {
      const bouton = evenement.target.closest('[data-thematique]');
      if (!bouton) return;

      etatFiltres.thematique = bouton.dataset.thematique;
      $$('[data-thematique]', puces).forEach((autre) =>
        autre.setAttribute('aria-pressed', String(autre === bouton))
      );
      rendreGrille();
    });
  }

  const recherche = $('[data-recherche]');
  if (recherche) {
    let minuteur;
    recherche.addEventListener('input', (evenement) => {
      clearTimeout(minuteur);
      const valeur = evenement.target.value;
      minuteur = setTimeout(() => {
        etatFiltres.recherche = valeur;
        rendreGrille();
      }, 180);
    });
  }

  const tri = $('[data-tri]');
  if (tri) {
    tri.addEventListener('change', (evenement) => {
      etatFiltres.tri = evenement.target.value;
      rendreGrille();
    });
  }

  // Bouton « réinitialiser » du message vide (délégation sur la grille).
  const grille = $('[data-grille-activites]');
  if (grille) {
    grille.addEventListener('click', (evenement) => {
      if (!evenement.target.closest('[data-reinitialiser]')) return;

      etatFiltres.thematique = 'toutes';
      etatFiltres.recherche = '';
      if (recherche) recherche.value = '';
      $$('[data-thematique]').forEach((bouton) =>
        bouton.setAttribute('aria-pressed', String(bouton.dataset.thematique === 'toutes'))
      );
      rendreGrille();
    });
  }
}

/* ==========================================================================
   Modale de réservation
   ========================================================================== */

let activiteEnCours = null;
let elementDeclencheur = null;

function creerModale() {
  if ($('#modale-reservation')) return;

  const modale = document.createElement('div');
  modale.className = 'modale';
  modale.id = 'modale-reservation';
  modale.setAttribute('role', 'dialog');
  modale.setAttribute('aria-modal', 'true');
  modale.setAttribute('aria-labelledby', 'modale-titre');
  modale.hidden = false;

  modale.innerHTML = `
    <div class="modale__voile" data-fermer-modale></div>
    <div class="modale__boite">
      <div class="modale__entete">
        <button type="button" class="modale__fermer" data-fermer-modale aria-label="Fermer la réservation">✕</button>
        <p class="sur-titre" data-modale-thematique>Réservation</p>
        <h2 class="modale__titre" id="modale-titre">Activité</h2>
        <p class="modale__resume" data-modale-resume></p>
      </div>

      <div class="modale__corps" data-modale-corps></div>
    </div>
  `;

  document.body.appendChild(modale);

  modale.addEventListener('click', (evenement) => {
    if (evenement.target.closest('[data-fermer-modale]')) fermerModale();
  });

  document.addEventListener('keydown', (evenement) => {
    if (!modale.classList.contains('est-ouverte')) return;

    if (evenement.key === 'Escape') {
      fermerModale();
      return;
    }

    // Piège à focus : le tabulateur reste dans la modale.
    if (evenement.key === 'Tab') {
      const focusables = $$(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        modale
      ).filter((element) => !element.disabled && element.offsetParent !== null);

      if (!focusables.length) return;

      const premier = focusables[0];
      const dernier = focusables[focusables.length - 1];

      if (evenement.shiftKey && document.activeElement === premier) {
        evenement.preventDefault();
        dernier.focus();
      } else if (!evenement.shiftKey && document.activeElement === dernier) {
        evenement.preventDefault();
        premier.focus();
      }
    }
  });
}

function gabaritFormulaire(activite) {
  const restantes = placesRestantes(activite);
  const maximum = Math.min(4, restantes);
  const theme = trouverThematique(activite.thematique);

  const optionsPlaces = Array.from({ length: maximum }, (_, index) => {
    const nombre = index + 1;
    return `<option value="${nombre}">${nombre} personne${nombre > 1 ? 's' : ''}</option>`;
  }).join('');

  return `
    <div class="recap">
      <div>
        <p class="recap__libelle" style="margin:0">Total pour <span data-recap-places>1 personne</span></p>
        <p style="margin:0;font-size:var(--t-xs);color:var(--texte-doux)">${activite.prix} € par personne</p>
      </div>
      <p class="recap__total" data-recap-total>${activite.prix} €</p>
    </div>

    <details style="margin-bottom:var(--e-5)">
      <summary style="cursor:pointer;font-weight:600;font-size:var(--t-sm)">
        Au programme <span aria-hidden="true">${theme.emoji}</span>
      </summary>
      <ul style="font-size:var(--t-sm);color:var(--texte-doux);margin-top:var(--e-3)">
        ${activite.programme.map((etape) => `<li>${echapper(etape)}</li>`).join('')}
      </ul>
      <p style="font-size:var(--t-sm);color:var(--texte-doux);margin:0">
        <strong>Inclus :</strong> ${activite.inclus.map(echapper).join(' · ')}
      </p>
    </details>

    <form data-formulaire-reservation novalidate>
      <div class="duo-champs">
        <div class="champ">
          <label class="champ__label" for="res-prenom">Prénom</label>
          <input class="saisie" id="res-prenom" name="prenom" type="text" autocomplete="given-name" required>
          <span class="champ__erreur">Merci d’indiquer votre prénom.</span>
        </div>
        <div class="champ">
          <label class="champ__label" for="res-nom">Nom</label>
          <input class="saisie" id="res-nom" name="nom" type="text" autocomplete="family-name" required>
          <span class="champ__erreur">Merci d’indiquer votre nom.</span>
        </div>
      </div>

      <div class="champ">
        <label class="champ__label" for="res-email">Adresse e-mail</label>
        <input class="saisie" id="res-email" name="email" type="email" autocomplete="email" required>
        <span class="champ__aide">Sert uniquement à vous envoyer la confirmation et le point de rendez-vous.</span>
        <span class="champ__erreur">Cette adresse e-mail ne semble pas valide.</span>
      </div>

      <div class="champ">
        <label class="champ__label" for="res-places">Nombre de places</label>
        <select class="selection" id="res-places" name="places" data-champ-places>
          ${optionsPlaces}
        </select>
        <span class="champ__aide">Vous venez seul·e ? C’est le cas d’un participant sur deux.</span>
      </div>

      <div class="champ">
        <label class="champ__label" for="res-mot">Un mot pour le groupe <span style="font-weight:400;color:var(--texte-doux)">(facultatif)</span></label>
        <textarea class="zone-texte" id="res-mot" name="mot" rows="3"
                  placeholder="Ex. : première sortie avec DPS, je viens seule et j’ai hâte de rencontrer du monde !"></textarea>
      </div>

      <div class="champ">
        <label style="display:flex;gap:var(--e-3);align-items:flex-start;font-size:var(--t-sm);cursor:pointer">
          <input type="checkbox" name="charte" required style="margin-top:0.3em;width:18px;height:18px;flex-shrink:0;accent-color:var(--primaire)">
          <span>J’adhère à la <a href="communaute.html#charte">charte de bienveillance</a> : écoute, respect et accueil des nouveaux venus.</span>
        </label>
        <span class="champ__erreur">L’adhésion à la charte est nécessaire pour rejoindre un groupe.</span>
      </div>

      <button type="submit" class="btn btn--primaire btn--large btn--bloc">
        Confirmer ma réservation
      </button>
      <p style="text-align:center;font-size:var(--t-xs);color:var(--texte-doux);margin:var(--e-3) 0 0">
        Aucun paiement demandé dans cette démonstration · Annulation libre jusqu’à 48 h avant
      </p>
    </form>
  `;
}

/** « 1 place restante » / « 3 places restantes ». */
function libellePlaces(nombre) {
  return `${nombre} place${nombre > 1 ? 's' : ''} restante${nombre > 1 ? 's' : ''}`;
}

function ouvrirModale(activiteId, declencheur) {
  const activite = ACTIVITES.find((element) => element.id === activiteId);
  if (!activite || placesRestantes(activite) === 0) return;

  creerModale();
  activiteEnCours = activite;
  elementDeclencheur = declencheur || null;

  const modale = $('#modale-reservation');
  const theme = trouverThematique(activite.thematique);

  $('[data-modale-thematique]', modale).textContent = theme.nom;
  $('#modale-titre', modale).textContent = activite.titre;
  $('[data-modale-resume]', modale).innerHTML = `
    <span>📍 ${echapper(activite.lieu)}</span>
    <span>🗓️ ${formaterDate(activite.date)}</span>
    <span>⏱️ ${echapper(activite.duree)}</span>
    <span>👥 ${libellePlaces(placesRestantes(activite))}</span>
  `;
  $('[data-modale-corps]', modale).innerHTML = gabaritFormulaire(activite);

  brancherFormulaire(modale, activite);

  modale.classList.add('est-ouverte');
  document.body.style.overflow = 'hidden';

  // Laisse la transition démarrer avant de déplacer le focus.
  requestAnimationFrame(() => {
    const premierChamp = $('#res-prenom', modale);
    if (premierChamp) premierChamp.focus();
  });
}

function fermerModale() {
  const modale = $('#modale-reservation');
  if (!modale) return;

  modale.classList.remove('est-ouverte');
  document.body.style.overflow = '';
  activiteEnCours = null;

  if (elementDeclencheur && document.contains(elementDeclencheur)) {
    elementDeclencheur.focus();
  }
  elementDeclencheur = null;
}

/** Validation et soumission du formulaire de réservation. */
function brancherFormulaire(modale, activite) {
  const formulaire = $('[data-formulaire-reservation]', modale);
  const champPlaces = $('[data-champ-places]', formulaire);
  const recapPlaces = $('[data-recap-places]', modale);
  const recapTotal = $('[data-recap-total]', modale);

  const majTotal = () => {
    const places = Number(champPlaces.value);
    recapPlaces.textContent = `${places} personne${places > 1 ? 's' : ''}`;
    recapTotal.textContent = `${places * activite.prix} €`;
  };

  champPlaces.addEventListener('change', majTotal);
  majTotal();

  // Retire le signalement d'erreur dès que l'utilisateur corrige son entrée.
  formulaire.addEventListener('input', (evenement) => {
    const champ = evenement.target.closest('.champ');
    if (champ) champ.classList.remove('est-invalide');
  });

  formulaire.addEventListener('submit', (evenement) => {
    evenement.preventDefault();

    const donnees = new FormData(formulaire);
    const controles = [
      ['prenom', (valeur) => valeur.trim().length >= 2],
      ['nom', (valeur) => valeur.trim().length >= 2],
      ['email', (valeur) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(valeur.trim())],
      ['charte', (valeur) => valeur === 'on'],
    ];

    let premierInvalide = null;

    controles.forEach(([nom, estValide]) => {
      const controle = formulaire.elements[nom];
      const champ = controle.closest('.champ');
      const valeur = donnees.get(nom) || '';

      if (estValide(valeur)) {
        champ.classList.remove('est-invalide');
      } else {
        champ.classList.add('est-invalide');
        if (!premierInvalide) premierInvalide = controle;
      }
    });

    if (premierInvalide) {
      premierInvalide.focus();
      return;
    }

    enregistrerReservation(activite, {
      prenom: donnees.get('prenom').trim(),
      nom: donnees.get('nom').trim(),
      email: donnees.get('email').trim(),
      places: Number(donnees.get('places')),
      mot: (donnees.get('mot') || '').trim(),
    });
  });
}

function enregistrerReservation(activite, participant) {
  // Garde-fou : une place a pu être prise pendant que la modale était ouverte.
  const disponibles = placesRestantes(activite);
  if (participant.places > disponibles) {
    notifier('Il ne reste plus assez de places pour ce groupe.', '⚠️');
    rendreGrille();
    fermerModale();
    return;
  }

  reservations = [
    ...reservations,
    {
      activiteId: activite.id,
      titre: activite.titre,
      places: participant.places,
      prenom: participant.prenom,
      email: participant.email,
      creeLe: new Date().toISOString(),
    },
  ];
  Stockage.ecrire(CLE_RESERVATIONS, reservations);

  const restantes = placesRestantes(activite);
  const modale = $('#modale-reservation');

  $('[data-modale-corps]', modale).innerHTML = `
    <div class="confirmation">
      <div class="confirmation__pastille" aria-hidden="true">✓</div>
      <h3>C’est réservé, ${echapper(participant.prenom)} !</h3>
      <p style="color:var(--texte-doux)">
        Votre place pour <strong>${echapper(activite.titre)}</strong> est confirmée
        le ${formaterDate(activite.date)}.<br>
        Un récapitulatif part vers ${echapper(participant.email)}.
      </p>

      <div class="recap" style="text-align:left">
        <div>
          <p class="recap__libelle" style="margin:0">Votre groupe</p>
          <p style="margin:0;font-size:var(--t-sm)">
            ${activite.placesTotal - restantes} participants inscrits ·
            ${libellePlaces(restantes)}
          </p>
        </div>
        <p class="recap__total">${participant.places * activite.prix} €</p>
      </div>

      <p style="font-size:var(--t-sm);color:var(--texte-doux)">
        Le fil de discussion du groupe s’ouvre 5 jours avant : vous saurez qui vient,
        et vous ne débarquerez pas devant des inconnus complets.
      </p>

      <div style="display:flex;gap:var(--e-3);flex-wrap:wrap;justify-content:center">
        <a class="btn btn--primaire" href="communaute.html">Rejoindre la conversation</a>
        <button type="button" class="btn btn--fantome" data-fermer-modale>Continuer à explorer</button>
      </div>
    </div>
  `;

  rendreGrille();
  notifier(`Réservation confirmée : ${activite.titre}`, '🎉');
}

/* ==========================================================================
   Démarrage
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  const grille = $('[data-grille-activites]');
  if (!grille) return;

  initFiltres();
  rendreGrille();
  creerModale();

  // Le lien d'une thématique depuis le pied de page ne recharge pas la page :
  // on réagit au changement d'ancre pour que le filtre suive quand même.
  window.addEventListener('hashchange', () => {
    if (appliquerAncre()) rendreGrille();
  });

  grille.addEventListener('click', (evenement) => {
    const bouton = evenement.target.closest('[data-reserver]');
    if (!bouton || bouton.disabled) return;
    ouvrirModale(bouton.dataset.reserver, bouton);
  });
});
