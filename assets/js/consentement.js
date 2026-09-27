/**
 * DPS Collective — Consentement à la mesure d'audience
 * ---------------------------------------------------------------------------
 * Google Analytics dépose des cookies et transmet l'adresse IP du visiteur à
 * un tiers. Il ne peut donc être chargé qu'après un accord explicite : c'est
 * la règle posée par la directive ePrivacy et rappelée par la CNIL.
 *
 * Ce que cela implique, et que ce fichier respecte :
 *
 *  - Rien ne part avant l'accord. Le script de Google n'est pas dans le HTML :
 *    il est injecté ici, et seulement si la personne a dit oui. Le charger en
 *    le « bridant » ne suffirait pas — la seule requête vers googletagmanager
 *    transmet déjà l'adresse IP.
 *  - Refuser doit être aussi simple qu'accepter. Les deux boutons ont le même
 *    poids, la même taille, le même nombre de clics. Un refus enterré derrière
 *    un « Paramétrer » est précisément ce que la CNIL sanctionne.
 *  - L'absence de réponse n'est pas un accord. Fermer la bannière ou ignorer
 *    la question laisse la mesure désactivée. Il n'y a d'ailleurs pas de croix
 *    de fermeture : elle serait ambiguë.
 *  - On peut revenir sur son choix. Un lien « Cookies » dans le pied de page
 *    rouvre la bannière, dans les deux sens.
 *  - Le choix est daté. Un consentement ne vaut pas éternellement ; passé
 *    treize mois, la question est reposée.
 *
 * Le choix est gardé dans le stockage local et non dans un cookie : poser un
 * cookie pour retenir un refus de cookies serait une contradiction, et ce
 * stockage-là est strictement nécessaire au respect du choix — donc dispensé
 * de consentement.
 */

(function () {
  'use strict';

  /* ------------------------------------------------------------------ *
   * À RENSEIGNER : l'identifiant de mesure du flux GA4, de la forme
   * « G-XXXXXXXXXX ». On le trouve dans Google Analytics, sous
   * Administration → Flux de données → le flux web du site.
   *
   * Tant qu'il vaut null, la bannière ne paraît pas et rien n'est chargé :
   * demander un consentement pour une mesure qui n'existe pas n'aurait
   * aucun sens, et le site reste alors sans aucun cookie.
   * ------------------------------------------------------------------ */
  const ID_MESURE = null;

  const CLE = 'dps.consentement';
  const VALIDITE_MOIS = 13;

  /* ==========================================================================
     Le choix conservé
     ========================================================================== */

  function lireChoix() {
    try {
      const brut = localStorage.getItem(CLE);
      if (!brut) return null;
      const choix = JSON.parse(brut);
      if (!choix || !choix.date) return null;

      // Un consentement se périme. Treize mois est la durée que la CNIL
      // retient pour les cookies de mesure ; on aligne la question dessus.
      const limite = new Date(choix.date);
      limite.setMonth(limite.getMonth() + VALIDITE_MOIS);
      if (Date.now() > limite.getTime()) return null;

      return choix.mesure === true ? 'accepte' : 'refuse';
    } catch (erreur) {
      // Navigation privée, stockage bloqué : on ne sait pas, donc on ne
      // charge rien et on ne harcèle pas non plus avec la bannière.
      return null;
    }
  }

  function ecrireChoix(accepte) {
    try {
      localStorage.setItem(CLE, JSON.stringify({
        mesure: accepte,
        date: new Date().toISOString(),
      }));
    } catch (erreur) {
      /* Sans stockage, le choix vaut pour la visite en cours. */
    }
  }

  /* ==========================================================================
     Chargement de la mesure d'audience
     ========================================================================== */

  let mesureChargee = false;

  function chargerMesure() {
    if (mesureChargee || !ID_MESURE) return;
    mesureChargee = true;

    window.dataLayer = window.dataLayer || [];
    function gtag() { window.dataLayer.push(arguments); }
    window.gtag = gtag;

    // Consent Mode : tout est refusé par défaut, et seule la mesure passe à
    // « granted ». Publicité, personnalisation et appariement d'utilisateurs
    // restent fermés — le site n'en a aucun usage.
    gtag('consent', 'default', {
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
      analytics_storage: 'denied',
      wait_for_update: 500,
    });
    gtag('consent', 'update', { analytics_storage: 'granted' });

    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(ID_MESURE);
    document.head.appendChild(script);

    gtag('js', new Date());
    gtag('config', ID_MESURE, {
      // L'adresse IP est tronquée avant enregistrement. GA4 le fait déjà,
      // mais l'écrire vaut engagement et se relit dans le code.
      anonymize_ip: true,
      // Pas de signaux publicitaires : ils ouvriraient un partage avec la
      // régie de Google, qui n'a rien à voir avec la mesure d'audience.
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
    });
  }

  /**
   * Retire ce que la mesure a pu déposer. Appelé quand quelqu'un revient sur
   * son accord : lui retirer le consentement sans effacer les cookies déjà
   * posés ne changerait rien pour lui.
   */
  function effacerTracesMesure() {
    try {
      document.cookie.split(';').forEach(function (paire) {
        const nom = paire.split('=')[0].trim();
        if (!/^(_ga|_gid|_gat)/.test(nom)) return;
        // Le domaine de dépôt n'est pas lisible depuis le script : on efface
        // sur le domaine courant et sur son parent, ce qui couvre les deux
        // formes que gtag emploie.
        const hote = location.hostname;
        [hote, '.' + hote, '.' + hote.split('.').slice(-2).join('.')].forEach(function (domaine) {
          document.cookie = nom + '=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=' + domaine;
        });
        document.cookie = nom + '=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
      });
    } catch (erreur) {
      /* Rien à faire de plus : le consentement, lui, est bien retiré. */
    }
    if (typeof window.gtag === 'function') {
      window.gtag('consent', 'update', { analytics_storage: 'denied' });
    }
  }

  /* ==========================================================================
     La bannière
     ========================================================================== */

  function construireBanniere() {
    const banniere = document.createElement('div');
    banniere.className = 'bandeau-consentement';
    banniere.setAttribute('role', 'dialog');
    banniere.setAttribute('aria-modal', 'false');
    banniere.setAttribute('aria-labelledby', 'consentement-titre');
    banniere.hidden = true;

    banniere.innerHTML =
      '<div class="bandeau-consentement__texte">' +
        '<p class="bandeau-consentement__titre" id="consentement-titre">Mesure d’audience</p>' +
        '<p class="bandeau-consentement__detail">' +
          'Nous aimerions savoir combien de personnes visitent le site et quelles pages ' +
          'elles consultent, pour l’améliorer. Cela passe par Google&nbsp;Analytics, qui ' +
          'dépose des cookies. Le site fonctionne exactement pareil si vous refusez. ' +
          '<a href="confidentialite.html#audience">En savoir plus</a>.' +
        '</p>' +
      '</div>' +
      '<div class="bandeau-consentement__boutons">' +
        '<button type="button" class="btn btn--fantome" data-consentement="refuse">Refuser</button>' +
        '<button type="button" class="btn btn--primaire" data-consentement="accepte">Accepter</button>' +
      '</div>';

    banniere.addEventListener('click', function (evenement) {
      const bouton = evenement.target.closest('[data-consentement]');
      if (!bouton) return;
      const accepte = bouton.dataset.consentement === 'accepte';
      ecrireChoix(accepte);
      if (accepte) chargerMesure();
      else effacerTracesMesure();
      fermer(banniere);
      if (typeof window.notifier === 'function') {
        window.notifier(accepte
          ? 'Merci — la mesure d’audience est activée.'
          : 'C’est noté : aucune mesure d’audience.');
      }
    });

    document.body.appendChild(banniere);
    return banniere;
  }

  function ouvrir(banniere) {
    banniere.hidden = false;
    // Le reflow force le navigateur à prendre en compte l'état masqué avant
    // la transition, sans quoi la bannière apparaîtrait d'un bloc.
    void banniere.offsetWidth;
    banniere.classList.add('est-visible');
  }

  function fermer(banniere) {
    banniere.classList.remove('est-visible');
    setTimeout(function () { banniere.hidden = true; }, 300);
  }

  /* ==========================================================================
     Mise en route
     ========================================================================== */

  function demarrer() {
    const choix = lireChoix();

    // Un accord déjà donné : on charge sans reposer la question.
    if (choix === 'accepte') chargerMesure();

    // Sans identifiant de mesure, il n'y a rien à consentir : pas de
    // bannière, et pas de lien pour la rouvrir.
    if (!ID_MESURE) return;

    const banniere = construireBanniere();
    if (choix === null) {
      // Laisse la page s'afficher avant de demander : une bannière qui
      // surgit avant le contenu fait passer le site pour un péage.
      setTimeout(function () { ouvrir(banniere); }, 900);
    }

    // Le lien du pied de page rouvre la question, dans les deux sens.
    document.addEventListener('click', function (evenement) {
      const lien = evenement.target.closest('[data-rouvrir-consentement]');
      if (!lien) return;
      evenement.preventDefault();
      ouvrir(banniere);
      banniere.querySelector('[data-consentement="refuse"]').focus();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', demarrer);
  } else {
    demarrer();
  }
})();
