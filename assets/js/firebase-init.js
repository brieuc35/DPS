/**
 * DPS — Pont vers Firebase Authentication
 * ---------------------------------------------------------------------------
 * Le SDK Firebase est un module ES ; le reste du site est en scripts classiques.
 * Ce fichier fait la jonction : il charge le SDK, ouvre la session, et expose
 * sur `window.DPS_AUTH` une petite surface d'API que `comptes.js` sait utiliser.
 *
 * Deux choses à savoir sur la forme de cette API :
 *
 * 1. `profil` est un instantané **synchrone**. Firebase, lui, annonce la session
 *    de façon asynchrone. Le reste du site interroge l'identité un peu partout
 *    (en-tête, portail du chat, préremplissage) et le faire en asynchrone
 *    partout compliquerait tout pour rien : on garde donc une copie à jour,
 *    et on prévient par l'événement `dps:session` quand elle change.
 *
 * 2. Si le SDK ne se charge pas — réseau coupé, page ouverte depuis un fichier,
 *    aperçu hors ligne — rien n'est exposé et `comptes.js` retombe sur son mode
 *    local. Le site continue de fonctionner, avec des comptes qui ne quittent
 *    pas le navigateur.
 */

import { initializeApp } from '../vendor/firebase/firebase-app.js';
import {
  getAuth,
  deleteUser,
  reauthenticateWithCredential,
  EmailAuthProvider,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  sendEmailVerification,
  reload,
  signOut,
  updateProfile,
  onAuthStateChanged,
  browserLocalPersistence,
  setPersistence,
} from '../vendor/firebase/firebase-auth.js';

const COULEURS = ['avatar--ciel', 'avatar--prune', 'avatar--terre', 'avatar--ambre'];

/** Couleur d'avatar déduite de l'identifiant : stable, sans stockage. */
function couleurDe(uid) {
  let somme = 0;
  for (let i = 0; i < uid.length; i += 1) somme += uid.charCodeAt(i);
  return COULEURS[somme % COULEURS.length];
}

/** Traduit un utilisateur Firebase en profil tel que le site l'attend. */
function versProfil(utilisateur) {
  if (!utilisateur) return null;

  const complet = (utilisateur.displayName || '').trim();
  const morceaux = complet.split(/\s+/).filter(Boolean);

  return {
    id: utilisateur.uid,
    prenom: morceaux[0] || 'Membre',
    nom: morceaux.slice(1).join(' '),
    email: utilisateur.email || '',
    /* Firebase ne considère une adresse comme vérifiée qu'après un clic sur le
       lien envoyé. C'est ce drapeau qui sépare une adresse réelle d'un
       « 0@0.com » saisi pour passer le formulaire, et c'est lui que les règles
       Firestore consultent avant d'autoriser un envoi de courriel. */
    emailVerifie: Boolean(utilisateur.emailVerified),
    couleur: couleurDe(utilisateur.uid),
  };
}

/** Messages en clair pour les codes d'erreur qui remontent aux formulaires. */
function motifDe(erreur) {
  switch (erreur && erreur.code) {
    case 'auth/email-already-in-use':
      return 'existe';
    case 'auth/user-not-found':
      return 'inconnu';
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'motdepasse';
    case 'auth/invalid-email':
      return 'email';
    case 'auth/weak-password':
      return 'faible';
    case 'auth/too-many-requests':
      return 'trop';
    case 'auth/network-request-failed':
      return 'reseau';
    default:
      return 'inconnu-erreur';
  }
}

/**
 * Interrupteur de mode local. Deux usages :
 * - démontrer le site sans réseau, avec des comptes qui ne quittent pas le
 *   navigateur ;
 * - exercer ce même repli dans les tests automatisés.
 * Posez `localStorage.setItem('dps.modeLocal', 'true')` pour l'activer.
 */
function modeLocalDemande() {
  try {
    return localStorage.getItem('dps.modeLocal') === 'true';
  } catch (erreur) {
    return false;
  }
}

/** L'application Firebase, transmise ensuite au module de données. */
let application = null;

try {
  if (modeLocalDemande()) throw new Error('mode local demandé');

  application = initializeApp(window.CONFIG_FIREBASE);
  const auth = getAuth(application);

  // La session survit à la fermeture de l'onglet : on ne redemande pas le mot
  // de passe à chaque visite.
  await setPersistence(auth, browserLocalPersistence);

  const pont = {
    disponible: true,
    /** Instantané de la session, null tant qu'elle n'est pas résolue. */
    profil: null,
    /** Passe à true dès la première réponse de Firebase. */
    resolu: false,

    async creer({ prenom, nom, email, motDePasse }) {
      try {
        const { user } = await createUserWithEmailAndPassword(auth, email.trim(), motDePasse);
        await updateProfile(user, { displayName: `${prenom.trim()} ${nom.trim()}`.trim() });

        // Le lien de vérification part tout de suite. On n'attend pas et on
        // n'échoue pas dessus : le compte est créé, et un envoi manqué se
        // rattrape depuis l'espace membre, qui propose de le renvoyer.
        sendEmailVerification(user).catch((erreur) => {
          console.warn('Lien de vérification non envoyé.', erreur);
        });

        // `updateProfile` ne rejoue pas onAuthStateChanged : on rafraîchit le
        // profil nous-mêmes pour que le prénom soit là immédiatement.
        pont.profil = versProfil(auth.currentUser);
        annoncer();
        return { ok: true, compte: pont.profil };
      } catch (erreur) {
        return { ok: false, motif: motifDe(erreur) };
      }
    },

    async connecter(email, motDePasse) {
      try {
        const { user } = await signInWithEmailAndPassword(auth, email.trim(), motDePasse);
        return { ok: true, compte: versProfil(user) };
      } catch (erreur) {
        return { ok: false, motif: motifDe(erreur) };
      }
    },

    /**
     * Envoie un lien de réinitialisation. Réussit aussi, à dessein, quand
     * l'adresse ne correspond à aucun compte : la réponse ne doit pas
     * permettre de deviner qui est membre du site — le même principe que le
     * message de connexion, qui ne dit jamais si c'est l'adresse ou le mot
     * de passe qui cloche.
     */
    async reinitialiserMotDePasse(email) {
      try {
        await sendPasswordResetEmail(auth, email.trim());
        return { ok: true };
      } catch (erreur) {
        if (erreur && erreur.code === 'auth/user-not-found') return { ok: true };
        return { ok: false, motif: motifDe(erreur) };
      }
    },

    /** Renvoie le lien de vérification à l'adresse du compte en cours. */
    async renvoyerVerification() {
      if (!auth.currentUser) return { ok: false, motif: 'session' };
      try {
        await sendEmailVerification(auth.currentUser);
        return { ok: true };
      } catch (erreur) {
        return { ok: false, motif: motifDe(erreur) };
      }
    },

    /**
     * Relit l'utilisateur auprès de Firebase. Le clic sur le lien de
     * vérification se fait dans un autre onglet : rien ne le signale à
     * celui-ci, dont le jeton continue d'affirmer que l'adresse n'est pas
     * vérifiée jusqu'à ce qu'on aille le redemander.
     */
    async rafraichirSession() {
      if (!auth.currentUser) return { ok: false, motif: 'session' };
      try {
        await reload(auth.currentUser);
        pont.profil = versProfil(auth.currentUser);
        annoncer();
        return { ok: true, verifie: pont.profil.emailVerifie };
      } catch (erreur) {
        return { ok: false, motif: motifDe(erreur) };
      }
    },

    async deconnecter() {
      await signOut(auth);
    },

    /**
     * Efface le compte, après avoir effacé ce qui s'y rattache. L'ordre compte :
     * une fois l'utilisateur supprimé, il n'a plus le droit d'écrire dans
     * Firestore, et ses données resteraient orphelines à jamais.
     *
     * Firebase exige une authentification récente pour cette opération — d'où
     * le mot de passe, qui sert aussi de confirmation d'intention.
     */
    async supprimer(motDePasse) {
      const utilisateur = auth.currentUser;
      if (!utilisateur) return { ok: false, motif: 'inconnu' };

      try {
        await reauthenticateWithCredential(
          utilisateur,
          EmailAuthProvider.credential(utilisateur.email, motDePasse)
        );
      } catch (erreur) {
        return { ok: false, motif: motifDe(erreur) };
      }

      try {
        if (window.DPS_DB && window.DPS_DB.disponible) {
          await window.DPS_DB.effacerDonneesMembre(utilisateur.uid);
        }
        await deleteUser(utilisateur);
        return { ok: true };
      } catch (erreur) {
        console.warn('Suppression du compte impossible.', erreur);
        return { ok: false, motif: motifDe(erreur) };
      }
    },
  };

  function annoncer() {
    window.dispatchEvent(new CustomEvent('dps:session', { detail: pont.profil }));
  }

  onAuthStateChanged(auth, (utilisateur) => {
    pont.profil = versProfil(utilisateur);
    pont.resolu = true;
    annoncer();
  });

  window.DPS_AUTH = pont;
} catch (erreur) {
  // Aucun cri : le site sait fonctionner sans, et l'utilisateur n'a rien à
  // faire de ce message. La console suffit pour diagnostiquer.
  console.warn('Firebase indisponible, les comptes restent locaux à ce navigateur.', erreur);
}

// Firestore n'a de sens qu'une fois l'application créée. On lui passe cette
// application plutôt que de la lui faire importer : un import en retour vers
// ce fichier-ci formerait un cycle, et deux modules qui s'attendent avec un
// `await` au sommet ne s'évaluent jamais.
if (application) {
  try {
    const { demarrerDonnees } = await import('./firebase-donnees.js');
    demarrerDonnees(application);
  } catch (erreur) {
    console.warn('Firestore indisponible, les données restent locales.', erreur);
  }
}

// Que Firebase ait démarré ou non, le reste du site doit pouvoir arrêter
// d'attendre.
window.dispatchEvent(new CustomEvent('dps:auth-prete'));
