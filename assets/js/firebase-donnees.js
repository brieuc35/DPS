/**
 * DPS — Messages et réservations dans Firestore
 * ---------------------------------------------------------------------------
 * Expose `window.DPS_DB`, le pendant de `DPS_AUTH` pour les données partagées.
 * `chat.js` et `activites.js` s'en servent quand il est là, et retombent sur
 * leur stockage local sinon.
 *
 * Six collections, et une raison à chaque champ :
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
 *
 *   /publications/{id}
 *     cercle         le fil thématique où la publication apparaît.
 *     jaimesCompte   compteur agrégé, tenu à jour par les transactions de
 *                    `/jaimes` — jamais écrit directement.
 *     Une annonce automatique (voir `annoncerActivite`) porte l'identifiant
 *     déterministe « annonce-<activité> » : la règle de sécurité refuse
 *     qu'une seconde tentative la recrée, ce qui suffit à rendre le pont
 *     activités → fil idempotent sans le moindre verrou côté site.
 *
 *   /reponses/{id}
 *     publicationId  la publication à laquelle la réponse se rattache.
 *
 *   /jaimes/{publication}_{uid}
 *     Même principe que les réservations : l'identifiant composé rend un
 *     double soutien impossible et se vérifie d'une seule lecture.
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
  setDoc,
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

    /* ------------------------------------------------------ fil de la communauté */

    /**
     * Le fil complet, en temps réel — le filtrage par cercle reste côté site.
     * `rappel` reçoit aussi la liste des changements de cet instantané
     * (ajouts, modifications, suppressions) : le site s'en sert pour ne
     * corriger qu'un compteur de soutiens sans reformer tout l'affichage
     * quand c'est tout ce qui a changé.
     */
    ecouterPublications(rappel) {
      const requete = query(
        collection(base, 'publications'),
        orderBy('date', 'desc'),
        limit(200)
      );

      return onSnapshot(
        requete,
        (instantane) => {
          const publications = instantane.docs.map((document) => {
            const donnees = document.data();
            return { id: document.id, ...donnees, date: versDate(donnees.date) };
          });
          const changements = instantane.docChanges().map((changement) => ({
            type: changement.type,
            id: changement.doc.id,
          }));
          rappel(publications, changements);
        },
        (erreur) => {
          console.warn('Lecture du fil impossible.', erreur);
          rappel([], []);
        }
      );
    },

    async publier(publication) {
      await addDoc(collection(base, 'publications'), {
        auteurId: publication.auteurId,
        auteur: publication.auteur,
        initiales: publication.initiales,
        couleur: publication.couleur,
        cercle: publication.cercle,
        contenu: publication.contenu,
        badge: publication.badge || null,
        jaimesCompte: 0,
        date: serverTimestamp(),
      });
    },

    /**
     * Crée l'annonce d'une activité si elle n'existe pas déjà. L'identifiant
     * déterministe — « annonce-<id> » — porte à lui seul toute la protection :
     * une deuxième tentative est traitée par Firestore comme une modification,
     * pas une création, et la règle de sécurité refuse de modifier une
     * publication existante au-delà de son compteur de soutiens. Le membre qui
     * déclenche l'appel n'a donc pas besoin d'avoir vérifié qu'elle manquait —
     * quiconque visite la page en premier après l'ouverture d'une sortie peut
     * s'en charger, le site n'ayant pas de service qui tourne seul.
     */
    async annoncerActivite(activiteId, publication, membreId) {
      try {
        await setDoc(doc(base, 'publications', `annonce-${activiteId}`), {
          auteurId: membreId,
          auteur: publication.auteur,
          initiales: publication.initiales,
          couleur: publication.couleur,
          cercle: publication.cercle,
          contenu: publication.contenu,
          badge: publication.badge,
          jaimesCompte: 0,
          date: serverTimestamp(),
        });
      } catch (erreur) {
        // L'échec attendu, et de loin le plus fréquent : l'annonce existe déjà.
      }
    },

    /** Les réponses d'une publication, en temps réel. */
    ecouterReponses(publicationId, rappel) {
      const requete = query(
        collection(base, 'reponses'),
        where('publicationId', '==', publicationId),
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
          console.warn('Lecture des réponses impossible.', erreur);
          rappel([]);
        }
      );
    },

    async repondre(publicationId, reponse) {
      await addDoc(collection(base, 'reponses'), {
        publicationId,
        auteurId: reponse.auteurId,
        auteur: reponse.auteur,
        initiales: reponse.initiales,
        couleur: reponse.couleur,
        texte: reponse.texte,
        date: serverTimestamp(),
      });
    },

    /** Les publications que le membre connecté a soutenues, en temps réel. */
    ecouterMesJaimes(membreId, rappel) {
      const requete = query(collection(base, 'jaimes'), where('membreId', '==', membreId));

      return onSnapshot(
        requete,
        (instantane) => {
          rappel(instantane.docs.map((document) => document.data().publicationId));
        },
        (erreur) => {
          console.warn('Lecture des soutiens impossible.', erreur);
          rappel([]);
        }
      );
    },

    /**
     * Bascule le soutien à une publication dans une transaction : la relecture
     * du compteur et son écriture sont atomiques, comme pour une réservation.
     */
    async basculerJaime(publicationId, membreId) {
      const compteur = doc(base, 'publications', publicationId);
      const soutien = doc(base, 'jaimes', `${publicationId}_${membreId}`);

      return runTransaction(base, async (transaction) => {
        // Les lectures d'abord : une transaction refuse de lire après avoir écrit.
        const etatSoutien = await transaction.get(soutien);
        const etatCompteur = await transaction.get(compteur);
        const compte = etatCompteur.exists() ? etatCompteur.data().jaimesCompte || 0 : 0;

        if (etatSoutien.exists()) {
          transaction.delete(soutien);
          transaction.update(compteur, { jaimesCompte: Math.max(0, compte - 1) });
          return false;
        }

        transaction.set(soutien, { publicationId, membreId });
        transaction.update(compteur, { jaimesCompte: compte + 1 });
        return true;
      });
    },

    /**
     * Efface tout ce qui rattache un membre au site : ses messages, ses
     * inscriptions, et les places qu'il occupait — rendues au compteur dans une
     * transaction, sans quoi une sortie resterait affichée complète alors que
     * la place est libre. Ses publications, ses réponses et ses soutiens
     * suivent le même sort — un soutien rend lui aussi sa part au compteur
     * qu'il avait fait monter.
     *
     * Appelé avant la suppression du compte : après, le membre n'a plus le
     * droit d'écrire ici et ses données resteraient orphelines.
     */
    async effacerDonneesMembre(membreId) {
      // Les messages : lisibles par leur auteur quelle que soit la conversation,
      // c'est ce que la règle `auteurId == moi()` autorise.
      const messages = await getDocs(
        query(collection(base, 'messages'), where('auteurId', '==', membreId))
      );
      await Promise.all(messages.docs.map((document) => deleteDoc(document.ref)));

      // Les inscriptions, une par une : chacune rend ses places au compteur.
      const reservations = await getDocs(
        query(collection(base, 'reservations'), where('membreId', '==', membreId))
      );

      for (const inscription of reservations.docs) {
        const donnees = inscription.data();
        const compteur = doc(base, 'activites', donnees.activiteId);

        await runTransaction(base, async (transaction) => {
          const etat = await transaction.get(compteur);
          const prises = etat.exists() ? etat.data().placesPrises || 0 : 0;
          transaction.set(
            compteur,
            { placesPrises: Math.max(0, prises - (donnees.places || 0)) },
            { merge: true }
          );
          transaction.delete(inscription.ref);
        });
      }

      // Les publications et les réponses du membre.
      const publications = await getDocs(
        query(collection(base, 'publications'), where('auteurId', '==', membreId))
      );
      await Promise.all(publications.docs.map((document) => deleteDoc(document.ref)));

      const reponses = await getDocs(
        query(collection(base, 'reponses'), where('auteurId', '==', membreId))
      );
      await Promise.all(reponses.docs.map((document) => deleteDoc(document.ref)));

      // Les soutiens, un par un : chacun rend sa part au compteur de la
      // publication concernée — sauf si celle-ci a elle-même disparu juste
      // au-dessus, auquel cas il n'y a plus de compteur à toucher.
      const soutiens = await getDocs(
        query(collection(base, 'jaimes'), where('membreId', '==', membreId))
      );

      for (const soutien of soutiens.docs) {
        const donnees = soutien.data();
        const compteur = doc(base, 'publications', donnees.publicationId);

        await runTransaction(base, async (transaction) => {
          const etat = await transaction.get(compteur);
          if (etat.exists()) {
            const compte = etat.data().jaimesCompte || 0;
            transaction.update(compteur, { jaimesCompte: Math.max(0, compte - 1) });
          }
          transaction.delete(soutien.ref);
        });
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
