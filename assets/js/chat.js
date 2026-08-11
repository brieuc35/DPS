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

/* ==========================================================================
   Données
   ========================================================================== */

/** Messages d'exemple d'un fil, complétés par ceux écrits sur cet appareil. */
function messagesDe(conversationId) {
  const ecrits = Stockage.lire(CLE_MESSAGES, {})[conversationId] || [];
  return [...(MESSAGES_EXEMPLE[conversationId] || []), ...ecrits].sort(
    (a, b) => new Date(a.date) - new Date(b.date)
  );
}

function ajouterMessage(conversationId, message) {
  const tous = Stockage.lire(CLE_MESSAGES, {});
  tous[conversationId] = [...(tous[conversationId] || []), message];
  Stockage.ecrire(CLE_MESSAGES, tous);
}

/** Identifiants des sorties réservées sur cet appareil. */
function groupesReserves() {
  const reservations = Stockage.lire('dps.reservations', []);
  return [...new Set(reservations.map((reservation) => `groupe-${reservation.activiteId}`))];
}

/**
 * Les fils visibles : le salon, plus les groupes des sorties réservées. Un
 * groupe auquel on n'est pas inscrit n'apparaît pas — c'est la contrepartie de
 * la promesse « ce qui se dit dans le groupe y reste ».
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
          <span class="fil-onglet__emoji" aria-hidden="true">${conversation.emoji}</span>
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

  zone.innerHTML = messages.length
    ? messages.map((message) => gabaritMessage(message, compte)).join('')
    : `<p class="message-vide__texte" style="text-align:center;padding:var(--e-6) 0">
         Personne n’a encore écrit ici. À vous de commencer.
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

  formulaire.addEventListener('submit', (evenement) => {
    evenement.preventDefault();

    const compte = Comptes.courant();
    const texte = champ.value.trim();
    if (!compte || !texte) return;

    ajouterMessage(conversationActive, {
      id: `m-${Date.now().toString(36)}`,
      auteurId: compte.id,
      auteur: Comptes.nomAffiche(compte),
      initiales: Comptes.initiales(compte),
      couleur: compte.couleur,
      date: new Date().toISOString(),
      texte: texte.slice(0, LIMITE_MESSAGE),
    });

    champ.value = '';
    champ.dispatchEvent(new Event('input'));
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
  Stockage.ecrire('dps.derniereReservation', null);
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

  appliquerAncreChat();
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

  // Le lien d'un groupe depuis une autre vue ne recharge pas la page dans la
  // version fichier unique : on suit l'ancre.
  window.addEventListener('hashchange', preparerChat);
});
