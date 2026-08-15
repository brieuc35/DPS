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
const LIMITE_MESSAGE = 600;

let conversationActive = 'general';

/* État tenu par les écouteurs Firestore. Tant que `filDistant` vaut null, le
   fil n'a pas encore répondu : on n'affiche pas « personne n'a écrit » sur une
   simple latence réseau. */
let filDistant = null;
let desabonnerFil = null;
let reservationsDistantes = null;
let desabonnerReservations = null;

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
    return conversationId === conversationActive && filDistant ? filDistant : [];
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

/** (Ré)abonne le fil affiché. Un seul écouteur vit à la fois. */
function suivreFil() {
  const distant = base();
  if (!distant) return;

  if (desabonnerFil) desabonnerFil();
  filDistant = null;

  desabonnerFil = distant.ecouterMessages(conversationActive, (messages) => {
    filDistant = messages;
    rendreListe();
    rendreFilDiscussion();
  });
}

/** Suit les réservations du membre : elles décident des fils auxquels il a accès. */
function suivreReservations() {
  const distant = base();
  const compte = Comptes.courant();
  if (!distant || !compte) return;

  if (desabonnerReservations) desabonnerReservations();

  desabonnerReservations = distant.ecouterMesReservations(compte.id, (reservations) => {
    reservationsDistantes = reservations;
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
      </div>
    </div>
  `;
}

function rendreListe() {
  const liste = $('[data-liste-conversations]');
  if (!liste) return;

  liste.innerHTML = conversationsVisibles()
    .map((conversation) => {
      const nombre = messagesDe(conversation.id).length;
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
          <span class="fil-onglet__compte">${nombre}</span>
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

  const enAttente = Boolean(base()) && filDistant === null;

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
  suivreFil();
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
  suivreFil();
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
  // soit prêt, `suivreFil()` s'exécute avec une base encore absente — elle
  // renonce sans bruit, et sans ce troisième écouteur, plus rien ne la relance :
  // les messages partent, mais ne s'affichent jamais.
  window.addEventListener('hashchange', preparerChat);
  window.addEventListener('dps:session', preparerChat);
  window.addEventListener('dps:donnees-pretes', preparerChat);
});
