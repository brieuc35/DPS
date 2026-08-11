/**
 * DPS — Page « Espace membre »
 * ---------------------------------------------------------------------------
 * Bascule entre les deux onglets, valide les deux formulaires, et affiche le
 * profil une fois la session ouverte.
 */

const EMAIL_VALIDE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

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

/** Les sorties réservées sur cet appareil, avec le lien vers leur fil. */
function gabaritSorties() {
  const reservations = Stockage.lire('dps.reservations', []);
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

/**
 * Rejouable : la liste des sorties est reconstruite à chaque appel, faute de
 * quoi une réservation prise après le premier affichage n'y figurerait jamais
 * dans la version fichier unique, où la page ne se recharge pas.
 */
function afficherProfil(compte) {
  $('[data-espace-visiteur]').hidden = true;
  $('[data-espace-membre]').hidden = false;

  $('[data-membre-bonjour]').textContent = `Bonjour ${compte.prenom}`;
  $('[data-membre-email]').textContent = compte.email;
  $('[data-membre-sorties]').innerHTML = gabaritSorties();

  if (profilBranche) return;
  profilBranche = true;

  $('[data-deconnexion]').addEventListener('click', () => {
    Comptes.deconnecter();
    notifier('Vous êtes déconnecté·e', '👋');
    window.setTimeout(() => window.location.reload(), 600);
  });
}

/* ==========================================================================
   Formulaires
   ========================================================================== */

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

    if (!resultat.ok) {
      marquer(motDePasse, false);
      motDePasse.focus();
      return;
    }

    notifier(`Content de vous revoir, ${resultat.compte.prenom}`, '👋');
    window.setTimeout(() => allerVers('chat'), 500);
  });
}

function initInscription() {
  const formulaire = $('[data-formulaire-inscription]');
  if (!formulaire) return;

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
      [champs.motDePasse, champs.motDePasse.value.length >= 8],
      [
        champs.confirmation,
        champs.confirmation.value.length >= 8 &&
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

    if (!resultat.ok) {
      $('[data-erreur-inscription]').textContent =
        'Un compte existe déjà pour cette adresse. Connectez-vous.';
      marquer(champs.email, false);
      champs.email.focus();
      return;
    }

    notifier(`Bienvenue, ${resultat.compte.prenom} !`, '🎉');
    window.setTimeout(() => allerVers('chat'), 600);
  });
}

/* ==========================================================================
   Démarrage
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  if (!$('[data-espace-visiteur]')) return;

  const compte = Comptes.courant();
  if (compte) {
    afficherProfil(compte);
  } else {
    initOnglets();
    initConnexion();
    initInscription();
  }

  // Version fichier unique : on revient sur cette vue sans rechargement, après
  // s'être inscrit ou avoir réservé ailleurs. Le profil remplace alors les
  // formulaires, et sa liste de sorties est refaite.
  window.addEventListener('hashchange', () => {
    const membre = Comptes.courant();
    if (membre) afficherProfil(membre);
  });
});
