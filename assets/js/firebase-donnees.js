/**
 * DPS — Messages et réservations dans Firestore
 * ---------------------------------------------------------------------------
 * Expose `window.DPS_DB`, le pendant de `DPS_AUTH` pour les données partagées.
 * `chat.js` et `activites.js` s'en servent quand il est là, et retombent sur
 * leur stockage local sinon.
 *
 * Trois collections, et une raison à chaque champ :
 *
 *   /messages/{id}
 *     conversation  'general' ou 'groupe-<activité>' — sert au filtrage et aux
 *                   règles de sécurité, qui vérifient l'inscription au groupe.
 *     auteurId      l'uid, seule valeur qu'une règle peut confronter à la
 *                   session ; le nom affiché, lui, est décoratif.
 *     date          horodatage du serveur, pas du navigateur : deux appareils
 *                   mal réglés donneraient sinon un fil incohérent.
 *
 *   /reservations/{activité}_{uid}
 *     L'identifiant est composé exprès : il rend la double réservation
 *     impossible, et permet à une règle de vérifier l'inscription d'un membre
 *     en une seule lecture — une règle ne sait pas faire de requête.
 *
 *   /activites/{id}
 *     placesPrises  compteur agrégé, tenu dans une transaction pour que deux
 *                   personnes ne puissent pas prendre la même dernière place.
 */

import {
  getFirestore,
  collection,
  doc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  addDoc,
  getDocs,
  runTransaction,
  serverTimestamp,
} from '../vendor/firebase/firebase-firestore.js';

/** Le SDK rend un Timestamp ; le site manipule des dates ISO. */
function versDate(valeur) {
  if (!valeur) return new Date().toISOString();
  if (typeof valeur.toDate === 'function') return valeur.toDate().toISOString();
  return String(valeur);
}

/**
 * Appelée par `firebase-init.js` une fois l'application créée. Ce module
 * n'importe surtout pas `firebase-init` en retour : les deux s'attendraient
 * l'un l'autre, et l'évaluation ne se terminerait jamais.
 */
export function demarrerDonnees(application) {
  const base = getFirestore(application);

  window.DPS_DB = {
    disponible: true,

    /* -------------------------------------------------------------- messages */

    /**
     * S'abonne à un fil. Renvoie la fonction de désabonnement — le fil change
     * quand on passe d'une conversation à l'autre, et laisser traîner un
     * écouteur ferait s'accumuler les rendus.
     */
    ecouterMessages(conversationId, rappel) {
      const requete = query(
        collection(base, 'messages'),
        where('conversation', '==', conversationId),
        orderBy('date', 'asc'),
        limit(200)
      );

      return onSnapshot(
        requete,
        (instantane) => {
          rappel(
            instantane.docs.map((document) => {
              const donnees = document.data();
              return { id: document.id, ...donnees, date: versDate(donnees.date) };
            })
          );
        },
        (erreur) => {
          console.warn('Lecture du fil impossible.', erreur);
          rappel([]);
        }
      );
    },

    async envoyerMessage(conversationId, message) {
      await addDoc(collection(base, 'messages'), {
        conversation: conversationId,
        auteurId: message.auteurId,
        auteur: message.auteur,
        initiales: message.initiales,
        couleur: message.couleur,
        texte: message.texte,
        date: serverTimestamp(),
      });
    },

    /* --------------------------------------------------------- réservations */

    /** Les réservations du membre connecté, en temps réel. */
    ecouterMesReservations(membreId, rappel) {
      const requete = query(
        collection(base, 'reservations'),
        where('membreId', '==', membreId)
      );

      return onSnapshot(
        requete,
        (instantane) => {
          rappel(
            instantane.docs.map((document) => {
              const donnees = document.data();
              return { id: document.id, ...donnees, creeLe: versDate(donnees.creeLe) };
            })
          );
        },
        (erreur) => {
          console.warn('Lecture des réservations impossible.', erreur);
          rappel([]);
        }
      );
    },

    /** Le nombre de places prises par activité, en temps réel. */
    ecouterJauges(rappel) {
      return onSnapshot(
        collection(base, 'activites'),
        (instantane) => {
          const jauges = {};
          instantane.docs.forEach((document) => {
            jauges[document.id] = document.data().placesPrises || 0;
          });
          rappel(jauges);
        },
        (erreur) => {
          console.warn('Lecture des jauges impossible.', erreur);
          rappel({});
        }
      );
    },

    /**
     * Réserve dans une transaction : la relecture du compteur et son écriture
     * sont atomiques, donc deux personnes ne peuvent pas emporter la même
     * dernière place. `placesInitiales` amorce le compteur au premier passage,
     * pour que les jauges de démonstration ne repartent pas de zéro.
     */
    async reserver({ activiteId, placesTotal, placesInitiales, membreId, participant }) {
      const compteur = doc(base, 'activites', activiteId);
      const reservation = doc(base, 'reservations', `${activiteId}_${membreId}`);

      try {
        const restantes = await runTransaction(base, async (transaction) => {
          // Les lectures d'abord : une transaction Firestore refuse de lire
          // après avoir écrit.
          const etat = await transaction.get(compteur);
          const dejaInscrit = await transaction.get(reservation);

          if (dejaInscrit.exists()) throw new Error('deja-inscrit');

          const prises = etat.exists() ? etat.data().placesPrises || 0 : placesInitiales;
          if (prises + participant.places > placesTotal) throw new Error('complet');

          transaction.set(compteur, { placesPrises: prises + participant.places }, { merge: true });
          transaction.set(reservation, {
            activiteId,
            membreId,
            titre: participant.titre,
            prenom: participant.prenom,
            email: participant.email,
            places: participant.places,
            creeLe: serverTimestamp(),
          });

          return placesTotal - (prises + participant.places);
        });

        return { ok: true, restantes };
      } catch (erreur) {
        const attendue = erreur && ['complet', 'deja-inscrit'].includes(erreur.message);
        if (!attendue) console.warn('Réservation impossible.', erreur);
        return { ok: false, motif: attendue ? erreur.message : 'echec' };
      }
    },

    /** Réservé aux tests : efface les messages d'un fil. */
    async _viderFil(conversationId) {
      const instantane = await getDocs(
        query(collection(base, 'messages'), where('conversation', '==', conversationId))
      );
      await Promise.all(instantane.docs.map((document) => deleteDoc(document.ref)));
    },
  };

  window.dispatchEvent(new CustomEvent('dps:donnees-pretes'));
}
