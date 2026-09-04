/**
 * DPS — Page « Espace membre »
 * ---------------------------------------------------------------------------
 * Bascule entre les deux onglets, valide les deux formulaires, et affiche le
 * profil une fois la session ouverte.
 */

const EMAIL_VALIDE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/* Les trois exigences du mot de passe, dans l'ordre où elles s'affichent sous
   le champ. Une seule source : la vérification à l'envoi et la liste que le
   visiteur voit cocher lisent le même tableau, et ne peuvent donc pas
   diverger.

   Huit caractères ne suffisaient pas : « aaaaaaaaa » passait. Un chiffre et
   une majuscule écartent la ligne de touches répétée sans rien exiger
   d'impraticable — ce n'est pas un coffre-fort de banque, et une règle trop
   sévère pousse à noter le mot de passe sur un papier. */
const EXIGENCES_MOT_DE_PASSE = [
  { cle: 'longueur', libelle: 'Au moins 8 caractères', tenue: (v) => v.length >= 8 },
  { cle: 'chiffre', libelle: 'Au moins un chiffre', tenue: (v) => /[0-9]/.test(v) },
  { cle: 'majuscule', libelle: 'Au moins une majuscule', tenue: (v) => /[A-ZÀ-ÖØ-Þ]/.test(v) },
];

/** Le mot de passe satisfait-il les trois exigences ? */
function motDePasseSolide(valeur) {
  return EXIGENCES_MOT_DE_PASSE.every((exigence) => exigence.tenue(valeur));
}

/* ==========================================================================
   Onglets
   ========================================================================== */

function activerOnglet(nom) {
  $$('[data-onglet]').forEach((onglet) => {
    const actif = onglet.dataset.onglet === nom;
    onglet.classList.toggle('est-actif', actif);
    onglet.setAttribute('aria-selected', String(actif));
  });

  $$('[data-panneau]').forEach((panneau) => {
    panneau.hidden = panneau.dataset.panneau !== nom;
  });
}

function initOnglets() {
  $$('[data-onglet]').forEach((onglet) => {
    onglet.addEventListener('click', () => {
      activerOnglet(onglet.dataset.onglet);
      history.replaceState(null, '', `#${onglet.dataset.onglet}`);
    });
  });

  const versInscription = $('[data-vers-inscription]');
  if (versInscription) {
    versInscription.addEventListener('click', (evenement) => {
      evenement.preventDefault();
      activerOnglet('inscription');
      $('#in-prenom').focus();
    });
  }

  appliquerAncreOnglet();

  // Dans la version fichier unique, arriver sur `#/compte/inscription` depuis
  // une autre vue ne recharge pas la page : l'ancre doit être suivie à chaud.
  window.addEventListener('hashchange', appliquerAncreOnglet);
}

/** `compte.html#inscription` ouvre directement le bon onglet. */
function appliquerAncreOnglet() {
  const demande = (window.location.hash || '').replace(/^#\/?(compte\/)?/, '');
  if (demande === 'inscription' || demande === 'connexion') activerOnglet(demande);
}

/* ==========================================================================
   Profil
   ========================================================================== */

/** Le pont Firestore, ou null quand on tourne en local. */
function baseSorties() {
  return window.DPS_DB && window.DPS_DB.disponible ? window.DPS_DB : null;
}

/**
 * Sorties réservées par le membre. En mode partagé elles viennent de
 * Firestore : une réservation prise depuis un autre appareil doit apparaître
 * ici aussi, ce qu'un simple `localStorage` ne peut pas offrir.
 */
function gabaritSorties(reservations) {
  if (!reservations.length) {
    return `
      <p style="color:var(--texte-doux);font-size:var(--t-sm);margin:0">
        Aucune sortie réservée pour l’instant. Le fil d’un groupe s’ouvre dès que
        vous prenez une place.
      </p>
    `;
  }

  return `
    <ul class="liste-sorties">
      ${reservations
        .map((reservation) => {
          const activite = ACTIVITES.find((element) => element.id === reservation.activiteId);
          return `
            <li>
              <span>
                <strong>${echapper(reservation.titre)}</strong>
                ${activite ? `<span style="color:var(--texte-doux)"> · ${formaterDateCourte(activite.date)}</span>` : ''}
              </span>
              <a class="btn btn--fantome btn--petit"
                 href="${lienInterne('chat', `groupe-${echapper(reservation.activiteId)}`)}">Ouvrir le fil</a>
            </li>
          `;
        })
        .join('')}
    </ul>
  `;
}

/** Les écouteurs ne se posent qu'une fois, même si le profil est réaffiché. */
let profilBranche = false;

/** Un seul abonnement aux sorties à la fois — un par membre connecté. */
let desabonnerSorties = null;

/**
 * Le bandeau qui réclame la confirmation d'adresse.
 *
 * Il ne bloque rien : on peut réserver, écrire, tout faire. Ce qu'une adresse
 * non confirmée coûte, c'est le courriel de confirmation — les règles Firestore
 * refusent de l'expédier vers une adresse dont rien ne prouve qu'elle
 * appartient à la personne. Le bandeau le dit dans ces termes, plutôt que
 * d'agiter une menace vague.
 */
function afficherVerification(compte) {
  const bandeau = $('[data-verification]');
  if (!bandeau) return;

  // Hors connexion, aucun courriel n'existe : il n'y a rien à confirmer.
  if (!Comptes.verificationDisponible() || Comptes.emailVerifie()) {
    bandeau.hidden = true;
    return;
  }

  bandeau.hidden = false;
  bandeau.innerHTML = `
    <p class="bandeau-verif__titre">Confirmez votre adresse</p>
    <p class="bandeau-verif__texte">
      Un lien vient d’être envoyé à <strong>${echapper(compte.email)}</strong>.
      Tant qu’il n’est pas ouvert, nous ne pouvons pas vous envoyer les
      récapitulatifs de vos inscriptions : rien ne prouve encore que cette
      adresse est la vôtre. Le reste du site fonctionne normalement.
    </p>
    <div class="bandeau-verif__actions">
      <button type="button" class="btn btn--fantome btn--petit" data-renvoyer-verif>
        Renvoyer le lien
      </button>
      <button type="button" class="btn btn--discret btn--petit" data-verif-faite>
        J’ai cliqué sur le lien
      </button>
    </div>`;

  $('[data-renvoyer-verif]', bandeau).addEventListener('click', async (evenement) => {
    const bouton = evenement.currentTarget;
    bouton.disabled = true;
    const resultat = await Comptes.renvoyerVerification();
    bouton.disabled = false;
    notifier(resultat.ok
      ? `Lien renvoyé à ${compte.email}.`
      : 'Envoi impossible pour le moment. Réessayez dans un instant.');
  });

  // Le lien s'ouvre dans un autre onglet : celui-ci n'en sait rien tant qu'il
  // n'est pas allé redemander la session à Firebase.
  $('[data-verif-faite]', bandeau).addEventListener('click', async (evenement) => {
    const bouton = evenement.currentTarget;
    bouton.disabled = true;
    const resultat = await Comptes.rafraichirSession();
    bouton.disabled = false;
    if (resultat.ok && resultat.verifie) {
      bandeau.hidden = true;
      notifier('Adresse confirmée. Merci !');
      return;
    }
    notifier('L’adresse n’est pas encore confirmée. Ouvrez le lien reçu par e-mail.');
  });
}

/**
 * Rejouable : le profil est réaffiché chaque fois que la session ou le fil de
 * données change, faute de quoi une reconnexion dans la version fichier unique
 * n'y remettrait pas à jour la liste des sorties.
 */
function afficherProfil(compte) {
  $('[data-espace-visiteur]').hidden = true;
  $('[data-espace-membre]').hidden = false;

  $('[data-membre-bonjour]').textContent = `Bonjour ${compte.prenom}`;
  $('[data-membre-email]').textContent = compte.email;

  afficherVerification(compte);

  const distant = baseSorties();

  if (distant) {
    // Un seul abonnement vivant : sans ce garde-fou, changer de vue et revenir
    // dans la version fichier unique en accumulerait un par passage.
    if (desabonnerSorties) desabonnerSorties();
    desabonnerSorties = distant.ecouterMesReservations(compte.id, (reservations) => {
      $('[data-membre-sorties]').innerHTML = gabaritSorties(reservations);
    });
  } else {
    $('[data-membre-sorties]').innerHTML = gabaritSorties(Stockage.lire('dps.reservations', []));
  }

  if (profilBranche) return;
  profilBranche = true;

  $('[data-deconnexion]').addEventListener('click', async () => {
    await Comptes.deconnecter();
    notifier('Vous êtes déconnecté·e');
    window.setTimeout(() => window.location.reload(), 600);
  });

  brancherSuppression();
}

/**
 * Suppression de compte. Le panneau reste replié tant qu'on ne l'a pas demandé :
 * une action irréversible ne doit pas être à un seul clic.
 */
function brancherSuppression() {
  const ouvrir = $('[data-ouvrir-suppression]');
  const zone = $('[data-suppression]');
  const formulaire = $('[data-formulaire-suppression]');
  if (!ouvrir || !zone || !formulaire) return;

  const basculer = (visible) => {
    zone.hidden = !visible;
    ouvrir.setAttribute('aria-expanded', String(visible));
    if (visible) $('#sup-motdepasse').focus();
  };

  ouvrir.addEventListener('click', () => basculer(zone.hidden));

  $('[data-annuler-suppression]').addEventListener('click', () => {
    formulaire.reset();
    marquer(formulaire.elements.motDePasse, true);
    basculer(false);
    ouvrir.focus();
  });

  formulaire.addEventListener('input', () => {
    marquer(formulaire.elements.motDePasse, true);
  });

  formulaire.addEventListener('submit', async (evenement) => {
    evenement.preventDefault();

    const champ = formulaire.elements.motDePasse;
    if (!champ.value) {
      marquer(champ, false);
      champ.focus();
      return;
    }

    const bouton = $('button[type=submit]', formulaire);
    bouton.disabled = true;
    bouton.textContent = 'Suppression…';

    const resultat = await Comptes.supprimer(champ.value);

    if (!resultat.ok) {
      bouton.disabled = false;
      bouton.textContent = 'Supprimer définitivement';

      if (signalerIncident(resultat.motif)) return;

      $('[data-erreur-suppression]').textContent =
        resultat.motif === 'motdepasse'
          ? 'Mot de passe incorrect.'
          : 'Suppression impossible pour le moment. Réessayez plus tard.';
      marquer(champ, false);
      champ.focus();
      return;
    }

    notifier('Votre compte a été supprimé.');
    window.setTimeout(() => allerVers('index'), 900);
  });
}

/* ==========================================================================
   Formulaires
   ========================================================================== */

/**
 * Les pannes qui ne visent aucun champ en particulier : elles passent par une
 * notification plutôt que par un message sous une saisie.
 * @returns {boolean} true si l'incident a été signalé et traité.
 */
function signalerIncident(motif) {
  if (motif === 'reseau') {
    notifier('Connexion au serveur impossible. Vérifiez votre réseau.');
    return true;
  }
  if (motif === 'trop') {
    notifier('Trop de tentatives. Réessayez dans quelques minutes.');
    return true;
  }
  return false;
}

function marquer(controle, valide) {
  const champ = controle.closest('.champ');
  if (champ) champ.classList.toggle('est-invalide', !valide);
  return valide;
}

function initConnexion() {
  const formulaire = $('[data-formulaire-connexion]');
  if (!formulaire) return;

  formulaire.addEventListener('input', (evenement) => {
    const champ = evenement.target.closest('.champ');
    if (champ) champ.classList.remove('est-invalide');
  });

  formulaire.addEventListener('submit', async (evenement) => {
    evenement.preventDefault();

    const email = formulaire.elements.email;
    const motDePasse = formulaire.elements.motDePasse;

    if (!marquer(email, EMAIL_VALIDE.test(email.value.trim()))) {
      $('[data-erreur-email]').textContent = 'Cette adresse e-mail ne semble pas valide.';
      email.focus();
      return;
    }

    const resultat = await Comptes.connecter(email.value, motDePasse.value);

    if (!resultat.ok && resultat.motif === 'inconnu') {
      $('[data-erreur-email]').textContent = 'Aucun compte pour cette adresse.';
      marquer(email, false);
      email.focus();
      return;
    }

    if (!resultat.ok && !signalerIncident(resultat.motif)) {
      // Firebase ne dit pas si c'est l'adresse ou le mot de passe qui cloche —
      // c'est délibéré, cela évite de révéler qui a un compte. Le message le
      // reflète.
      $('[data-erreur-motdepasse]').textContent =
        Comptes.mode === 'firebase'
          ? 'Adresse e-mail ou mot de passe incorrect.'
          : 'Mot de passe incorrect.';
      marquer(motDePasse, false);
      motDePasse.focus();
      return;
    }

    if (!resultat.ok) return;

    notifier(`Content de vous revoir, ${resultat.compte.prenom}`);
    window.setTimeout(() => allerVers('chat'), 500);
  });

  initMotDePasseOublie(formulaire);
}

/**
 * Envoie un lien de réinitialisation vers l'adresse déjà saisie. La réponse
 * ne distingue jamais une adresse inconnue d'un envoi réussi — même principe
 * que l'erreur de connexion plus haut, qui ne dit pas non plus laquelle des
 * deux informations est fausse.
 */
function initMotDePasseOublie(formulaireConnexion) {
  const bouton = $('[data-mot-de-passe-oublie]', formulaireConnexion);
  const confirmation = $('[data-confirmation-reinitialisation]', formulaireConnexion);
  if (!bouton) return;

  bouton.addEventListener('click', async () => {
    const email = formulaireConnexion.elements.email;

    if (!marquer(email, EMAIL_VALIDE.test(email.value.trim()))) {
      $('[data-erreur-email]').textContent = 'Indiquez votre adresse e-mail pour recevoir le lien.';
      marquer(email, false);
      email.focus();
      return;
    }

    bouton.disabled = true;
    const resultat = await Comptes.reinitialiserMotDePasse(email.value);
    bouton.disabled = false;

    if (!resultat.ok && resultat.motif === 'indisponible-local') {
      notifier('Indisponible dans cet aperçu hors ligne : aucun e-mail ne peut être envoyé ici.');
      return;
    }

    if (!resultat.ok && !signalerIncident(resultat.motif)) {
      notifier('Envoi impossible pour le moment. Réessayez dans un instant.');
      return;
    }

    if (!resultat.ok) return;

    const message = `Si un compte existe pour ${email.value.trim()}, un lien de réinitialisation vient d’y être envoyé.`;
    notifier(message);
    if (confirmation) {
      confirmation.textContent = message;
      confirmation.hidden = false;
    }
  });
}

/**
 * La liste des exigences sous le champ, cochée au fil de la frappe.
 *
 * Montrer ce qui manque plutôt que refuser après coup : un message d'erreur
 * qui arrive à l'envoi oblige à deviner laquelle des trois règles a manqué.
 */
function initExigencesMotDePasse(formulaire) {
  const liste = $('[data-exigences]', formulaire);
  const champ = formulaire.elements.motDePasse;
  if (!liste || !champ) return;

  liste.innerHTML = EXIGENCES_MOT_DE_PASSE.map((exigence) => `
    <li class="exigence" data-exigence="${exigence.cle}">
      <span class="exigence__marque" aria-hidden="true"></span>
      ${exigence.libelle}
    </li>`).join('');

  const rafraichir = () => {
    EXIGENCES_MOT_DE_PASSE.forEach((exigence) => {
      const ligne = $(`[data-exigence="${exigence.cle}"]`, liste);
      const tenue = exigence.tenue(champ.value);
      ligne.classList.toggle('est-tenue', tenue);
      // Le lecteur d'écran doit entendre l'état, que la coche ne lui dit pas.
      ligne.setAttribute('aria-label', `${exigence.libelle} : ${tenue ? 'rempli' : 'à compléter'}`);
    });
  };

  champ.addEventListener('input', rafraichir);
  rafraichir();
}

function initInscription() {
  const formulaire = $('[data-formulaire-inscription]');
  if (!formulaire) return;

  initExigencesMotDePasse(formulaire);

  formulaire.addEventListener('input', (evenement) => {
    const champ = evenement.target.closest('.champ');
    if (champ) champ.classList.remove('est-invalide');
  });

  formulaire.addEventListener('submit', async (evenement) => {
    evenement.preventDefault();

    const champs = formulaire.elements;
    const controles = [
      [champs.prenom, champs.prenom.value.trim().length >= 2],
      [champs.nom, champs.nom.value.trim().length >= 2],
      [champs.email, EMAIL_VALIDE.test(champs.email.value.trim())],
      [champs.motDePasse, motDePasseSolide(champs.motDePasse.value)],
      [
        champs.confirmation,
        champs.confirmation.value.length > 0 &&
          champs.confirmation.value === champs.motDePasse.value,
      ],
      [champs.charte, champs.charte.checked],
    ];

    let premierInvalide = null;
    controles.forEach(([controle, valide]) => {
      if (!marquer(controle, valide) && !premierInvalide) premierInvalide = controle;
    });

    if (premierInvalide) {
      premierInvalide.focus();
      return;
    }

    const resultat = await Comptes.creer({
      prenom: champs.prenom.value,
      nom: champs.nom.value,
      email: champs.email.value,
      motDePasse: champs.motDePasse.value,
    });

    if (!resultat.ok && resultat.motif === 'faible') {
      marquer(champs.motDePasse, false);
      champs.motDePasse.focus();
      return;
    }

    if (!resultat.ok && !signalerIncident(resultat.motif)) {
      $('[data-erreur-inscription]').textContent =
        resultat.motif === 'email'
          ? 'Cette adresse e-mail ne semble pas valide.'
          : 'Un compte existe déjà pour cette adresse. Connectez-vous.';
      marquer(champs.email, false);
      champs.email.focus();
      return;
    }

    if (!resultat.ok) return;

    notifier(`Bienvenue, ${resultat.compte.prenom} !`);
    window.setTimeout(() => allerVers('chat'), 600);
  });
}

/* ==========================================================================
   Démarrage
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  if (!$('[data-espace-visiteur]')) return;

  // Les formulaires sont branchés dans tous les cas : au premier rendu, avec
  // Firebase, la session n'est pas encore connue. Ils restent simplement
  // masqués sous le profil si un membre finit par apparaître.
  initOnglets();
  initConnexion();
  initInscription();

  const rafraichir = () => {
    const membre = Comptes.courant();
    if (membre) afficherProfil(membre);
  };

  rafraichir();

  // Trois raisons de repasser ici sans rechargement : la version fichier
  // unique change de vue, Firebase annonce la session après coup, et
  // Firestore peut finir de démarrer après cette même session — sans ce
  // troisième cas, la liste des sorties resterait vide si l'ordre d'arrivée
  // des deux modules s'inversait.
  window.addEventListener('hashchange', rafraichir);
  window.addEventListener('dps:session', rafraichir);
  window.addEventListener('dps:donnees-pretes', rafraichir);
});
