/**
 * DPS — Comptes
 * ---------------------------------------------------------------------------
 * Une seule surface d'API — `Comptes` — pour deux implémentations possibles :
 *
 * - **mode Firebase**, quand `firebase-init.js` a réussi à ouvrir la session.
 *   Les comptes sont alors de vrais comptes : même identité d'un appareil à
 *   l'autre, mot de passe géré par Google, jamais stocké ici.
 *
 * - **mode local**, sinon. Les comptes vivent dans le `localStorage` du
 *   navigateur qui les a créés. C'est une maquette du parcours : le mot de passe
 *   n'est pas conservé en clair (empreinte SHA-256 salée), mais cela ne protège
 *   personne — qui a la main sur le navigateur a la main sur les comptes.
 *
 * Le repli n'est pas un ornement : l'aperçu hors ligne du site, lui, n'a accès à
 * aucun serveur. C'est ce mode qui l'y fait fonctionner.
 */

const CLE_COMPTES = 'dps.comptes';
const CLE_SESSION = 'dps.session';

const COULEURS_AVATAR = ['avatar--ciel', 'avatar--prune', 'avatar--terre', 'avatar--ambre'];

/** Le pont Firebase, ou null tant qu'il n'a pas démarré (ou s'il a échoué). */
function pont() {
  return window.DPS_AUTH && window.DPS_AUTH.disponible ? window.DPS_AUTH : null;
}

/* ==========================================================================
   Mode local — empreinte du mot de passe
   ========================================================================== */

/** Sel aléatoire en hexadécimal, propre à chaque compte. */
function nouveauSel() {
  const octets = new Uint8Array(16);
  if (window.crypto && window.crypto.getRandomValues) {
    window.crypto.getRandomValues(octets);
  } else {
    for (let i = 0; i < octets.length; i += 1) octets[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(octets, (octet) => octet.toString(16).padStart(2, '0')).join('');
}

/**
 * SHA-256 quand le navigateur l'expose (contexte sécurisé : https, localhost
 * et file://). Sinon on retombe sur un condensé non cryptographique — assez
 * pour que le mot de passe ne traîne pas en clair, pas davantage.
 */
async function empreinte(motDePasse, sel) {
  const donnees = `dps:${sel}:${motDePasse}`;

  if (window.crypto && window.crypto.subtle) {
    const tampon = await window.crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(donnees)
    );
    return Array.from(new Uint8Array(tampon), (octet) =>
      octet.toString(16).padStart(2, '0')
    ).join('');
  }

  let a = 0x811c9dc5;
  for (let i = 0; i < donnees.length; i += 1) {
    a ^= donnees.charCodeAt(i);
    a = Math.imul(a, 0x01000193) >>> 0;
  }
  return 'faible-' + a.toString(16);
}

const Local = {
  liste() {
    return Stockage.lire(CLE_COMPTES, []);
  },

  courant() {
    const id = Stockage.lire(CLE_SESSION, null);
    if (!id) return null;
    return this.liste().find((compte) => compte.id === id) || null;
  },

  parEmail(email) {
    const cible = (email || '').trim().toLowerCase();
    return this.liste().find((compte) => compte.email === cible) || null;
  },

  async creer({ prenom, nom, email, motDePasse }) {
    if (this.parEmail(email)) return { ok: false, motif: 'existe' };

    const sel = nouveauSel();
    const comptes = this.liste();
    const compte = {
      id: `c-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
      prenom: prenom.trim(),
      nom: nom.trim(),
      email: email.trim().toLowerCase(),
      sel,
      empreinte: await empreinte(motDePasse, sel),
      couleur: COULEURS_AVATAR[comptes.length % COULEURS_AVATAR.length],
      creeLe: new Date().toISOString(),
    };

    Stockage.ecrire(CLE_COMPTES, [...comptes, compte]);
    Stockage.ecrire(CLE_SESSION, compte.id);
    return { ok: true, compte };
  },

  async connecter(email, motDePasse) {
    const compte = this.parEmail(email);
    if (!compte) return { ok: false, motif: 'inconnu' };

    const essai = await empreinte(motDePasse, compte.sel);
    if (essai !== compte.empreinte) return { ok: false, motif: 'motdepasse' };

    Stockage.ecrire(CLE_SESSION, compte.id);
    return { ok: true, compte };
  },

  async deconnecter() {
    Stockage.effacer(CLE_SESSION);
  },

  /**
   * Un compte local n'a pas d'adresse à laquelle envoyer quoi que ce soit —
   * il ne quitte jamais ce navigateur. La réinitialisation n'a donc de sens
   * qu'une fois Firestore là ; ce repli le dit sans détour plutôt que de
   * feindre un envoi qui ne partira jamais.
   */
  async reinitialiserMotDePasse() {
    return { ok: false, motif: 'indisponible-local' };
  },

  /** Efface le compte et tout ce que ce navigateur garde de lui. */
  async supprimer(motDePasse) {
    const compte = this.courant();
    if (!compte) return { ok: false, motif: 'inconnu' };

    const essai = await empreinte(motDePasse, compte.sel);
    if (essai !== compte.empreinte) return { ok: false, motif: 'motdepasse' };

    Stockage.ecrire(CLE_COMPTES, this.liste().filter((autre) => autre.id !== compte.id));
    Stockage.effacer(CLE_SESSION);

    // Les traces laissées par ce compte dans le navigateur partent avec lui.
    ['dps.reservations', 'dps.messages', 'dps.publications', 'dps.jaimes',
     'dps.reponses', 'dps.adhesion', 'dps.derniereReservation']
      .forEach((cle) => Stockage.effacer(cle));

    return { ok: true };
  },
};

/* ==========================================================================
   Surface commune
   ========================================================================== */

const Comptes = {
  /** 'firebase' ou 'local' — utile pour l'affichage et le diagnostic. */
  get mode() {
    return pont() ? 'firebase' : 'local';
  },

  /**
   * Le mode local répond tout de suite ; Firebase demande un aller-retour.
   * Tant que ce n'est pas vrai, l'absence de compte ne veut rien dire.
   */
  get pret() {
    const distant = pont();
    return distant ? distant.resolu : true;
  },

  courant() {
    const distant = pont();
    return distant ? distant.profil : Local.courant();
  },

  async creer(donnees) {
    const distant = pont();
    return distant ? distant.creer(donnees) : Local.creer(donnees);
  },

  async connecter(email, motDePasse) {
    const distant = pont();
    return distant ? distant.connecter(email, motDePasse) : Local.connecter(email, motDePasse);
  },

  async deconnecter() {
    const distant = pont();
    return distant ? distant.deconnecter() : Local.deconnecter();
  },

  async reinitialiserMotDePasse(email) {
    const distant = pont();
    return distant ? distant.reinitialiserMotDePasse(email) : Local.reinitialiserMotDePasse(email);
  },

  /**
   * Supprime le compte définitivement. Le mot de passe est redemandé : il
   * confirme l'intention, et Firebase exige de toute façon une authentification
   * récente avant d'effacer un compte.
   */
  async supprimer(motDePasse) {
    const distant = pont();
    return distant ? distant.supprimer(motDePasse) : Local.supprimer(motDePasse);
  },

  /** Deux initiales, jamais une seule : « B » ferait un avatar bancal. */
  initiales(compte) {
    if (!compte) return 'VS';
    const lettres = `${compte.prenom || ''} ${compte.nom || ''}`
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((mot) => mot[0])
      .join('');
    return (lettres || compte.prenom || 'VS').slice(0, 2).toUpperCase();
  },

  nomAffiche(compte) {
    if (!compte) return 'Vous';
    const initialeNom = (compte.nom || '').trim().slice(0, 1);
    return initialeNom ? `${compte.prenom} ${initialeNom}.` : compte.prenom;
  },
};

/* ==========================================================================
   En-tête
   ========================================================================== */

/**
 * Remplace « Se connecter / Créer un compte » par l'identité du membre une
 * fois la session ouverte. Le HTML porte l'état déconnecté : sans JavaScript,
 * les deux liens restent utilisables.
 *
 * Rejouable, et il le faut : la version fichier unique change de vue sans
 * recharger, et Firebase répond après le premier rendu.
 */
function initEnteteCompte() {
  const zones = $$('[data-zone-compte]');
  if (!zones.length) return;

  const compte = Comptes.courant();

  const contenu = compte
    ? `
      <a class="nav__lien nav__lien--compte" href="compte.html">
        <span class="avatar avatar--sm ${compte.couleur}" aria-hidden="true">${echapper(
          Comptes.initiales(compte)
        )}</span>
        ${echapper(compte.prenom)}
      </a>
      <a class="nav__lien nav__lien--compte" href="chat.html">Discussions</a>
    `
    : `
      <a class="nav__lien nav__lien--compte" href="compte.html#connexion">Se connecter</a>
      <a class="nav__lien nav__lien--compte" href="compte.html#inscription">Créer un compte</a>
    `;

  // Deux exemplaires dans le document — barre d'actions et menu replié — dont
  // un seul est affiché : les deux doivent porter le même état.
  zones.forEach((zone) => {
    zone.innerHTML = contenu;
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initEnteteCompte();
  window.addEventListener('hashchange', initEnteteCompte);
});

// Firebase répond après coup : chaque changement de session redessine l'en-tête.
window.addEventListener('dps:session', initEnteteCompte);
