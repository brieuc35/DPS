/**
 * DPS Collective — Grille d'activités, recherche et réservation
 * ---------------------------------------------------------------------------
 * Alimente toute grille portant l'attribut [data-grille-activites] et gère la
 * modale de réservation (créée à la volée, donc disponible sur chaque page qui
 * charge ce script). Les réservations passent par Firestore quand un membre est
 * connecté — la place est alors prise dans une transaction, seule façon
 * d'empêcher deux personnes d'emporter la même dernière place. Sinon elles
 * restent dans localStorage.
 */

const CLE_RESERVATIONS = 'dps.reservations';

/* Icône cadeau — un paquet noué, dans le trait des autres pictogrammes du
   site, pas un émoji. Partagée par la carte et la modale. */
const ICONE_CADEAU =
  '<rect x="4" y="9.5" width="16" height="10.5" rx="1.2"/><path d="M4 9.5h16"/><path d="M12 9.5v10.5"/>' +
  '<path d="M12 9.5c-1.7 0-3.2-1.1-3.2-2.8C8.8 5.2 9.9 4 11.2 4c1.1 0 2 .9 2.1 2.1"/>' +
  '<path d="M12 9.5c1.7 0 3.2-1.1 3.2-2.8C15.2 5.2 14.1 4 12.8 4c-1.1 0-2 .9-2.1 2.1"/>';

/* Icône cadenas — la sortie non confirmée se lit comme verrouillée, pas
   comme signalée par une simple mise en garde. Partagée par la carte et la
   modale. */
const ICONE_CADENAS =
  '<rect x="5" y="11" width="14" height="9" rx="1.6"/><path d="M8 11V7.5a4 4 0 0 1 8 0V11"/>';

/**
 * La couverture d'une carte.
 *
 * Une photographie quand il y en a une : c'est elle qui donne envie, et la
 * charte lui demande de peser autant qu'une petite affiche.
 *
 * Sinon, le motif de la marque — la porte du D, son soleil et sa volée de
 * marches — détouré sur la couleur de la thématique. Ce n'est pas un
 * remplissage : « l'activité est la porte d'entrée » est la phrase qui définit
 * DPS, et le sigle la dessine déjà. Un substitut assumé vaut mieux qu'une
 * image de banque qui ferait croire au lieu.
 */
function couvertureDe(activite, theme) {
  if (activite.photo) {
    return `<img class="carte-activite__photo" src="${echapper(activite.photo)}"
                 alt="" width="600" height="400" loading="lazy" decoding="async">`;
  }

  // Tout tient dans un seul SVG — porte, marches et pictogramme imbriqué —
  // pour que les trois restent alignés quelle que soit la largeur de la
  // carte. Deux éléments superposés en CSS auraient dérivé l'un par rapport
  // à l'autre dès que le rapport de la vignette change.
  return `
    <span class="carte-activite__motif" aria-hidden="true" style="background:${theme.degrade}">
      <svg viewBox="0 0 120 80" preserveAspectRatio="xMidYMid meet" fill="none">
        <path d="M22 80v-7h9v7Zm9 0V69h9v11Zm9 0V64h6v16Z" fill="rgba(255,255,255,.1)"/>
        <path d="M46 80V50a14 14 0 0 1 28 0v30Z" fill="rgba(255,255,255,.15)"/>
        <svg x="48" y="38" width="24" height="24" viewBox="0 0 24 24" fill="none"
             stroke="rgba(255,255,255,.85)" stroke-width="1.6"
             stroke-linecap="round" stroke-linejoin="round">${theme.icone}</svg>
      </svg>
    </span>`;
}

/* ==========================================================================
   État
   ========================================================================== */

const etatFiltres = {
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
      icone: '',
      couleur: '#4d2f3f',
      degrade: 'linear-gradient(155deg, #4d2f3f, #2a1622)',
    }
  );
}

/**
 * Jauges venues de Firestore, par identifiant d'activité. Elles font autorité
 * quand elles existent : c'est le seul compteur que tout le monde partage.
 */
let jaugesPartagees = null;

/** Places déjà réservées localement pour une activité donnée. */
function placesReserveesLocalement(activiteId) {
  return reservations
    .filter((reservation) => reservation.activiteId === activiteId)
    .reduce((total, reservation) => total + reservation.places, 0);
}

/**
 * Les sorties auxquelles le membre connecté est déjà inscrit, tenues à jour
 * par Firestore. Côté règles, la double inscription est déjà impossible :
 * l'identifiant du document vaut « activité_uid ». Mais un refus au moment
 * d'envoyer le formulaire arrive trop tard — autant que la carte le dise
 * avant qu'on la remplisse.
 */
let mesInscriptions = new Set();

/**
 * Une inscription vaut pour une personne : un compte ne peut donc en avoir
 * qu'une par sortie. Hors connexion, le repère est la liste locale — c'est
 * alors « un navigateur, une place », ce qu'on peut faire de mieux sans
 * identité.
 */
function estInscrit(activiteId) {
  if (mesInscriptions.has(activiteId)) return true;
  return reservations.some((reservation) => reservation.activiteId === activiteId);
}

/** Le pont Firestore, ou null quand on tourne en local. */
function baseActivites() {
  return window.DPS_DB && window.DPS_DB.disponible ? window.DPS_DB : null;
}

/**
 * Le membre connecté, ou null. La confirmation par courriel n'existe que pour
 * lui : l'adresse qui la reçoit est celle de son compte, la seule qu'une règle
 * de sécurité puisse confronter à la session. Une inscription sans compte
 * n'ouvre donc aucun envoi — et les textes de la modale le disent, plutôt que
 * de promettre à tout le monde.
 */
function membreConnecte() {
  const compte = typeof Comptes !== 'undefined' ? Comptes.courant() : null;
  return baseActivites() && compte ? compte : null;
}

/** « Marseille, Bouches-du-Rhône » → « Marseille ». Le détail est dans la fiche. */
function ville(lieu) {
  return lieu.split(',')[0].trim();
}

/**
 * Places encore disponibles. Le compteur partagé l'emporte dès qu'il existe :
 * une place prise depuis un autre appareil doit se voir ici aussi.
 */
function placesRestantes(activite) {
  const partagee = jaugesPartagees && jaugesPartagees[activite.id];
  const prises =
    partagee !== undefined && partagee !== null
      ? partagee
      : activite.placesPrises + placesReserveesLocalement(activite.id);
  return Math.max(0, activite.placesTotal - prises);
}

/* ==========================================================================
   Rendu des cartes
   ========================================================================== */

/**
 * En dessous de `placesMinimum`, la sortie est ouverte aux réservations mais
 * pas encore garantie — c'est la version chiffrée de ce que les CGU disent
 * déjà : « une sortie peut être annulée ou reportée, notamment faute de
 * participants ». Rendu commun à la carte, à la modale et à la confirmation,
 * pour que les trois racontent toujours la même histoire.
 */
function etatConfirmation(activite, occupees) {
  const minimum = activite.placesMinimum;
  if (!minimum) return null;

  const manquants = minimum - occupees;
  return {
    minimum,
    confirmee: manquants <= 0,
    manquants: Math.max(0, manquants),
  };
}

const ICONE_AGENDA =
  '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 11h18"/>';

/* Une horloge plutôt qu'un agenda quand la date n'est pas fixée : l'agenda
   promet une case dans un mois, l'horloge dit seulement que ça viendra. */
const ICONE_ATTENTE =
  '<circle cx="12" cy="12" r="9"/><path d="M12 7.5V12l3 2"/>';

/**
 * La ligne de date d'une carte. Une sortie programmée annonce son jour ; une
 * sortie qui attend encore sa date le dit, plutôt que d'afficher un blanc ou
 * — pire — une date de remplissage.
 */
function ligneDate(activite) {
  if (activiteEstDatee(activite)) {
    return `<span>${picto(ICONE_AGENDA, 14)} ${formaterDateCourte(activite.date)}</span>`;
  }
  return `<span class="carte-activite__attente">${picto(ICONE_ATTENTE, 14)} Date à venir</span>`;
}

function gabaritCarte(activite) {
  const theme = trouverThematique(activite.thematique);
  const restantes = placesRestantes(activite);
  const occupees = activite.placesTotal - restantes;
  const pourcentage = Math.round((occupees / activite.placesTotal) * 100);
  const presqueComplet = restantes > 0 && restantes <= 3;
  const complet = restantes === 0;
  const confirmation = etatConfirmation(activite, occupees);
  const inscrit = estInscrit(activite.id);

  const etiquetteDispo = complet
    ? '<span class="etiquette-flottante carte-activite__dispo">Complet</span>'
    : presqueComplet
      ? `<span class="etiquette-flottante carte-activite__dispo">Plus que ${restantes} place${restantes > 1 ? 's' : ''}</span>`
      : '';

  const seuilPourcentage = confirmation
    ? Math.round((confirmation.minimum / activite.placesTotal) * 100)
    : null;

  const badgeConfirmation = !confirmation
    ? ''
    : confirmation.confirmee
      ? `<span class="badge badge--accent">${picto('<path d="M20 6 9 17l-5-5"/>', 13)} Sortie confirmée</span>`
      : `<span class="badge badge--petit">${picto(ICONE_CADENAS, 12)} Encore ${confirmation.manquants} participant${confirmation.manquants > 1 ? 's' : ''} pour débloquer</span>`;

  const etiquetteCadeau = activite.cadeau
    ? `<span class="etiquette-flottante carte-activite__cadeau" title="${echapper(activite.cadeau)}">
         ${picto(ICONE_CADEAU, 13)} Cadeau
       </span>`
    : '';

  return `
    <article class="carte-activite apparait" data-activite="${activite.id}">
      <div class="carte-activite__visuel">
        ${couvertureDe(activite, theme)}
        <div class="carte-activite__etiquettes">
          <span class="etiquette-flottante">${echapper(theme.nom)}</span>
          <span class="etiquette-flottante etiquette-flottante--prix">${activite.prix} € <small>/ pers.</small></span>
        </div>
        ${etiquetteDispo}
        ${etiquetteCadeau}
      </div>

      <div class="carte-activite__corps">
        <div class="carte-activite__meta">
          <span>${picto('<path d="M12 21s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11Z"/><circle cx="12" cy="10" r="2.6"/>', 14)} ${echapper(ville(activite.lieu))}</span>
          ${ligneDate(activite)}
        </div>

        <h3 class="carte-activite__titre">${echapper(activite.titre)}</h3>

        <div class="jauge">
          <div class="jauge__entete">
            <span>${occupees} / ${activite.placesTotal} participants</span>
          </div>
          <div class="jauge__piste">
            <div class="jauge__barre" role="img"
                 aria-label="${occupees} participants sur ${activite.placesTotal}${
    confirmation ? `, ${confirmation.minimum} nécessaires pour débloquer la sortie` : ''
  }">
              <div class="jauge__remplissage${presqueComplet || complet ? ' est-presque-complet' : ''}"
                   style="width:${pourcentage}%"></div>
            </div>
            ${
              seuilPourcentage
                ? `<span class="jauge__seuil" style="left:${seuilPourcentage}%"
                         title="Seuil de déblocage : ${confirmation.minimum} participants"></span>`
                : ''
            }
          </div>
          ${badgeConfirmation ? `<p class="carte-activite__confirmation">${badgeConfirmation}</p>` : ''}
        </div>

        <div class="carte-activite__pied">
          <button type="button"
                  class="btn btn--bloc ${complet || inscrit ? 'btn--fantome' : 'btn--primaire'}"
                  data-reserver="${activite.id}"
                  ${complet || inscrit ? 'disabled' : ''}>
            ${
              inscrit
                ? picto('<path d="M20 6 9 17l-5-5"/>', 15) + ' Vous êtes inscrit·e'
                : complet
                  ? 'Complet'
                  : activiteEstDatee(activite)
                    ? 'Je participe'
                    : 'Ça m’intéresse'
            }
          </button>
        </div>
      </div>
    </article>
  `;
}

/** Applique la recherche et le tri à la liste complète. */
function activitesFiltrees() {
  const requete = etatFiltres.recherche.trim().toLowerCase();

  const resultat = activitesAvenir().filter((activite) => {
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
    // Les sorties déjà calées d'abord, dans l'ordre du calendrier ; celles
    // qui attendent leur date ensuite, par ordre alphabétique. Sans ce
    // traitement, `new Date(null)` les daterait de 1970 et les placerait en
    // tête — juste avant des sorties qui, elles, ont un jour et une heure.
    date: (a, b) => {
      if (activiteEstDatee(a) !== activiteEstDatee(b)) return activiteEstDatee(a) ? -1 : 1;
      if (!activiteEstDatee(a)) return a.titre.localeCompare(b.titre, 'fr');
      return new Date(a.date) - new Date(b.date);
    },
    prix: (a, b) => a.prix - b.prix,
    places: (a, b) => placesRestantes(b) - placesRestantes(a),
  };

  return resultat.sort(tris[etatFiltres.tri] || tris.date);
}

/**
 * Rend toutes les grilles présentes dans la page. Chacune peut limiter le
 * nombre de cartes affichées via l'attribut data-limite : l'accueil n'en montre
 * qu'une sélection, le catalogue les affiche toutes.
 */
function rendreGrille() {
  const grilles = $$('[data-grille-activites]');
  if (!grilles.length) return;

  const resultats = activitesFiltrees();

  $$('[data-compteur-activites]').forEach((compteur) => {
    compteur.textContent =
      resultats.length === 0
        ? 'Aucune activité'
        : `${resultats.length} activité${resultats.length > 1 ? 's' : ''} disponible${resultats.length > 1 ? 's' : ''}`;
  });

  grilles.forEach((grille) => {
    const limite = Number(grille.dataset.limite) || Infinity;
    const liste = resultats.slice(0, limite);

    if (!liste.length) {
      // Deux raisons bien différentes à une grille vide : soit la recherche
      // ne correspond à rien, soit aucune sortie à venir n'est au catalogue
      // pour l'instant — ce n'est pas un problème de recherche, et le message
      // ne doit pas laisser croire qu'il suffirait de l'effacer.
      grille.innerHTML = !activitesAvenir().length
        ? `
          <div class="message-vide">
            <span class="message-vide__picto" aria-hidden="true">${picto('<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 11h18"/>', 34)}</span>
            <h3>Aucune sortie n’est prévue pour l’instant</h3>
            <p>Le programme s’étoffera au fil des lieux et des savoir-faire que nous rencontrons. Revenez bientôt.</p>
          </div>
        `
        : `
          <div class="message-vide">
            <span class="message-vide__picto" aria-hidden="true">${picto('<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>', 34)}</span>
            <h3>Rien ne correspond à votre recherche</h3>
            <p>Essayez d’autres mots-clés : une ville, une envie, un type de sortie.</p>
            <button type="button" class="btn btn--fantome" data-reinitialiser>Effacer la recherche</button>
          </div>
        `;
      return;
    }

    grille.innerHTML = liste.map(gabaritCarte).join('');
    echelonnerApparitions(grille);
  });

  initApparitions();
}

/* ==========================================================================
   Filtres
   ========================================================================== */

/**
 * Une ancre du type activites.html#brasserie pré-remplit la recherche avec le
 * nom de la thématique. Le filtre reste ainsi visible dans le champ, et
 * l'utilisateur peut l'effacer comme n'importe quelle recherche.
 * Renvoie true si l'état a changé.
 */
function appliquerAncre() {
  const ancre = window.location.hash.replace('#', '');
  const theme = THEMATIQUES.find((element) => element.id === ancre);
  if (!theme || etatFiltres.recherche === theme.nom) return false;

  etatFiltres.recherche = theme.nom;
  $$('[data-recherche]').forEach((champ) => {
    champ.value = theme.nom;
  });
  return true;
}

function initFiltres() {
  appliquerAncre();

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

  // Bouton « effacer » du message vide (délégation sur chaque grille).
  $$('[data-grille-activites]').forEach((grille) => {
    grille.addEventListener('click', (evenement) => {
      if (!evenement.target.closest('[data-reinitialiser]')) return;

      etatFiltres.recherche = '';
      if (recherche) recherche.value = '';
      rendreGrille();
    });
  });
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
  const theme = trouverThematique(activite.thematique);
  const confirmation = etatConfirmation(activite, activite.placesTotal - restantes);

  // Avant de s'engager, autant savoir si la sortie est déjà garantie ou si
  // cette réservation compte parmi celles qui la confirmeront.
  const noteConfirmation = !confirmation
    ? ''
    : confirmation.confirmee
      ? `<p class="note-confirmation note-confirmation--acquise">
           ${picto('<path d="M20 6 9 17l-5-5"/>', 15)}
           Cette sortie est déjà confirmée : elle aura lieu quoi qu’il arrive.
         </p>`
      : `<p class="note-confirmation">
           ${picto(ICONE_CADENAS, 15)}
           Encore ${confirmation.manquants} participant${confirmation.manquants > 1 ? 's' : ''}
           pour débloquer cette sortie — en dessous de
           ${confirmation.minimum} participants, elle peut être annulée ou reportée.
         </p>`;

  const noteCadeau = activite.cadeau
    ? `<p class="note-confirmation note-confirmation--cadeau">
         ${picto(ICONE_CADEAU, 15)}
         ${echapper(activite.cadeau)}
       </p>`
    : '';

  return `
    <p class="plomb" style="font-size:var(--t-sm);margin-bottom:var(--e-5)">
      ${echapper(activite.resume)}
    </p>

    ${noteCadeau}
    ${noteConfirmation}

    <div class="recap">
      <div>
        <p class="recap__libelle" style="margin:0">Votre place</p>
        <p style="margin:0;font-size:var(--t-xs);color:var(--texte-doux)">
          Une inscription par personne, réglée sur place
        </p>
      </div>
      <p class="recap__total">${activite.prix} €</p>
    </div>

    ${
      membreConnecte()
        ? (Comptes.emailVerifie()
            ? `<p class="champ__aide" style="margin-bottom:var(--e-5)">
                 La confirmation part par e-mail à l’adresse de votre compte, avec le
                 lieu, le tarif et le déroulé.
               </p>`
            : `<p class="champ__aide" style="margin-bottom:var(--e-5)">
                 Votre adresse n’est pas encore confirmée : le récapitulatif ne pourra
                 pas vous être envoyé. Ouvrez le lien reçu à l’inscription, ou
                 <a href="compte.html">renvoyez-le depuis votre compte</a>.
               </p>`)
        : `<p class="champ__aide" style="margin-bottom:var(--e-5)">
             Votre inscription est enregistrée sur cet appareil. Pour recevoir la
             confirmation par e-mail et retrouver vos sorties ailleurs,
             <a href="compte.html#inscription">créez un compte</a>.
           </p>`
    }

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
        <span class="champ__aide">Sert à vous reconnaître le jour de la sortie.</span>
        <span class="champ__erreur">Cette adresse e-mail ne semble pas valide.</span>
      </div>

      <div class="champ">
        <label class="champ__label" for="res-mot">Un mot avant la sortie <span style="font-weight:400;color:var(--texte-doux)">(facultatif)</span></label>
        <textarea class="zone-texte" id="res-mot" name="mot" rows="3"
                  placeholder="Une question sur le déroulé, une précision utile, un simple bonjour."></textarea>
      </div>

      <div class="champ">
        <label style="display:flex;gap:var(--e-3);align-items:flex-start;font-size:var(--t-sm);cursor:pointer">
          <input type="checkbox" name="charte" required style="margin-top:0.3em;width:18px;height:18px;flex-shrink:0;accent-color:var(--primaire)">
          <span>J’adhère à la <a href="index.html#charte">charte de bienveillance</a> : écoute, respect et accueil des nouveaux venus.</span>
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
  // Le garde-fou vaut aussi pour une sortie passée : la grille et le
  // calendrier ne l'affichent plus, mais un lien resté ailleurs — une
  // annonce dans le fil, une page mise en favori — pourrait encore y mener.
  if (!activite || activiteEstPassee(activite) || placesRestantes(activite) === 0) return;

  // Une inscription par compte : rouvrir le formulaire ne mènerait qu'à un
  // refus une fois rempli.
  if (estInscrit(activite.id)) {
    notifier('Vous êtes déjà inscrit·e à cette sortie.');
    return;
  }

  creerModale();
  activiteEnCours = activite;
  elementDeclencheur = declencheur || null;

  const modale = $('#modale-reservation');
  const theme = trouverThematique(activite.thematique);

  $('[data-modale-thematique]', modale).textContent = theme.nom;
  $('#modale-titre', modale).textContent = activite.titre;
  $('[data-modale-resume]', modale).innerHTML = `
    <span>${picto('<path d="M12 21s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11Z"/><circle cx="12" cy="10" r="2.6"/>', 14)} ${echapper(activite.lieu)}</span>
    <span>${activiteEstDatee(activite)
      ? picto(ICONE_AGENDA, 14) + ' ' + formaterDate(activite.date)
      : picto(ICONE_ATTENTE, 14) + ' Prochaine date à venir'}</span>
    <span>${picto('<path d="M16 20v-1.5a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4V20"/><circle cx="9.5" cy="7.5" r="3.2"/><path d="M21 20v-1.5a4 4 0 0 0-3-3.8"/><path d="M16 4.3a3.2 3.2 0 0 1 0 6.2"/>', 14)} ${libellePlaces(placesRestantes(activite))}</span>
  `;
  $('[data-modale-corps]', modale).innerHTML = gabaritFormulaire(activite);

  brancherFormulaire(modale, activite);
  preremplirDepuisCompte(modale);

  modale.classList.add('est-ouverte');
  document.body.style.overflow = 'hidden';

  // Laisse la transition démarrer avant de déplacer le focus.
  requestAnimationFrame(() => {
    const premierChamp = $('#res-prenom', modale);
    if (premierChamp) premierChamp.focus();
  });
}

/** Un membre connecté ne redonne pas son identité à chaque réservation. */
function preremplirDepuisCompte(modale) {
  const compte = typeof Comptes !== 'undefined' ? Comptes.courant() : null;
  if (!compte) return;

  const remplir = (selecteur, valeur) => {
    const champ = $(selecteur, modale);
    if (champ) champ.value = valeur;
  };

  remplir('#res-prenom', compte.prenom);
  remplir('#res-nom', compte.nom);
  remplir('#res-email', compte.email);
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

    void enregistrerReservation(activite, {
      prenom: donnees.get('prenom').trim(),
      nom: donnees.get('nom').trim(),
      email: donnees.get('email').trim(),
      // Une inscription vaut une place et une seule : un compte, une place.
      // La valeur reste transmise parce que le compteur partagé et les règles
      // Firestore raisonnent en places, pas en inscriptions.
      places: 1,
      mot: (donnees.get('mot') || '').trim(),
    });
  });
}

/**
 * Les valeurs insérées dans le gabarit de la confirmation.
 *
 * Rien ici n'est du texte de message : ce sont des données, et c'est le
 * gabarit — hébergé dans Firestore, hors d'atteinte du navigateur — qui décide
 * des phrases. La liste des clés est reprise telle quelle dans les règles de
 * sécurité : en ajouter une ici sans l'ajouter là-bas ferait refuser l'envoi.
 */
function donneesConfirmation(activite, membre) {
  const restantes = placesRestantes(activite);
  const confirmation = etatConfirmation(activite, activite.placesTotal - restantes);

  return {
    prenom: membre.prenom || 'Bonjour',
    titre: activite.titre,
    lieu: activite.lieu,
    // Vide quand la sortie n'est pas encore programmée : le gabarit bascule
    // alors sur sa formulation d'attente plutôt que d'annoncer un jour.
    date: activiteEstDatee(activite) ? formaterDate(activite.date) : '',
    duree: activite.duree || '',
    prix: String(activite.prix),
    cadeau: activite.cadeau || '',
    manquants: confirmation && !confirmation.confirmee ? String(confirmation.manquants) : '',
  };
}

async function enregistrerReservation(activite, participant) {
  // La promesse de mise en file du courriel, à attendre avant toute
  // navigation. Nulle pour une inscription sans compte : aucun envoi n'a lieu.
  let confirmationEnVol = null;

  // Garde-fou : la dernière place a pu partir pendant que la modale était
  // ouverte.
  if (placesRestantes(activite) < 1) {
    notifier('La dernière place vient d’être prise.');
    rendreGrille();
    fermerModale();
    return;
  }

  const distant = baseActivites();
  const membre = typeof Comptes !== 'undefined' ? Comptes.courant() : null;

  // Membre connecté et base partagée : la place est prise dans une transaction,
  // seule façon d'empêcher deux personnes d'emporter la même dernière place.
  if (distant && membre) {
    const resultat = await distant.reserver({
      activiteId: activite.id,
      placesTotal: activite.placesTotal,
      placesInitiales: activite.placesPrises,
      membreId: membre.id,
      participant: { ...participant, titre: activite.titre },
    });

    if (!resultat.ok) {
      const messages = {
        complet: 'Quelqu’un vient de prendre la dernière place.',
        'deja-inscrit': 'Vous êtes déjà inscrit·e à cette sortie.',
        echec: 'Réservation impossible. Vérifiez votre connexion.',
      };
      notifier(messages[resultat.motif] || messages.echec);
      rendreGrille();
      return;
    }

    // La place est prise : la confirmation part maintenant. L'adresse est
    // celle du compte, jamais celle saisie dans le formulaire — c'est la seule
    // qu'une règle de sécurité puisse confronter à la session, et donc la
    // seule qui empêche d'expédier du courrier à un tiers depuis le site.
    //
    // L'envoi est lancé ici mais attendu plus bas, juste avant la redirection
    // vers le fil du groupe : le travail d'affichage qui suit recouvre ainsi
    // l'aller-retour réseau. Le laisser partir sans l'attendre le perdrait —
    // la navigation détruit le contexte de la page, et la file d'écriture de
    // Firestore ne vit qu'en mémoire, aucune persistance n'étant configurée.
    confirmationEnVol = distant.envoyerConfirmation({
      activiteId: activite.id,
      membreId: membre.id,
      adresse: membre.email,
      donnees: donneesConfirmation(activite, membre),
    });
  } else {
    // Hors connexion, rien ne garantit l'identité : la liste locale est le
    // seul repère disponible pour ne pas compter deux fois la même personne.
    if (estInscrit(activite.id)) {
      notifier('Vous êtes déjà inscrit·e à cette sortie.');
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
  }

  // Le fil du groupe affiche un bandeau de confirmation à l'arrivée : c'est
  // lui qui porte la nouvelle, puisqu'on y est emmené directement.
  Stockage.ecrire('dps.derniereReservation', {
    activiteId: activite.id,
    titre: activite.titre,
    creeLe: new Date().toISOString(),
  });

  const restantes = placesRestantes(activite);
  const modale = $('#modale-reservation');
  const compte = typeof Comptes !== 'undefined' ? Comptes.courant() : null;

  rendreGrille();
  const adresseConfirmee =
    typeof Comptes === 'undefined' || !compte ? false : Comptes.emailVerifie();

  notifier(
    !compte
      ? `Réservation confirmée : ${activite.titre}`
      : adresseConfirmee
        ? `Réservation confirmée. Le récapitulatif part vers ${compte.email}.`
        // Le récapitulatif ne partira pas : les règles refusent d'écrire vers
        // une adresse non confirmée. Le taire laisserait attendre un courriel
        // qui n'arrivera jamais.
        : 'Réservation confirmée. Confirmez votre adresse depuis votre compte pour recevoir le récapitulatif.');

  // Membre connecté : direction le groupe, sans étape intermédiaire. La modale
  // est refermée d'abord — dans la version fichier unique, rien ne recharge la
  // page et elle resterait posée par-dessus le fil, défilement bloqué.
  if (compte) {
    // Une seconde au plus : passé ce délai, mieux vaut un courriel manqué
    // qu'un membre bloqué sur une modale qui ne se ferme pas. L'inscription,
    // elle, est acquise dans tous les cas.
    if (confirmationEnVol) {
      await Promise.race([
        confirmationEnVol,
        new Promise((resoudre) => setTimeout(resoudre, 1000)),
      ]);
    }
    fermerModale();
    allerVers('chat', `groupe-${activite.id}`);
    return;
  }

  // Sans compte, le fil n'est pas accessible : on confirme ici et on explique
  // ce qui manque pour y entrer.
  $('[data-modale-corps]', modale).innerHTML = `
    <div class="confirmation">
      <div class="confirmation__pastille" aria-hidden="true">✓</div>
      <h3>${activiteEstDatee(activite)
        ? `C’est réservé, ${echapper(participant.prenom)} !`
        : `C’est noté, ${echapper(participant.prenom)} !`}</h3>
      <p style="color:var(--texte-doux)">
        ${activiteEstDatee(activite)
          ? `Votre place pour <strong>${echapper(activite.titre)}</strong> est confirmée
             le ${formaterDate(activite.date)}.`
          : `Votre place pour <strong>${echapper(activite.titre)}</strong> est retenue.
             La date n’est pas encore calée avec le lieu : elle le sera dès que le
             groupe sera au complet, et vous la recevrez avant tout le monde.`}
        <br>
        Votre inscription est gardée sur cet appareil.
      </p>

      <div class="recap" style="text-align:left">
        <div>
          <p class="recap__libelle" style="margin:0">Votre groupe</p>
          <p style="margin:0;font-size:var(--t-sm)">
            ${activite.placesTotal - restantes} participants inscrits ·
            ${libellePlaces(restantes)}
          </p>
        </div>
        <p class="recap__total">${activite.prix} €</p>
      </div>

      <p style="font-size:var(--t-sm);color:var(--texte-doux)">
        Le groupe a son fil de discussion : vous saurez qui vient, et vous ne
        débarquerez pas devant des inconnus complets. Il faut un compte pour y entrer.
      </p>

      <div style="display:flex;gap:var(--e-3);flex-wrap:wrap;justify-content:center">
        <a class="btn btn--primaire" href="compte.html#inscription">Créer mon compte</a>
        <button type="button" class="btn btn--fantome" data-fermer-modale>Plus tard</button>
      </div>
    </div>
  `;
}

/**
 * Le pont vers le fil de la communauté : chaque activité du catalogue y
 * obtient une annonce, créée par le premier membre connecté qui charge cette
 * page après son ouverture. Le site n'a pas de service qui tourne seul en
 * arrière-plan — ce sont les visites qui font le travail, une fois chacune,
 * grâce à l'identifiant déterministe que `annoncerActivite` pose côté
 * Firestore (voir firebase-donnees.js).
 */
async function synchroniserAnnonces() {
  const distant = baseActivites();
  const compte = typeof Comptes !== 'undefined' ? Comptes.courant() : null;
  if (!distant || !compte) return;

  // Une sortie passée n'a plus rien d'une « nouvelle sortie ouverte » — pas
  // la peine de l'annoncer, même une seule fois.
  for (const activite of activitesAvenir()) {
    await distant.annoncerActivite(
      activite.id,
      {
        auteur: 'DPS Collective',
        initiales: 'DP',
        couleur: 'avatar',
        cercle: activite.thematique,
        contenu: activiteEstDatee(activite)
          ? `Nouvelle sortie ouverte : ${activite.titre}, le ${formaterDate(activite.date)}. ${activite.resume}`
          : `Nouvelle sortie proposée : ${activite.titre}. ${activite.resume} La date sera fixée dès que le groupe sera formé.`,
        badge: 'Annonce',
      },
      compte.id
    );
  }
}

/* ==========================================================================
   Démarrage
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  const grilles = $$('[data-grille-activites]');
  if (!grilles.length) return;

  // Compteurs rédactionnels (« Voir les N activités »), tenus à jour depuis
  // les données pour ne pas se désynchroniser du catalogue — et réduits aux
  // sorties à venir, sinon le chiffre resterait vrai un temps puis mentirait
  // dès la première date dépassée.
  $$('[data-total-activites]').forEach((element) => {
    element.textContent = activitesAvenir().length;
  });

  initFiltres();
  rendreGrille();
  creerModale();

  // Les jauges partagées arrivent après le premier rendu : Firestore démarre
  // en module, donc après les scripts classiques.
  let jaugesBranchees = false;
  const suivreJauges = () => {
    const distant = baseActivites();
    if (!distant || jaugesBranchees) return;
    jaugesBranchees = true;
    distant.ecouterJauges((jauges) => {
      jaugesPartagees = jauges;
      rendreGrille();
    });
  };

  suivreJauges();
  window.addEventListener('dps:donnees-pretes', suivreJauges);

  // Mêmes précautions que pour les annonces : le compte et Firestore arrivent
  // par deux événements distincts, sans ordre garanti.
  let desabonnerInscriptions = null;
  let membreSuivi = null;
  const suivreMesInscriptions = () => {
    const distant = baseActivites();
    const compte = typeof Comptes !== 'undefined' ? Comptes.courant() : null;
    const id = compte ? compte.id : null;
    if (id === membreSuivi) return;

    if (desabonnerInscriptions) desabonnerInscriptions();
    desabonnerInscriptions = null;
    membreSuivi = id;

    // À la déconnexion, les inscriptions de l'ancien membre ne doivent plus
    // marquer les cartes.
    if (!distant || !id) {
      mesInscriptions = new Set();
      rendreGrille();
      return;
    }

    desabonnerInscriptions = distant.ecouterMesReservations(id, (liste) => {
      mesInscriptions = new Set(liste.map((reservation) => reservation.activiteId));
      rendreGrille();
    });
  };
  suivreMesInscriptions();
  window.addEventListener('dps:session', suivreMesInscriptions);
  window.addEventListener('dps:donnees-pretes', suivreMesInscriptions);

  // Le compte et Firestore arrivent chacun par leur propre événement, sans
  // garantie d'ordre : on retente sur les deux jusqu'à ce que les deux soient
  // là, puis on s'arrête — la fonction elle-même est sans effet au-delà de la
  // première réussite par activité, mais rien ne sert de la rappeler sans fin.
  let annoncesSynchronisees = false;
  const tenterSynchronisation = () => {
    const compte = typeof Comptes !== 'undefined' ? Comptes.courant() : null;
    if (annoncesSynchronisees || !baseActivites() || !compte) return;
    annoncesSynchronisees = true;
    synchroniserAnnonces();
  };
  tenterSynchronisation();
  window.addEventListener('dps:session', tenterSynchronisation);
  window.addEventListener('dps:donnees-pretes', tenterSynchronisation);

  // Le lien d'une thématique depuis le pied de page ne recharge pas la page :
  // on réagit au changement d'ancre pour que le filtre suive quand même.
  window.addEventListener('hashchange', () => {
    if (appliquerAncre()) rendreGrille();
  });

  grilles.forEach((grille) => {
    grille.addEventListener('click', (evenement) => {
      const bouton = evenement.target.closest('[data-reserver]');
      if (!bouton || bouton.disabled) return;
      ouvrirModale(bouton.dataset.reserver, bouton);
    });
  });
});
