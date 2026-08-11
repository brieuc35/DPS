/**
 * DPS — Comptes
 * ---------------------------------------------------------------------------
 * Inscription, connexion et session, plus l'état « connecté » de l'en-tête.
 *
 * ATTENTION — le site est statique : il n'y a pas de serveur, donc pas
 * d'authentification réelle. Les comptes vivent dans le localStorage du
 * navigateur qui les a créés. Le mot de passe n'est jamais conservé en clair
 * (empreinte SHA-256 salée), mais cela ne protège personne : quiconque a la
 * main sur le navigateur a la main sur les comptes. C'est une maquette du
 * parcours, à remplacer par un vrai back-end avant toute mise en service.
 */

const CLE_COMPTES = 'dps.comptes';
const CLE_SESSION = 'dps.session';

const COULEURS_AVATAR = ['avatar--ciel', 'avatar--prune', 'avatar--terre', 'avatar--ambre'];

/* ==========================================================================
   Empreinte du mot de passe
   ========================================================================== */

/** Sel aléatoire en hexadécimal, propre à chaque compte. */
function nouveauSel() {
  const octets = new Uint8Array(16);
  (window.crypto || {}).getRandomValues
    ? window.crypto.getRandomValues(octets)
    : octets.forEach((_, i) => (octets[i] = Math.floor(Math.random() * 256)));
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

/* ==========================================================================
   Modèle
   ========================================================================== */

const Comptes = {
  liste() {
    return Stockage.lire(CLE_COMPTES, []);
  },

  /** Le compte connecté, ou null. */
  courant() {
    const id = Stockage.lire(CLE_SESSION, null);
    if (!id) return null;
    return this.liste().find((compte) => compte.id === id) || null;
  },

  parEmail(email) {
    const cible = (email || '').trim().toLowerCase();
    return this.liste().find((compte) => compte.email === cible) || null;
  },

  /**
   * @returns {Promise<{ok: boolean, motif?: string, compte?: object}>}
   */
  async creer({ prenom, nom, email, motDePasse }) {
    if (this.parEmail(email)) {
      return { ok: false, motif: 'existe' };
    }

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

  deconnecter() {
    Stockage.ecrire(CLE_SESSION, null);
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
 * Rejouable, car la version fichier unique change de vue sans recharger : la
 * session peut s'ouvrir ou se fermer pendant la vie de la page.
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
