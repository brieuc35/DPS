/**
 * DPS — Fil de la communauté
 * ---------------------------------------------------------------------------
 * Composeur de message, filtrage par cercle, soutiens et réponses. Les
 * publications passent par Firestore quand un membre est connecté — c'est ce
 * qui rend le fil réellement partagé entre deux personnes sur deux appareils.
 * Sinon (aperçu hors ligne, tests) tout reste dans localStorage, comme pour
 * les comptes.
 *
 * Lire le fil ne demande jamais de compte : les publications sont publiques
 * dans les règles de sécurité, exactement comme les jauges des activités —
 * seule la question d'entrée du portail (plus bas dans ce fichier) filtre qui
 * arrive jusque-là, et elle reste une question, pas une vérification.
 * Publier, soutenir ou répondre, en revanche, exige une identité que
 * Firestore puisse confronter à la session : un texte tapé dans un
 * navigateur ne prouve rien à personne d'autre une fois le fil partagé.
 */

const CLE_ADHESION = 'dps.adhesion';
const CLE_PUBLICATIONS = 'dps.publications';
const CLE_JAIMES = 'dps.jaimes';
const CLE_REPONSES = 'dps.reponses';

const LIMITE_CARACTERES = 600;

/* État local (mode hors ligne) ---------------------------------------------- */

let publicationsUtilisateur = Stockage.lire(CLE_PUBLICATIONS, []);
let jaimesLocaux = Stockage.lire(CLE_JAIMES, []);
let reponsesUtilisateurLocales = Stockage.lire(CLE_REPONSES, {});

/* État tenu par les écouteurs Firestore. Tant que `filDistant` vaut null, le
   fil n'a pas encore répondu : on n'affiche pas « le fil vient d'ouvrir » sur
   une simple latence réseau. */
let filDistant = null;
let desabonnerFil = null;
let mesJaimesDistants = [];
let desabonnerJaimes = null;

/* Un écouteur de réponses par publication actuellement dépliée — posé à
   l'ouverture du panneau, jamais avant : suivre les réponses de chaque
   publication du fil en permanence ouvrirait des dizaines d'écouteurs pour
   des panneaux que personne ne regarde. */
const reponsesDistantes = {};
const desabonnerReponses = {};

let cercleActif = 'tous';

/**
 * Termes qui déclenchent un rappel — jamais un blocage. L'idée n'est pas de
 * censurer mais d'inviter à relire son message avant de l'envoyer.
 */
const MOTS_SENSIBLES = [
  'nul', 'nulle', 'débile', 'debile', 'idiot', 'idiote', 'stupide',
  'ridicule', 'honte', 'hontuex', 'incompétent', 'incompetent',
  'ferme-la', 'ta gueule', 'dégage', 'degage', 'imbécile', 'imbecile',
  'raté', 'rate', 'pathétique', 'pathetique', 'arnaque', 'escroc',
];

/* ==========================================================================
   Données
   ========================================================================== */

/** Le pont Firestore, ou null quand on tourne en local. */
function base() {
  return window.DPS_DB && window.DPS_DB.disponible ? window.DPS_DB : null;
}

/** Profil affiché pour les contributions de l'utilisateur en mode local. */
function profilCourant() {
  // Le compte fait foi quand il existe ; sinon on retombe sur le prénom donné
  // à la dernière réservation, qui reste possible sans inscription. Ce repli
  // n'a de sens qu'en mode local : une fois le fil partagé, une identité que
  // Firestore ne peut pas vérifier ne suffit plus (voir `identiteRequise`).
  const membre = typeof Comptes !== 'undefined' ? Comptes.courant() : null;
  if (membre) {
    return {
      nom: Comptes.nomAffiche(membre),
      initiales: Comptes.initiales(membre),
      couleur: membre.couleur,
    };
  }

  const derniereReservation = Stockage.lire('dps.reservations', []).slice(-1)[0];
  const prenom = derniereReservation?.prenom || 'Vous';
  const mots = prenom.trim().split(/\s+/).filter(Boolean);
  // Deux initiales si le nom en comporte plusieurs, sinon les deux premières
  // lettres du prénom — « B » seul ferait un avatar bancal.
  const initiales = (mots.length > 1
    ? mots.map((mot) => mot[0]).join('')
    : (mots[0] || 'Vous').slice(0, 2)
  )
    .slice(0, 2)
    .toUpperCase();

  return { nom: prenom, initiales: initiales || 'VS', couleur: 'avatar--ciel' };
}

/**
 * Le fil est partagé : contribuer demande un compte que Firestore puisse
 * vérifier. Renvoie le compte s'il est utilisable, sinon null — jamais
 * d'exception, les appelants n'ont qu'un test à faire.
 */
function identiteRequise() {
  if (!base()) return profilCourant();
  const compte = typeof Comptes !== 'undefined' ? Comptes.courant() : null;
  if (!compte) return null;
  return { id: compte.id, nom: Comptes.nomAffiche(compte), initiales: Comptes.initiales(compte), couleur: compte.couleur };
}

/** Publications visibles, les plus récentes d'abord. */
function toutesLesPublications() {
  if (base()) return filDistant || [];
  return [...publicationsUtilisateur, ...PUBLICATIONS].sort(
    (a, b) => new Date(b.date) - new Date(a.date)
  );
}

/** Réponses d'une publication, dans l'ordre où elles sont arrivées. */
function reponsesDe(publication) {
  if (base()) return reponsesDistantes[publication.id] || [];
  return [...(publication.reponses || []), ...(reponsesUtilisateurLocales[publication.id] || [])];
}

/** Le membre courant a-t-il déjà soutenu cette publication ? */
function estAimee(id) {
  return base() ? mesJaimesDistants.includes(id) : jaimesLocaux.includes(id);
}

/**
 * Nombre de soutiens à afficher. En mode partagé, `jaimesCompte` fait foi
 * pour tout le monde ; en mode local, le compte de la publication d'exemple
 * n'inclut pas encore la mienne, ajoutée à part.
 */
function compteSoutiens(publication) {
  if (base()) return publication.jaimesCompte || 0;
  return publication.jaimes + (estAimee(publication.id) ? 1 : 0);
}

/* ==========================================================================
   Rendu
   ========================================================================== */

/** « 1 soutien » / « 24 soutiens ». */
function libelleSoutiens(nombre) {
  return `${nombre} soutien${nombre > 1 ? 's' : ''}`;
}

function gabaritReponse(reponse) {
  return `
    <div class="reponse">
      <div class="avatar avatar--sm ${reponse.couleur || ''}" aria-hidden="true">${echapper(reponse.initiales)}</div>
      <div class="reponse__bulle">
        <span class="reponse__auteur">${echapper(reponse.auteur)}</span>
        <span class="reponse__texte">${echapper(reponse.texte)}</span>
      </div>
    </div>
  `;
}

/**
 * Le contenu du panneau de réponses, à part : c'est la portion qu'un
 * écouteur Firestore rafraîchit seul (`rendreZoneReponses`), sans reformer
 * toute la publication ni toucher à son état ouvert/fermé.
 */
function gabaritZoneReponses(publication) {
  return `
    ${reponsesDe(publication).map(gabaritReponse).join('')}
    <form class="formulaire-reponse" data-formulaire-reponse="${publication.id}">
      <label class="sr-only" for="reponse-${publication.id}">Répondre à ${echapper(publication.auteur)}</label>
      <input class="saisie" id="reponse-${publication.id}" type="text"
             placeholder="Répondre avec bienveillance…" maxlength="240" required>
      <button type="submit" class="btn btn--primaire">Envoyer</button>
    </form>
  `;
}

function gabaritPublication(publication) {
  const cercle = CERCLES.find((element) => element.id === publication.cercle);
  const aime = estAimee(publication.id);
  const compteJaimes = compteSoutiens(publication);
  const nombreReponses = reponsesDe(publication).length;

  return `
    <article class="publication apparait" data-publication="${publication.id}">
      <header class="publication__entete">
        <div class="avatar ${publication.couleur || ''}" aria-hidden="true">${echapper(publication.initiales)}</div>
        <div class="identite">
          <p class="identite__nom" style="margin:0">${echapper(publication.auteur)}</p>
          <p class="identite__meta" style="margin:0">
            ${cercle ? `${echapper(cercle.nom)} · ` : ''}${formaterDepuis(publication.date)}
          </p>
        </div>
        ${publication.badge ? `<span class="badge badge--primaire">${echapper(publication.badge)}</span>` : ''}
      </header>

      <div class="publication__contenu">${echapper(publication.contenu)}</div>

      <div class="publication__actions">
        <button type="button" class="action-pub ${aime ? 'est-actif' : ''}" data-jaime="${publication.id}" aria-pressed="${aime}">
          ${picto('<path d="M12 20s-7-4.4-7-9.2A3.8 3.8 0 0 1 12 8a3.8 3.8 0 0 1 7-2.8c0 4.8-7 9.2-7 9.2Z"/>', 16)}
          <span data-compte-jaimes>${libelleSoutiens(compteJaimes)}</span>
        </button>
        <button type="button" class="action-pub" data-repondre="${publication.id}" aria-expanded="false">
          ${picto('<path d="M20 15a2 2 0 0 1-2 2H8l-4 4V5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2Z"/>', 16)} ${nombreReponses} réponse${nombreReponses > 1 ? 's' : ''}
        </button>
        <button type="button" class="action-pub" data-signaler="${publication.id}">
          ${picto('<path d="M12 3l7 3v5c0 4.4-3 8.3-7 10-4-1.7-7-5.6-7-10V6Z"/>', 16)} Signaler
        </button>
      </div>

      <div class="reponses" data-zone-reponses hidden>
        ${gabaritZoneReponses(publication)}
      </div>
    </article>
  `;
}

function rendreFil() {
  const fil = $('[data-fil]');
  if (!fil) return;

  const liste = toutesLesPublications().filter(
    (publication) => cercleActif === 'tous' || publication.cercle === cercleActif
  );

  const enAttente = Boolean(base()) && filDistant === null;

  if (enAttente) {
    fil.innerHTML = `<p style="text-align:center;padding:var(--e-6) 0;color:var(--texte-doux)">Chargement du fil…</p>`;
    return;
  }

  if (!liste.length) {
    fil.innerHTML = `
      <div class="message-vide">
        <span class="message-vide__picto" aria-hidden="true">${picto(CERCLES[0] && CERCLES[0].icone, 34)}</span>
        <h3>Le fil vient d’ouvrir</h3>
        <p>Rien n’a encore été écrit ici. Une question sur une sortie à venir fera très bien l’affaire.</p>
      </div>
    `;
    return;
  }

  fil.innerHTML = liste.map(gabaritPublication).join('');
  echelonnerApparitions(fil, 40);
  initApparitions();
}

/**
 * Corrige le compteur de soutiens d'une seule publication sans reformer le
 * fil. Appelé quand l'écouteur Firestore ne rapporte que des changements de
 * ce compteur — reformer tout le fil à chaque soutien posé par qui que ce
 * soit ailleurs sur le site refermerait les panneaux de réponses que
 * d'autres visiteurs ont ouverts au même moment.
 */
function rafraichirCompteurSoutiens(publicationId) {
  const bouton = $(`[data-jaime="${publicationId}"]`);
  if (!bouton) return;

  const publication = toutesLesPublications().find((element) => element.id === publicationId);
  if (!publication) return;

  const aime = estAimee(publicationId);
  bouton.setAttribute('aria-pressed', String(aime));
  bouton.classList.toggle('est-actif', aime);
  $('[data-compte-jaimes]', bouton).textContent = libelleSoutiens(compteSoutiens(publication));
}

/** Rafraîchit uniquement le panneau de réponses d'une publication ouverte. */
function rendreZoneReponses(publicationId) {
  const publication = toutesLesPublications().find((element) => element.id === publicationId);
  const zone = $(`[data-publication="${publicationId}"] [data-zone-reponses]`);
  if (!publication || !zone) return;
  zone.innerHTML = gabaritZoneReponses(publication);

  const bouton = $(`[data-repondre="${publicationId}"]`);
  const nombreReponses = reponsesDe(publication).length;
  if (bouton) {
    bouton.innerHTML = `${picto('<path d="M20 15a2 2 0 0 1-2 2H8l-4 4V5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2Z"/>', 16)} ${nombreReponses} réponse${nombreReponses > 1 ? 's' : ''}`;
  }
}

function rendreCercles() {
  const conteneur = $('[data-cercles]');
  if (!conteneur) return;

  const publications = toutesLesPublications();

  conteneur.innerHTML = CERCLES.map((cercle) => {
    const compte =
      cercle.id === 'tous'
        ? publications.length
        : publications.filter((publication) => publication.cercle === cercle.id).length;

    return `
      <li>
        <button type="button" class="lien-cercle" data-cercle="${cercle.id}"
                aria-pressed="${cercle.id === cercleActif}">
          <span class="lien-cercle__pastille" aria-hidden="true">${picto(cercle.icone, 16)}</span>
          <span>${echapper(cercle.nom)}</span>
          <span class="lien-cercle__compte">${compte}</span>
        </button>
      </li>
    `;
  }).join('');
}

/* ==========================================================================
   Abonnements Firestore
   ========================================================================== */

function suivreFil() {
  const distant = base();
  if (!distant || desabonnerFil) return;

  desabonnerFil = distant.ecouterPublications((publications, changements) => {
    const premierChargement = filDistant === null;
    filDistant = publications;
    rendreCercles();

    // Une modification d'une publication existante ne peut être qu'un
    // changement de son compteur de soutiens : c'est la seule mise à jour que
    // les règles de sécurité autorisent une fois la publication créée. La
    // corriger sur place évite de reformer tout le fil — et donc de refermer
    // les panneaux de réponses ouverts ailleurs sur la page — à chaque
    // soutien posé par qui que ce soit, sur n'importe quelle publication.
    const seulementDesSoutiens =
      !premierChargement
      && changements.length > 0
      && changements.every((changement) => changement.type === 'modified');

    if (seulementDesSoutiens) {
      changements.forEach((changement) => rafraichirCompteurSoutiens(changement.id));
      return;
    }

    rendreFil();
  });
}

/** Les publications que le membre connecté a soutenues, pour cocher les bons boutons. */
function suivreMesJaimes() {
  const distant = base();
  const compte = typeof Comptes !== 'undefined' ? Comptes.courant() : null;
  if (!distant || !compte || desabonnerJaimes) return;

  desabonnerJaimes = distant.ecouterMesJaimes(compte.id, (ids) => {
    mesJaimesDistants = ids;

    // Corrige chaque bouton déjà affiché plutôt que de reformer le fil : les
    // publications et les soutiens vivent dans deux écouteurs Firestore
    // indépendants, sans garantie sur celui des deux qui répond en premier.
    // Un `rendreFil()` ici refermerait les panneaux de réponses ouverts pour
    // ce qui n'est, la plupart du temps, qu'un second passage de la même
    // information déjà posée par l'écouteur du fil.
    $$('[data-jaime]').forEach((bouton) => rafraichirCompteurSoutiens(bouton.dataset.jaime));
  });
}

/** (Ré)abonne le panneau de réponses d'une publication, à son ouverture. */
function suivreReponses(publicationId) {
  const distant = base();
  if (!distant || desabonnerReponses[publicationId]) return;

  desabonnerReponses[publicationId] = distant.ecouterReponses(publicationId, (reponses) => {
    reponsesDistantes[publicationId] = reponses;
    rendreZoneReponses(publicationId);
  });
}

/* ==========================================================================
   Composeur
   ========================================================================== */

function motsSensiblesDetectes(texte) {
  const normalise = texte.toLowerCase();
  return MOTS_SENSIBLES.filter((mot) => {
    // Recherche sur les limites de mots pour éviter les faux positifs
    // (« rate » dans « pirate », par exemple).
    const motif = new RegExp(`(^|[^a-zà-ÿ])${mot.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-zà-ÿ]|$)`, 'i');
    return motif.test(normalise);
  });
}

/**
 * Bascule entre le formulaire et l'invitation à se connecter, selon que le
 * fil est partagé et qu'une identité vérifiable est disponible. Rejouable :
 * la session peut s'ouvrir après le premier rendu (Firebase répond après
 * coup), et la version fichier unique peut y revenir sans rechargement.
 */
function actualiserAccesComposeur() {
  const formulaire = $('[data-composeur]');
  const invitation = $('[data-composeur-connexion]');
  if (!formulaire) return;

  const identite = identiteRequise();

  if (invitation) invitation.hidden = Boolean(identite);
  formulaire.hidden = !identite;
  if (!identite) return;

  const avatar = $('[data-composeur-avatar]', formulaire);
  if (avatar) {
    avatar.textContent = identite.initiales;
    avatar.className = `avatar ${identite.couleur}`;
  }
}

function initComposeur() {
  const formulaire = $('[data-composeur]');
  if (!formulaire) return;

  const zone = $('[data-composeur-texte]', formulaire);
  const compteur = $('[data-compteur]', formulaire);
  const rappel = $('[data-rappel]', formulaire);
  const selecteurCercle = $('[data-composeur-cercle]', formulaire);

  // Les cercles proposés à la publication (« Tout le fil » n'en est pas un).
  if (selecteurCercle) {
    selecteurCercle.innerHTML = CERCLES.filter((cercle) => cercle.id !== 'tous')
      .map((cercle) => `<option value="${cercle.id}">${echapper(cercle.nom)}</option>`)
      .join('');
  }

  let avertissementAffiche = false;

  const majCompteur = () => {
    const restants = LIMITE_CARACTERES - zone.value.length;
    compteur.textContent = `${restants} caractère${Math.abs(restants) > 1 ? 's' : ''}`;
    compteur.classList.toggle('est-limite', restants < 40);
  };

  zone.addEventListener('input', () => {
    majCompteur();
    // Le rappel disparaît dès que la formulation est retravaillée.
    if (avertissementAffiche && !motsSensiblesDetectes(zone.value).length) {
      rappel.classList.remove('est-visible');
      avertissementAffiche = false;
    }
  });

  majCompteur();

  formulaire.addEventListener('submit', async (evenement) => {
    evenement.preventDefault();

    const identite = identiteRequise();
    if (!identite) return; // Le formulaire est masqué dans ce cas ; filet de sécurité.

    const contenu = zone.value.trim();

    if (contenu.length < 5) {
      notifier('Votre message est un peu court pour être partagé.');
      zone.focus();
      return;
    }

    if (contenu.length > LIMITE_CARACTERES) {
      notifier(`Message trop long de ${contenu.length - LIMITE_CARACTERES} caractères.`);
      zone.focus();
      return;
    }

    // Premier envoi contenant un terme sensible : on invite à relire.
    // Le second envoi passe — DPS accompagne, il ne censure pas.
    if (!avertissementAffiche && motsSensiblesDetectes(contenu).length) {
      rappel.classList.add('est-visible');
      avertissementAffiche = true;
      rappel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      return;
    }

    const cercle = selecteurCercle ? selecteurCercle.value : 'premierpas';
    const bouton = $('button[type="submit"]', formulaire);

    const distant = base();
    if (distant) {
      bouton.disabled = true;
      try {
        await distant.publier({
          auteurId: identite.id,
          auteur: identite.nom,
          initiales: identite.initiales,
          couleur: identite.couleur,
          cercle,
          contenu,
        });
        // Pas de rendu manuel : l'écouteur du fil prend le relais dès que
        // Firestore confirme.
      } catch (erreur) {
        notifier('Message non envoyé. Vérifiez votre connexion.');
        bouton.disabled = false;
        return;
      }
      bouton.disabled = false;
    } else {
      const nouvelle = {
        id: `pub-${Date.now()}`,
        auteur: identite.nom,
        initiales: identite.initiales,
        couleur: identite.couleur,
        cercle,
        badge: null,
        date: new Date().toISOString(),
        contenu,
        jaimes: 0,
        reponses: [],
      };

      publicationsUtilisateur = [nouvelle, ...publicationsUtilisateur];
      Stockage.ecrire(CLE_PUBLICATIONS, publicationsUtilisateur);
      rendreCercles();
      rendreFil();
    }

    zone.value = '';
    majCompteur();
    rappel.classList.remove('est-visible');
    avertissementAffiche = false;

    // Bascule vers le cercle de publication pour que le message soit visible.
    if (selecteurCercle && cercleActif !== 'tous' && cercleActif !== cercle) {
      cercleActif = cercle;
      rendreCercles();
    }

    notifier('Message partagé avec la communauté');
  });
}

/* ==========================================================================
   Interactions du fil
   ========================================================================== */

function initInteractions() {
  const fil = $('[data-fil]');
  if (!fil) return;

  fil.addEventListener('click', (evenement) => {
    const boutonJaime = evenement.target.closest('[data-jaime]');
    if (boutonJaime) {
      const identite = identiteRequise();
      if (!identite) {
        notifier('Un compte est nécessaire pour soutenir une publication.');
        return;
      }

      const id = boutonJaime.dataset.jaime;
      const distant = base();

      if (distant) {
        // Pas de rendu optimiste : l'écouteur des soutiens et celui du fil
        // se chargent tous deux de refléter le résultat de la transaction.
        distant.basculerJaime(id, identite.id).catch(() => {
          notifier('Soutien non enregistré. Réessayez.');
        });
        return;
      }

      const aimeMaintenant = !jaimesLocaux.includes(id);
      jaimesLocaux = aimeMaintenant ? [...jaimesLocaux, id] : jaimesLocaux.filter((autre) => autre !== id);
      Stockage.ecrire(CLE_JAIMES, jaimesLocaux);
      rafraichirCompteurSoutiens(id);
      return;
    }

    const boutonRepondre = evenement.target.closest('[data-repondre]');
    if (boutonRepondre) {
      const id = boutonRepondre.dataset.repondre;
      const article = boutonRepondre.closest('.publication');
      const zone = $('[data-zone-reponses]', article);
      const ouvert = zone.hidden;

      zone.hidden = !ouvert;
      boutonRepondre.setAttribute('aria-expanded', String(ouvert));
      if (ouvert) {
        suivreReponses(id);
        $('.saisie', zone).focus();
      }
      return;
    }

    const boutonSignaler = evenement.target.closest('[data-signaler]');
    if (boutonSignaler) {
      notifier('Merci, un modérateur bénévole va relire ce message.');
    }
  });

  fil.addEventListener('submit', async (evenement) => {
    const formulaire = evenement.target.closest('[data-formulaire-reponse]');
    if (!formulaire) return;

    evenement.preventDefault();

    const identite = identiteRequise();
    if (!identite) {
      notifier('Un compte est nécessaire pour répondre.');
      return;
    }

    const champ = $('.saisie', formulaire);
    const texte = champ.value.trim();
    if (texte.length < 2) return;

    if (motsSensiblesDetectes(texte).length) {
      notifier('Une formulation plus douce serait la bienvenue ici.');
      return;
    }

    const id = formulaire.dataset.formulaireReponse;
    const distant = base();

    if (distant) {
      const bouton = $('button[type="submit"]', formulaire);
      bouton.disabled = true;
      try {
        await distant.repondre(id, {
          auteurId: identite.id,
          auteur: identite.nom,
          initiales: identite.initiales,
          couleur: identite.couleur,
          texte,
        });
        champ.value = '';
      } catch (erreur) {
        notifier('Réponse non envoyée. Vérifiez votre connexion.');
      }
      bouton.disabled = false;
      return;
    }

    reponsesUtilisateurLocales = {
      ...reponsesUtilisateurLocales,
      [id]: [
        ...(reponsesUtilisateurLocales[id] || []),
        { auteur: identite.nom, initiales: identite.initiales, couleur: identite.couleur, texte },
      ],
    };
    Stockage.ecrire(CLE_REPONSES, reponsesUtilisateurLocales);
    rendreZoneReponses(id);

    const article = $(`[data-publication="${id}"]`, fil);
    if (article) $('.saisie', article).focus();

    notifier('Réponse publiée');
  });
}

function initFiltreCercles() {
  const conteneur = $('[data-cercles]');
  if (!conteneur) return;

  conteneur.addEventListener('click', (evenement) => {
    const bouton = evenement.target.closest('[data-cercle]');
    if (!bouton) return;

    cercleActif = bouton.dataset.cercle;
    $$('[data-cercle]', conteneur).forEach((autre) =>
      autre.setAttribute('aria-pressed', String(autre === bouton))
    );
    rendreFil();
  });
}

/* ==========================================================================
   Portail d'entrée
   ========================================================================== */

/**
 * Le fil n'est accessible qu'après avoir répondu à la question d'adhésion.
 * La réponse est conservée localement : on ne la redemande pas à chaque
 * visite. Elle ouvre la lecture du fil, pas la publication — voir
 * `identiteRequise`, qui pose une exigence séparée une fois le fil partagé.
 */
function initPortail() {
  const portail = $('[data-portail]');
  const espace = $('[data-communaute]');
  if (!portail || !espace) return;

  const ouvrir = () => {
    portail.hidden = true;
    espace.hidden = false;
    // Le fil vient d'apparaître : ses éléments n'ont jamais été en vue.
    initApparitions();
  };

  // Un membre a déjà dit qui il était et adhéré à la charte en s'inscrivant :
  // lui reposer la question du portail serait un doublon.
  const estAdmis = () =>
    (typeof Comptes !== 'undefined' && Comptes.courant()) ||
    Stockage.lire(CLE_ADHESION, null);

  if (estAdmis()) {
    ouvrir();
    return;
  }

  // Version fichier unique : l'inscription peut avoir lieu sur une autre vue,
  // sans rechargement. Le portail doit s'effacer au retour sur le fil.
  window.addEventListener('hashchange', () => {
    if (espace.hidden && estAdmis()) ouvrir();
  });

  const formulaire = $('[data-formulaire-portail]', portail);
  const champ = $('#motivation', formulaire);

  champ.addEventListener('input', () => {
    champ.closest('.champ').classList.remove('est-invalide');
  });

  formulaire.addEventListener('submit', (evenement) => {
    evenement.preventDefault();

    const reponse = champ.value.trim();
    if (reponse.length < 10) {
      champ.closest('.champ').classList.add('est-invalide');
      champ.focus();
      return;
    }

    Stockage.ecrire(CLE_ADHESION, { motivation: reponse, creeLe: new Date().toISOString() });
    ouvrir();
    espace.scrollIntoView({ behavior: 'smooth', block: 'start' });
    notifier('Bienvenue — le fil est à vous');
  });
}

/* ==========================================================================
   Démarrage
   ========================================================================== */

let communauteBranchee = false;

document.addEventListener('DOMContentLoaded', () => {
  if (!$('[data-fil]')) return;

  rendreCercles();
  rendreFil();
  actualiserAccesComposeur();
  suivreFil();
  suivreMesJaimes();
  initFiltreCercles();
  initComposeur();
  initInteractions();
  initPortail();

  communauteBranchee = true;
});

// Trois raisons de repasser ici sans rien casser : Firebase qui annonce la
// session après le premier rendu, Firestore qui peut finir de démarrer après
// coup (le même risque de course que documenté dans chat.js — `suivreFil()`
// exécuté avant que Firestore soit prêt renoncerait sans bruit et rien ne le
// relancerait sans cet écouteur), et un retour sur cette vue depuis une autre
// dans la version fichier unique.
window.addEventListener('dps:session', () => {
  if (!communauteBranchee) return;
  actualiserAccesComposeur();
  suivreMesJaimes();
});
window.addEventListener('dps:donnees-pretes', () => {
  if (!communauteBranchee) return;
  // C'est cet événement qui fait passer `base()` de null à disponible : tant
  // qu'il n'a pas eu lieu, le composeur restait ouvert sur son repli local,
  // avant de savoir si le fil allait finalement être partagé.
  actualiserAccesComposeur();
  suivreFil();
  suivreMesJaimes();
});
