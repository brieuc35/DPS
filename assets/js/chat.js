/**
 * DPS — Discussions
 * ---------------------------------------------------------------------------
 * Un salon général ouvert à tous les membres, et un fil par sortie réservé à
 * ses inscrits. Réservé aux comptes : sans session ouverte, la page propose de
 * se connecter ou de s'inscrire.
 *
 * ATTENTION — comme les comptes, les messages ne quittent pas le navigateur.
 * Deux personnes sur deux appareils ne se voient pas : ce sont deux copies
 * indépendantes du site. Le jour où un back-end existera, seules les fonctions
 * de lecture et d'écriture ci-dessous auront à changer.
 */

const CLE_MESSAGES = 'dps.messages';
/* Date de dernière lecture, par fil : { 'groupe-mine-bleue': '2026-09-04T…' }.
   Le compteur de non-lus s'en déduit. Rangé dans le navigateur et non dans
   Firestore : ce que j'ai lu ne regarde personne d'autre, et un aller-retour
   réseau à chaque ouverture d'onglet serait payé pour rien. La contrepartie
   est qu'un même compte sur deux appareils compte ses non-lus séparément. */
const CLE_LECTURES = 'dps.luJusqua';
/* Cœurs posés hors connexion : { 'id-du-message': true }. En mode partagé ils
   vivent dans Firestore, où chacun voit ceux des autres. */
const CLE_COEURS = 'dps.coeurs';
const LIMITE_MESSAGE = 600;

let conversationActive = 'general';

/* Messages par fil, tenus par les écouteurs Firestore — tous les fils
   visibles, et non le seul fil affiché : sans cela, aucun onglet ne pourrait
   annoncer ce qu'il contient de neuf. Une entrée absente signifie « pas encore
   répondu », ce qui évite d'afficher « personne n'a écrit » sur une latence. */
let filsDistants = {};
let desabonnements = {};
let reservationsDistantes = null;
let desabonnerReservations = null;

/* Cœurs par fil, tenus par leurs propres écouteurs. */
let coeursDistants = {};
let desabonnementsCoeurs = {};

/* ==========================================================================
   Données
   ========================================================================== */

/** Le pont Firestore, ou null quand on tourne en local. */
function base() {
  return window.DPS_DB && window.DPS_DB.disponible ? window.DPS_DB : null;
}

/**
 * Messages du fil actif.
 *
 * En mode partagé, seuls les vrais messages sont affichés : les échanges
 * d'exemple sont un décor de démonstration, et répondre à quelqu'un qui
 * n'existe pas serait une mauvaise surprise. Ils ne servent donc qu'au mode
 * local, où le fil n'est de toute façon vu que par une personne.
 */
function messagesDe(conversationId) {
  if (base()) {
    return filsDistants[conversationId] || [];
  }

  const ecrits = Stockage.lire(CLE_MESSAGES, {})[conversationId] || [];
  return [...(MESSAGES_EXEMPLE[conversationId] || []), ...ecrits].sort(
    (a, b) => new Date(a.date) - new Date(b.date)
  );
}

function ajouterMessageLocal(conversationId, message) {
  const tous = Stockage.lire(CLE_MESSAGES, {});
  tous[conversationId] = [...(tous[conversationId] || []), message];
  Stockage.ecrire(CLE_MESSAGES, tous);
}

/** Identifiants des sorties réservées : partagées si Firestore est là. */
function groupesReserves() {
  const reservations = base()
    ? reservationsDistantes || []
    : Stockage.lire('dps.reservations', []);
  return [...new Set(reservations.map((reservation) => `groupe-${reservation.activiteId}`))];
}

/**
 * Les fils visibles : le salon, plus les groupes des sorties réservées. Un
 * groupe auquel on n'est pas inscrit n'apparaît pas — c'est la contrepartie de
 * la promesse « ce qui se dit dans le groupe y reste », et les règles de
 * sécurité Firestore l'imposent de leur côté.
 */
function conversationsVisibles() {
  const reserves = groupesReserves();
  return CONVERSATIONS.filter(
    (conversation) => conversation.id === 'general' || reserves.includes(conversation.id)
  );
}

function trouverConversation(id) {
  return CONVERSATIONS.find((conversation) => conversation.id === id) || null;
}

/**
 * Abonne tous les fils visibles, et non le seul fil affiché.
 *
 * C'est ce que réclame le compteur de non-lus : un onglet ne peut pas annoncer
 * ce qu'il contient de neuf si personne ne l'écoute. Un écouteur par fil plutôt
 * qu'une requête « in » unique — même forme de requête que l'existante, donc
 * même index, et pas de plafond à trente valeurs à surveiller.
 *
 * Les abonnements déjà en place sont conservés : réabonner à chaque rendu
 * relancerait une lecture complète du fil à chaque message reçu.
 */
function suivreFils() {
  const distant = base();
  if (!distant) return;

  const voulus = conversationsVisibles().map((conversation) => conversation.id);

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
      // Un message qui arrive dans le fil ouvert est lu à l'instant même.
      if (id === conversationActive) marquerLu(id);
      rendreListe();
      if (id === conversationActive) rendreFilDiscussion();
    });
  });
}

/* ==========================================================================
   Cœurs — « j'ai vu »
   ========================================================================== */

/**
 * Le cœur tient lieu d'accusé de lecture : il dit « vu » sans obliger à écrire
 * « ok » ni « merci », qui encombrent un fil où l'essentiel est l'information
 * pratique de la sortie. Celui qui l'a postée voit combien de personnes l'ont
 * lue ; les autres n'ont rien à rédiger.
 */
function coeursDe(messageId) {
  const compte = Comptes.courant();

  if (base()) {
    const poses = (coeursDistants[conversationActive] || [])
      .filter((coeur) => coeur.messageId === messageId);
    return {
      total: poses.length,
      parMoi: Boolean(compte) && poses.some((coeur) => coeur.membreId === compte.id),
    };
  }

  const parMoi = Boolean(Stockage.lire(CLE_COEURS, {})[messageId]);
  return { total: parMoi ? 1 : 0, parMoi };
}

async function basculerCoeur(messageId) {
  const compte = Comptes.courant();
  if (!compte) return;

  const { parMoi } = coeursDe(messageId);
  const distant = base();

  if (!distant) {
    const tous = Stockage.lire(CLE_COEURS, {});
    if (parMoi) delete tous[messageId];
    else tous[messageId] = true;
    Stockage.ecrire(CLE_COEURS, tous);
    rendreFilDiscussion();
    return;
  }

  // L'affichage ne se met pas à jour ici : l'écouteur Firestore le fera, et
  // c'est lui qui fait foi. Corriger l'écran tout de suite montrerait un cœur
  // qui pourrait ne jamais avoir été enregistré.
  await distant.basculerReaction({
    conversationId: conversationActive,
    messageId,
    membreId: compte.id,
    actif: !parMoi,
  });
}

/** Abonne les cœurs des fils visibles, sur le même principe que les messages. */
function suivreCoeurs() {
  const distant = base();
  if (!distant || typeof distant.ecouterReactions !== 'function') return;

  const voulus = conversationsVisibles().map((conversation) => conversation.id);

  Object.keys(desabonnementsCoeurs).forEach((id) => {
    if (voulus.includes(id)) return;
    desabonnementsCoeurs[id]();
    delete desabonnementsCoeurs[id];
    delete coeursDistants[id];
  });

  voulus.forEach((id) => {
    if (desabonnementsCoeurs[id]) return;
    desabonnementsCoeurs[id] = distant.ecouterReactions(id, (coeurs) => {
      coeursDistants[id] = coeurs;
      if (id === conversationActive) rendreFilDiscussion();
    });
  });
}

/* ==========================================================================
   Non-lus
   ========================================================================== */

/** Dernière lecture de chaque fil, par identifiant. */
function lectures() {
  return Stockage.lire(CLE_LECTURES, {});
}

/** Marque un fil comme lu à l'instant. */
function marquerLu(conversationId) {
  Stockage.ecrire(CLE_LECTURES, { ...lectures(), [conversationId]: new Date().toISOString() });
}

/**
 * Messages non lus d'un fil : ceux arrivés depuis la dernière visite, et qui
 * ne sont pas de soi — on n'a pas à se signaler ses propres messages.
 *
 * Un fil jamais ouvert n'a pas de repère de lecture. Tout y compte alors comme
 * neuf, ce qui est le comportement attendu : on vient d'être inscrit à une
 * sortie, et le fil du groupe contient déjà les informations pratiques.
 */
function nonLus(conversationId) {
  const compte = Comptes.courant();
  const depuis = lectures()[conversationId];
  const seuil = depuis ? new Date(depuis).getTime() : 0;

  return messagesDe(conversationId).filter((message) => {
    if (compte && message.auteurId === compte.id) return false;
    return new Date(message.date).getTime() > seuil;
  }).length;
}

/** Suit les réservations du membre : elles décident des fils auxquels il a accès. */
function suivreReservations() {
  const distant = base();
  const compte = Comptes.courant();
  if (!distant || !compte) return;

  if (desabonnerReservations) desabonnerReservations();

  desabonnerReservations = distant.ecouterMesReservations(compte.id, (reservations) => {
    reservationsDistantes = reservations;
    // La liste des fils accessibles vient de changer : il faut suivre les
    // nouveaux et lâcher ceux qu'on a quittés.
    suivreFils();
    suivreCoeurs();
    rendreListe();
  });
}

/* ==========================================================================
   Rendu
   ========================================================================== */

function gabaritMessage(message, compte) {
  const estMoi = compte && message.auteurId === compte.id;
  return `
    <div class="message ${estMoi ? 'message--moi' : ''}">
      <div class="avatar avatar--sm ${message.couleur || ''}" aria-hidden="true">${echapper(
        message.initiales
      )}</div>
      <div class="message__bulle">
        <p class="message__entete">
          <span class="message__auteur">${echapper(message.auteur)}</span>
          <span class="message__heure">${formaterDepuis(message.date)}</span>
        </p>
        <p class="message__texte">${echapper(message.texte)}</p>
        ${gabaritCoeur(message, compte)}
      </div>
    </div>
  `;
}

/* Un cœur dessiné, pas l'émoji : ❤️ change de forme et de couleur d'un système
   à l'autre, et jurerait avec les pictogrammes au trait du reste du site. */
const ICONE_COEUR =
  '<path d="M12 20.3 4.7 13a4.6 4.6 0 0 1 6.5-6.5l.8.8.8-.8A4.6 4.6 0 0 1 19.3 13Z"/>';

function gabaritCoeur(message, compte) {
  // Un message qui n'a pas encore d'identifiant — celui qu'on vient d'écrire
  // en mode local — ne peut pas porter de cœur : il n'y a rien à quoi
  // l'accrocher.
  if (!message.id) return '';

  const { total, parMoi } = coeursDe(message.id);
  const desactive = !compte;

  return `
    <button type="button"
            class="coeur ${parMoi ? 'est-pose' : ''}"
            data-coeur="${echapper(message.id)}"
            ${desactive ? 'disabled' : ''}
            aria-pressed="${parMoi}"
            title="${parMoi ? 'Retirer mon cœur' : 'J’ai vu ce message'}">
      <svg width="15" height="15" viewBox="0 0 24 24"
           fill="${parMoi ? 'currentColor' : 'none'}" stroke="currentColor"
           stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"
           aria-hidden="true">${ICONE_COEUR}</svg>
      <span class="coeur__compte">${total || ''}</span>
      <span class="sr-only">${
        total ? `${total} personne${total > 1 ? 's ont' : ' a'} vu ce message` : 'Personne n’a encore signalé avoir vu ce message'
      }</span>
    </button>`;
}

function rendreListe() {
  const liste = $('[data-liste-conversations]');
  if (!liste) return;

  liste.innerHTML = conversationsVisibles()
    .map((conversation) => {
      const neufs = nonLus(conversation.id);
      return `
        <button type="button" class="fil-onglet ${
          conversation.id === conversationActive ? 'est-actif' : ''
        }" data-conversation="${conversation.id}"
                aria-current="${conversation.id === conversationActive ? 'true' : 'false'}">
          <span class="fil-onglet__picto" aria-hidden="true">${picto(conversation.icone, 18)}</span>
          <span class="fil-onglet__texte">
            <span class="fil-onglet__nom">${echapper(conversation.nom)}</span>
            <span class="fil-onglet__meta">${echapper(conversation.description)}</span>
          </span>
          ${
            neufs
              ? `<span class="fil-onglet__pastille"
                       aria-label="${neufs} message${neufs > 1 ? 's' : ''} non lu${neufs > 1 ? 's' : ''}"
                       >${neufs > 99 ? '99+' : neufs}</span>`
              : `<span class="fil-onglet__compte">${messagesDe(conversation.id).length}</span>`
          }
        </button>
      `;
    })
    .join('');
}

function rendreFilDiscussion() {
  const zone = $('[data-fil-messages]');
  const titre = $('[data-fil-titre]');
  const meta = $('[data-fil-meta]');
  if (!zone) return;

  const conversation = trouverConversation(conversationActive);
  const compte = Comptes.courant();
  const messages = messagesDe(conversationActive);

  if (titre) titre.textContent = conversation ? conversation.nom : 'Discussion';
  if (meta) meta.textContent = conversation ? conversation.description : '';

  // L'astuce ne s'affiche que dans le fil d'un groupe : c'est là que tombent
  // le point de rendez-vous, l'horaire, ce qu'il faut prévoir — les messages
  // auxquels on doit répondre quelque chose, et pour lesquels un cœur suffit.
  const astuce = $('[data-fil-astuce]');
  if (astuce) {
    const dansUnGroupe = conversationActive !== 'general';
    astuce.hidden = !dansUnGroupe;
    if (dansUnGroupe) {
      astuce.innerHTML = `${picto(ICONE_COEUR, 13)} Un cœur sur un message suffit à dire
        « j’ai vu » — inutile de répondre « ok » ou « merci ».`;
    }
  }

  const enAttente = Boolean(base()) && filsDistants[conversationActive] === undefined;

  zone.innerHTML = messages.length
    ? messages.map((message) => gabaritMessage(message, compte)).join('')
    : `<p class="message-vide__texte" style="text-align:center;padding:var(--e-6) 0">
         ${enAttente ? 'Chargement du fil…' : 'Personne n’a encore écrit ici. À vous de commencer.'}
       </p>`;

  // Un fil se lit par le bas : c'est là que se trouve le dernier message.
  zone.scrollTop = zone.scrollHeight;
}

/* ==========================================================================
   Interactions
   ========================================================================== */

function choisirConversation(id) {
  if (!conversationsVisibles().some((conversation) => conversation.id === id)) return;
  conversationActive = id;
  marquerLu(id);
  suivreFils();
  suivreCoeurs();
  rendreListe();
  rendreFilDiscussion();

  // `replaceState` plutôt qu'une écriture du hash : on note le fil courant
  // dans l'URL sans relancer le routeur de la version fichier unique.
  history.replaceState(null, '', lienInterne('chat', id));
}

/** `#groupe-mine-bleue` ouvre directement le fil correspondant. */
function appliquerAncreChat() {
  const demande = (window.location.hash || '').replace(/^#\/?(chat\/)?/, '');
  if (demande && conversationsVisibles().some((c) => c.id === demande)) {
    conversationActive = demande;
    return true;
  }
  return false;
}

function brancherComposeur() {
  const formulaire = $('[data-composeur-chat]');
  if (!formulaire) return;

  const champ = $('[data-message-texte]', formulaire);
  const compteur = $('[data-compteur-message]', formulaire);

  champ.addEventListener('input', () => {
    const restant = LIMITE_MESSAGE - champ.value.length;
    compteur.textContent = `${restant} caractères`;
    compteur.classList.toggle('est-limite', restant < 60);
  });

  formulaire.addEventListener('submit', async (evenement) => {
    evenement.preventDefault();

    const compte = Comptes.courant();
    const texte = champ.value.trim();
    if (!compte || !texte) return;

    const message = {
      id: `m-${Date.now().toString(36)}`,
      auteurId: compte.id,
      auteur: Comptes.nomAffiche(compte),
      initiales: Comptes.initiales(compte),
      couleur: compte.couleur,
      date: new Date().toISOString(),
      texte: texte.slice(0, LIMITE_MESSAGE),
    };

    // Le champ est vidé tout de suite : attendre l'aller-retour donnerait
    // l'impression que le bouton n'a pas répondu.
    champ.value = '';
    champ.dispatchEvent(new Event('input'));

    const distant = base();
    if (distant) {
      try {
        // Pas de rendu ici : l'écouteur du fil s'en charge à la confirmation.
        await distant.envoyerMessage(conversationActive, message);
      } catch (erreur) {
        notifier('Message non envoyé. Vérifiez votre connexion.');
        champ.value = message.texte;
      }
      return;
    }

    ajouterMessageLocal(conversationActive, message);
    rendreListe();
    rendreFilDiscussion();
  });
}

/**
 * Bandeau affiché juste après une réservation : la personne arrive ici depuis
 * la modale, elle doit comprendre où elle a atterri.
 */
function afficherBandeauArrivee() {
  const bandeau = $('[data-bandeau-reservation]');
  if (!bandeau) return;

  const derniere = Stockage.lire('dps.derniereReservation', null);
  if (!derniere) return;

  bandeau.innerHTML = `
    <span class="bandeau-arrivee__pastille" aria-hidden="true">✓</span>
    <span>
      Votre place pour <strong>${echapper(derniere.titre)}</strong> est réservée.
      Voici le groupe : les autres inscrits sont déjà là.
    </span>
  `;
  bandeau.hidden = false;
  Stockage.effacer('dps.derniereReservation');
}

/* ==========================================================================
   Démarrage
   ========================================================================== */

/** Les écouteurs ne se posent qu'une fois, même si l'on repasse par ici. */
let chatBranche = false;

/**
 * Met la page à l'état correspondant à la session. Rejouable : dans la version
 * fichier unique, on peut arriver sur les discussions sans rechargement — après
 * une inscription ou une réservation — et l'état doit alors être recalculé.
 */
function preparerChat() {
  if (!$('[data-page-chat]')) return;

  const compte = Comptes.courant();
  const portail = $('[data-portail-chat]');
  const espace = $('[data-espace-chat]');

  if (portail) portail.hidden = Boolean(compte);
  if (espace) espace.hidden = !compte;
  if (!compte) return;

  suivreReservations();
  appliquerAncreChat();
  suivreFils();
  suivreCoeurs();
  // Ouvrir le fil, c'est le lire.
  marquerLu(conversationActive);
  rendreListe();
  rendreFilDiscussion();
  afficherBandeauArrivee();

  if (chatBranche) return;
  chatBranche = true;

  brancherComposeur();

  const liste = $('[data-liste-conversations]');
  if (liste) {
    liste.addEventListener('click', (evenement) => {
      const bouton = evenement.target.closest('[data-conversation]');
      if (bouton) choisirConversation(bouton.dataset.conversation);
    });
  }

  // Écouteur posé sur la zone et non sur chaque cœur : le fil est réécrit à
  // chaque message reçu, et des écouteurs individuels seraient à reposer à
  // chaque fois.
  const zoneMessages = $('[data-fil-messages]');
  if (zoneMessages) {
    zoneMessages.addEventListener('click', (evenement) => {
      const bouton = evenement.target.closest('[data-coeur]');
      if (bouton && !bouton.disabled) void basculerCoeur(bouton.dataset.coeur);
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  preparerChat();

  // Trois raisons de recalculer sans rechargement : le lien d'un groupe depuis
  // une autre vue (version fichier unique), Firebase qui annonce la session
  // après le premier rendu, et Firestore qui peut finir de démarrer après coup.
  //
  // Ce dernier cas est réel, pas théorique : l'authentification et Firestore
  // s'initialisent l'une après l'autre dans firebase-init.js, et rien ne
  // garantit leur ordre d'arrivée. Si `dps:session` arrive avant que Firestore
  // soit prêt, `suivreFils()` s'exécute avec une base encore absente — elle
  // renonce sans bruit, et sans ce troisième écouteur, plus rien ne la relance :
  // les messages partent, mais ne s'affichent jamais.
  window.addEventListener('hashchange', preparerChat);
  window.addEventListener('dps:session', preparerChat);
  window.addEventListener('dps:donnees-pretes', preparerChat);
});
