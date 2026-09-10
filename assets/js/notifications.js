/**
 * DPS — Compteur de messages non lus
 * ---------------------------------------------------------------------------
 * L'entrée « Discussions » de l'en-tête porte une pastille avec le nombre de
 * messages qu'un membre n'a pas encore vus. Le compteur par fil existait déjà,
 * mais seulement dans la page des discussions : il fallait donc y aller pour
 * savoir qu'il y avait quelque chose à y lire. Or ce qui tombe dans le fil
 * d'un groupe, ce sont les informations pratiques d'une sortie — l'heure du
 * rendez-vous, un changement de lieu. Elles doivent se signaler d'où que l'on
 * soit sur le site.
 *
 * Le module vit dans une fonction fermée : chat.js déclare déjà `CLE_LECTURES`
 * et `messagesDe` au premier niveau, et les deux fichiers cohabitent sur la
 * page des discussions.
 *
 * Sur cette page-là, les deux écoutent d'ailleurs les mêmes fils. Le SDK
 * Firestore partage un même flux entre deux écouteurs portant la même requête :
 * le doublon coûte un objet en mémoire, pas une seconde lecture facturée.
 */
(function () {
  'use strict';

  /* Les mêmes clés que chat.js — c'est le même repère de lecture, il ne peut
     pas y en avoir deux versions. */
  const CLE_LECTURES = 'dps.luJusqua';
  const CLE_MESSAGES = 'dps.messages';

  let total = 0;
  let filsDistants = {};
  let desabonnements = {};
  let reservationsDistantes = null;
  let desabonnerReservations = null;
  let membreSuivi = null;

  /**
   * Le pont Firestore, et seulement s'il sait faire ce dont on a besoin.
   *
   * Ce module est chargé sur toutes les pages : une méthode manquante ferait
   * remonter une exception qui interromprait le reste du script de la page,
   * pour une pastille. Mieux vaut compter sur le stockage local.
   */
  function base() {
    const pont = window.DPS_DB;
    if (!pont || !pont.disponible) return null;
    if (typeof pont.ecouterMessages !== 'function') return null;
    if (typeof pont.ecouterMesReservations !== 'function') return null;
    return pont;
  }

  function compte() {
    return typeof Comptes !== 'undefined' ? Comptes.courant() : null;
  }

  /** Les fils accessibles : le salon, plus le groupe de chaque sortie réservée. */
  function conversationsVisibles() {
    const reservations = base()
      ? reservationsDistantes || []
      : Stockage.lire('dps.reservations', []);
    const groupes = [...new Set(reservations.map((r) => `groupe-${r.activiteId}`))];
    return ['general', ...groupes];
  }

  function messagesDe(conversationId) {
    if (base()) return filsDistants[conversationId] || [];
    return Stockage.lire(CLE_MESSAGES, {})[conversationId] || [];
  }

  /**
   * Recompte, et prévient si le total a changé.
   *
   * Un fil jamais ouvert n'a pas de repère de lecture : tout y compte comme
   * neuf. C'est voulu — on vient d'être inscrit à une sortie, et le fil du
   * groupe contient déjà ce qu'il faut savoir.
   */
  function recompter() {
    const moi = compte();
    const lectures = Stockage.lire(CLE_LECTURES, {});

    const neuf = !moi
      ? 0
      : conversationsVisibles().reduce((somme, id) => {
          const depuis = lectures[id];
          const seuil = depuis ? new Date(depuis).getTime() : 0;
          return (
            somme +
            messagesDe(id).filter(
              (message) =>
                message.auteurId !== moi.id && new Date(message.date).getTime() > seuil
            ).length
          );
        }, 0);

    if (neuf === total) return;
    total = neuf;
    // C'est l'en-tête qui dessine la pastille (comptes.js) : il se redessine
    // déjà à chaque changement de session, on lui donne un signal de plus.
    window.dispatchEvent(new Event('dps:non-lus'));
  }

  /** Un écouteur par fil visible, les autres relâchés. */
  function suivreFils() {
    const distant = base();
    if (!distant || !compte()) return;

    const voulus = conversationsVisibles();

    Object.keys(desabonnements).forEach((id) => {
      if (voulus.includes(id)) return;
      desabonnements[id]();
      delete desabonnements[id];
      delete filsDistants[id];
    });

    voulus.forEach((id) => {
      if (desabonnements[id]) return;
      desabonnements[id] = distant.ecouterMessages(id, (messages) => {
        filsDistants[id] = messages;
        recompter();
      });
    });
  }

  /** Les réservations décident des fils accessibles : elles peuvent changer. */
  function suivreReservations() {
    const distant = base();
    const moi = compte();
    const id = moi ? moi.id : null;
    if (id === membreSuivi) return;

    if (desabonnerReservations) desabonnerReservations();
    desabonnerReservations = null;
    membreSuivi = id;

    // Déconnexion : plus rien à compter, et les fils de l'ancien membre ne
    // doivent surtout pas rester écoutés.
    if (!distant || !id) {
      Object.values(desabonnements).forEach((arreter) => arreter());
      desabonnements = {};
      filsDistants = {};
      reservationsDistantes = null;
      recompter();
      return;
    }

    desabonnerReservations = distant.ecouterMesReservations(id, (reservations) => {
      reservationsDistantes = reservations;
      suivreFils();
      recompter();
    });
  }

  window.Notifications = {
    /** Le nombre de messages non lus, tous fils confondus. */
    total() {
      return total;
    },
    /** À appeler après avoir marqué un fil comme lu. */
    rafraichir: recompter,
  };

  function demarrer() {
    suivreReservations();
    suivreFils();
    recompter();
  }

  document.addEventListener('DOMContentLoaded', demarrer);
  // La session et Firestore arrivent chacune par leur événement, sans ordre
  // garanti : on rejoue sur les deux.
  window.addEventListener('dps:session', demarrer);
  window.addEventListener('dps:donnees-pretes', demarrer);
  // Mode local : un autre onglet peut avoir écrit un message ou lu un fil.
  window.addEventListener('storage', (evenement) => {
    if ([CLE_LECTURES, CLE_MESSAGES, 'dps.reservations'].includes(evenement.key)) recompter();
  });
})();
