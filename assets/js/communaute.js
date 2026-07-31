/**
 * DPS — Fil de la communauté
 * ---------------------------------------------------------------------------
 * Composeur de message, filtrage par cercle, réactions et réponses.
 * Tout est conservé dans localStorage : les publications d'exemple restent
 * intactes, seules les contributions de l'utilisateur sont persistées.
 */

const CLE_ADHESION = 'dps.adhesion';
const CLE_PUBLICATIONS = 'dps.publications';
const CLE_JAIMES = 'dps.jaimes';
const CLE_REPONSES = 'dps.reponses';

const LIMITE_CARACTERES = 600;

/* État persistant ---------------------------------------------------------- */

let publicationsUtilisateur = Stockage.lire(CLE_PUBLICATIONS, []);
let jaimes = Stockage.lire(CLE_JAIMES, []);
let reponsesUtilisateur = Stockage.lire(CLE_REPONSES, {});

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

/** Profil affiché pour les contributions de l'utilisateur. */
function profilCourant() {
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

/** Publications d'exemple + celles de l'utilisateur, les plus récentes d'abord. */
function toutesLesPublications() {
  return [...publicationsUtilisateur, ...PUBLICATIONS].sort(
    (a, b) => new Date(b.date) - new Date(a.date)
  );
}

/** Réponses d'origine complétées par celles ajoutées localement. */
function reponsesDe(publication) {
  return [...(publication.reponses || []), ...(reponsesUtilisateur[publication.id] || [])];
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

function gabaritPublication(publication) {
  const cercle = CERCLES.find((element) => element.id === publication.cercle);
  const listeReponses = reponsesDe(publication);
  const aime = jaimes.includes(publication.id);
  const compteJaimes = publication.jaimes + (aime ? 1 : 0);

  return `
    <article class="publication apparait" data-publication="${publication.id}">
      <header class="publication__entete">
        <div class="avatar ${publication.couleur || ''}" aria-hidden="true">${echapper(publication.initiales)}</div>
        <div class="identite">
          <p class="identite__nom" style="margin:0">${echapper(publication.auteur)}</p>
          <p class="identite__meta" style="margin:0">
            ${cercle ? `${cercle.emoji} ${echapper(cercle.nom)} · ` : ''}${formaterDepuis(publication.date)}
          </p>
        </div>
        ${publication.badge ? `<span class="badge badge--primaire">${echapper(publication.badge)}</span>` : ''}
      </header>

      <div class="publication__contenu">${echapper(publication.contenu)}</div>

      <div class="publication__actions">
        <button type="button" class="action-pub" data-jaime="${publication.id}" aria-pressed="${aime}">
          <span aria-hidden="true">${aime ? '💚' : '🤍'}</span>
          <span data-compte-jaimes>${libelleSoutiens(compteJaimes)}</span>
        </button>
        <button type="button" class="action-pub" data-repondre="${publication.id}" aria-expanded="false">
          <span aria-hidden="true">💬</span> ${listeReponses.length} réponse${listeReponses.length > 1 ? 's' : ''}
        </button>
        <button type="button" class="action-pub" data-signaler="${publication.id}">
          <span aria-hidden="true">🛡️</span> Signaler
        </button>
      </div>

      <div class="reponses" data-zone-reponses hidden>
        ${listeReponses.map(gabaritReponse).join('')}
        <form class="formulaire-reponse" data-formulaire-reponse="${publication.id}">
          <label class="sr-only" for="reponse-${publication.id}">Répondre à ${echapper(publication.auteur)}</label>
          <input class="saisie" id="reponse-${publication.id}" type="text"
                 placeholder="Répondre avec bienveillance…" maxlength="240" required>
          <button type="submit" class="btn btn--primaire">Envoyer</button>
        </form>
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

  if (!liste.length) {
    fil.innerHTML = `
      <div class="message-vide">
        <span class="message-vide__emoji" aria-hidden="true">🌱</span>
        <h3>Ce cercle est encore silencieux</h3>
        <p>Lancez la conversation : une question, un retour d’expérience, une envie de sortie.</p>
      </div>
    `;
    return;
  }

  fil.innerHTML = liste.map(gabaritPublication).join('');
  echelonnerApparitions(fil, 40);
  initApparitions();
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
          <span class="lien-cercle__pastille" aria-hidden="true">${cercle.emoji}</span>
          <span>${echapper(cercle.nom)}</span>
          <span class="lien-cercle__compte">${compte}</span>
        </button>
      </li>
    `;
  }).join('');
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

function initComposeur() {
  const formulaire = $('[data-composeur]');
  if (!formulaire) return;

  const zone = $('[data-composeur-texte]', formulaire);
  const compteur = $('[data-compteur]', formulaire);
  const rappel = $('[data-rappel]', formulaire);
  const selecteurCercle = $('[data-composeur-cercle]', formulaire);
  const avatar = $('[data-composeur-avatar]', formulaire);

  const profil = profilCourant();
  if (avatar) {
    avatar.textContent = profil.initiales;
    avatar.className = `avatar ${profil.couleur}`;
  }

  // Les cercles proposés à la publication (« Tout le fil » n'en est pas un).
  if (selecteurCercle) {
    selecteurCercle.innerHTML = CERCLES.filter((cercle) => cercle.id !== 'tous')
      .map((cercle) => `<option value="${cercle.id}">${cercle.emoji} ${echapper(cercle.nom)}</option>`)
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

  formulaire.addEventListener('submit', (evenement) => {
    evenement.preventDefault();

    const contenu = zone.value.trim();

    if (contenu.length < 5) {
      notifier('Votre message est un peu court pour être partagé.', '✍️');
      zone.focus();
      return;
    }

    if (contenu.length > LIMITE_CARACTERES) {
      notifier(`Message trop long de ${contenu.length - LIMITE_CARACTERES} caractères.`, '✂️');
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

    const nouvelle = {
      id: `pub-${Date.now()}`,
      auteur: profil.nom,
      initiales: profil.initiales,
      couleur: profil.couleur,
      cercle: selecteurCercle ? selecteurCercle.value : 'premierpas',
      badge: null,
      date: new Date().toISOString(),
      contenu,
      jaimes: 0,
      reponses: [],
    };

    publicationsUtilisateur = [nouvelle, ...publicationsUtilisateur];
    Stockage.ecrire(CLE_PUBLICATIONS, publicationsUtilisateur);

    zone.value = '';
    majCompteur();
    rappel.classList.remove('est-visible');
    avertissementAffiche = false;

    // Bascule vers le cercle de publication pour que le message soit visible.
    if (selecteurCercle && cercleActif !== 'tous' && cercleActif !== nouvelle.cercle) {
      cercleActif = nouvelle.cercle;
    }

    rendreCercles();
    rendreFil();
    notifier('Message partagé avec la communauté', '💚');
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
      const id = boutonJaime.dataset.jaime;
      const aimeMaintenant = !jaimes.includes(id);

      jaimes = aimeMaintenant ? [...jaimes, id] : jaimes.filter((autre) => autre !== id);
      Stockage.ecrire(CLE_JAIMES, jaimes);

      const publication = toutesLesPublications().find((element) => element.id === id);
      const compte = publication.jaimes + (aimeMaintenant ? 1 : 0);

      boutonJaime.setAttribute('aria-pressed', String(aimeMaintenant));
      $('span[aria-hidden]', boutonJaime).textContent = aimeMaintenant ? '💚' : '🤍';
      $('[data-compte-jaimes]', boutonJaime).textContent = libelleSoutiens(compte);
      return;
    }

    const boutonRepondre = evenement.target.closest('[data-repondre]');
    if (boutonRepondre) {
      const article = boutonRepondre.closest('.publication');
      const zone = $('[data-zone-reponses]', article);
      const ouvert = zone.hidden;

      zone.hidden = !ouvert;
      boutonRepondre.setAttribute('aria-expanded', String(ouvert));
      if (ouvert) $('.saisie', zone).focus();
      return;
    }

    const boutonSignaler = evenement.target.closest('[data-signaler]');
    if (boutonSignaler) {
      notifier('Merci, un modérateur bénévole va relire ce message.', '🛡️');
    }
  });

  fil.addEventListener('submit', (evenement) => {
    const formulaire = evenement.target.closest('[data-formulaire-reponse]');
    if (!formulaire) return;

    evenement.preventDefault();

    const champ = $('.saisie', formulaire);
    const texte = champ.value.trim();
    if (texte.length < 2) return;

    if (motsSensiblesDetectes(texte).length) {
      notifier('Une formulation plus douce serait la bienvenue ici.', '🌿');
      return;
    }

    const id = formulaire.dataset.formulaireReponse;
    const profil = profilCourant();

    reponsesUtilisateur = {
      ...reponsesUtilisateur,
      [id]: [
        ...(reponsesUtilisateur[id] || []),
        {
          auteur: profil.nom,
          initiales: profil.initiales,
          couleur: profil.couleur,
          texte,
        },
      ],
    };
    Stockage.ecrire(CLE_REPONSES, reponsesUtilisateur);

    rendreFil();

    // Ré-ouvre le fil de réponses de la publication concernée après le rendu.
    const article = $(`[data-publication="${id}"]`, fil);
    if (article) {
      $('[data-zone-reponses]', article).hidden = false;
      $('[data-repondre]', article).setAttribute('aria-expanded', 'true');
      $('.saisie', article).focus();
    }

    notifier('Réponse publiée', '💬');
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
 * La réponse est conservée localement : on ne la redemande pas à chaque visite.
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

  if (Stockage.lire(CLE_ADHESION, null)) {
    ouvrir();
    return;
  }

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
    notifier('Bienvenue — le fil est à vous', '👋');
  });
}

/* ==========================================================================
   Démarrage
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  if (!$('[data-fil]')) return;

  rendreCercles();
  rendreFil();
  initFiltreCercles();
  initComposeur();
  initInteractions();
  initPortail();
});
