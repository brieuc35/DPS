/**
 * DPS Collective — Comportements communs à toutes les pages
 * ---------------------------------------------------------------------------
 * Thème clair/sombre, navigation mobile, en-tête collant, apparition au
 * défilement, notifications éphémères et petits utilitaires partagés.
 */

/* ==========================================================================
   Utilitaires
   ========================================================================== */

const $ = (selecteur, racine = document) => racine.querySelector(selecteur);
const $$ = (selecteur, racine = document) => [...racine.querySelectorAll(selecteur)];

/**
 * Stockage local tolérant aux pannes : en navigation privée ou avec les
 * cookies bloqués, localStorage peut lever une exception. On dégrade
 * silencieusement plutôt que de casser la page.
 */
const Stockage = {
  lire(cle, valeurParDefaut) {
    try {
      const brut = localStorage.getItem(cle);
      return brut === null ? valeurParDefaut : JSON.parse(brut);
    } catch (erreur) {
      return valeurParDefaut;
    }
  },
  ecrire(cle, valeur) {
    try {
      localStorage.setItem(cle, JSON.stringify(valeur));
      return true;
    } catch (erreur) {
      return false;
    }
  },
  /**
   * Retire la clé, plutôt que d'y écrire `null`. La nuance compte : `lire` ne
   * rend sa valeur par défaut que si la clé est absente. Un `null` stocké est
   * une valeur comme une autre, et un appelant qui attendait un tableau
   * s'écroulerait dessus.
   */
  effacer(cle) {
    try {
      localStorage.removeItem(cle);
      return true;
    } catch (erreur) {
      return false;
    }
  },
};

/**
 * Pictogramme tracé, à partir du contenu SVG porté par une thématique ou un
 * cercle. On préfère un trait à un émoji : l'émoji change de dessin selon le
 * système, jure avec les lettres géométriques du sigle, et fait basculer la
 * page du côté de la conversation alors qu'elle est une proposition.
 */
function picto(contenu, taille = 20) {
  if (!contenu) return '';
  return `<svg class="picto" width="${taille}" height="${taille}" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"
    stroke-linejoin="round" aria-hidden="true" focusable="false">${contenu}</svg>`;
}

/** Échappe le texte saisi par l'utilisateur avant toute insertion en HTML. */
function echapper(texte) {
  return String(texte)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** « 15 août, 08:30 » à partir d'une date ISO. */
function formaterDate(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

/** « 15 août » — version compacte, pour les cartes d'activité. */
function formaterDateCourte(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' }).format(date);
}

/** « il y a 2 h » — utilisé dans le fil social. */
function formaterDepuis(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';

  const secondes = Math.round((Date.now() - date.getTime()) / 1000);
  const seuils = [
    [60, 'second'],
    [3600, 'minute'],
    [86400, 'hour'],
    [604800, 'day'],
    [2629800, 'week'],
    [31557600, 'month'],
  ];

  const formateur = new Intl.RelativeTimeFormat('fr-FR', { numeric: 'auto' });
  let precedent = 1;

  for (const [limite, unite] of seuils) {
    if (Math.abs(secondes) < limite) {
      return formateur.format(-Math.round(secondes / precedent), unite);
    }
    precedent = limite;
  }
  return formateur.format(-Math.round(secondes / 31557600), 'year');
}

/* ==========================================================================
   Navigation programmatique
   --------------------------------------------------------------------------
   Le JavaScript a besoin d'envoyer l'utilisateur sur une autre page (fin de
   réservation, connexion réussie). Passer par ces deux fonctions plutôt que
   d'écrire l'URL en dur permet à la version fichier unique — où les pages sont
   des vues derrière une ancre — de les remplacer par sa propre logique.
   ========================================================================== */

function lienInterne(page, ancre) {
  return ancre ? `${page}.html#${ancre}` : `${page}.html`;
}

function allerVers(page, ancre) {
  window.location.href = lienInterne(page, ancre);
}

/* ==========================================================================
   Thème clair / sombre
   ========================================================================== */

function appliquerTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
}

/**
 * Le site n'expose plus de bascule : le thème suit le réglage du système, et
 * rien n'est mémorisé. Une préférence conservée sans moyen d'en changer
 * enfermerait le visiteur dans un choix fait une fois.
 */
function initTheme() {
  const systeme = window.matchMedia('(prefers-color-scheme: dark)');

  // Même résolution que le script inline du <head>, qui pose déjà le thème
  // avant le premier rendu : on la confirme, puis on suit le système s'il
  // change en cours de route.
  appliquerTheme(systeme.matches ? 'dark' : 'light');
  systeme.addEventListener('change', (evenement) => {
    appliquerTheme(evenement.matches ? 'dark' : 'light');
  });
}

/* ==========================================================================
   Navigation
   ========================================================================== */

function initNavigation() {
  const burger = $('.burger');
  const nav = $('.nav');

  if (burger && nav) {
    burger.addEventListener('click', () => {
      const ouverte = nav.classList.toggle('est-ouverte');
      burger.setAttribute('aria-expanded', String(ouverte));
    });

    // Referme le menu après un clic sur un lien (navigation interne).
    nav.addEventListener('click', (evenement) => {
      if (evenement.target.closest('.nav__lien')) {
        nav.classList.remove('est-ouverte');
        burger.setAttribute('aria-expanded', 'false');
      }
    });

    document.addEventListener('keydown', (evenement) => {
      if (evenement.key === 'Escape' && nav.classList.contains('est-ouverte')) {
        nav.classList.remove('est-ouverte');
        burger.setAttribute('aria-expanded', 'false');
        burger.focus();
      }
    });
  }

  // Ombre portée sur l'en-tête dès que la page défile.
  const entete = $('.entete');
  if (entete) {
    const majEtat = () => entete.classList.toggle('est-collee', window.scrollY > 8);
    majEtat();
    window.addEventListener('scroll', majEtat, { passive: true });
  }

  // Marque le lien correspondant à la page courante.
  const fichier = window.location.pathname.split('/').pop() || 'index.html';
  $$('.nav__lien').forEach((lien) => {
    const cible = lien.getAttribute('href');
    if (cible === fichier || (fichier === 'index.html' && cible === './index.html')) {
      lien.setAttribute('aria-current', 'page');
    }
  });
}

/* ==========================================================================
   Apparition progressive au défilement
   ========================================================================== */

function initApparitions() {
  const restants = new Set($$('.apparait:not(.est-visible)'));
  if (!restants.size) return;

  if (!('IntersectionObserver' in window)) {
    restants.forEach((element) => element.classList.add('est-visible'));
    return;
  }

  const oublier = (element) => {
    restants.delete(element);
    observateur.unobserve(element);
    if (!restants.size) window.removeEventListener('scroll', balayer);
  };

  const reveler = (element) => {
    element.classList.add('est-visible');
    oublier(element);
  };

  const observateur = new IntersectionObserver(
    (entrees) => {
      entrees.forEach((entree) => {
        if (entree.isIntersecting) reveler(entree.target);
      });
    },
    { threshold: 0.12, rootMargin: '0px 0px -40px' }
  );

  restants.forEach((element) => observateur.observe(element));

  /**
   * Filet de sécurité : un défilement très rapide peut faire passer un élément
   * d'un bord à l'autre de la fenêtre sans qu'il soit jamais échantillonné en
   * vue par l'observateur — il resterait alors invisible pour toujours.
   * On balaie donc les éléments restants une fois par trame de défilement.
   */
  let planifie = false;
  function balayer() {
    if (planifie) return;
    planifie = true;

    requestAnimationFrame(() => {
      planifie = false;
      [...restants].forEach((element) => {
        // Déjà révélé par un autre appel à initApparitions.
        if (element.classList.contains('est-visible')) oublier(element);
        else if (element.getBoundingClientRect().top < window.innerHeight) reveler(element);
      });
    });
  }

  window.addEventListener('scroll', balayer, { passive: true });
}

/**
 * Applique un léger décalage d'apparition aux enfants d'un conteneur,
 * pour un effet de cascade sur les grilles générées dynamiquement.
 */
function echelonnerApparitions(conteneur, pas = 60) {
  $$('.apparait', conteneur).forEach((element, index) => {
    element.style.transitionDelay = `${Math.min(index * pas, 400)}ms`;
  });
}

/* ==========================================================================
   Notification éphémère
   ========================================================================== */

let minuteurToast;

function notifier(message) {
  let toast = $('.toast');

  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'toast';
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    document.body.appendChild(toast);
  }

  toast.textContent = message;
  // Force un reflow pour que la transition rejoue si le toast est déjà affiché.
  void toast.offsetWidth;
  toast.classList.add('est-visible');

  clearTimeout(minuteurToast);
  minuteurToast = setTimeout(() => toast.classList.remove('est-visible'), 3800);
}

/* ==========================================================================
   Flèches du triangle « Comment ça marche »
   ========================================================================== */

/**
 * Centre les deux flèches exactement entre les bulles qu'elles relient.
 *
 * Un pourcentage fixe en CSS ne le permettrait pas : la bulle est plafonnée à
 * 300 px (`.bulle { max-width: 300px }`) mais sa colonne, elle, continue de
 * grandir avec la largeur de l'écran — l'écart entre deux bulles n'est donc
 * pas une fraction constante de la largeur totale. On mesure à la place les
 * positions réelles, et on pose chaque flèche au milieu du segment qui joint
 * les centres des deux bulles qu'elle relie — exactement sur la droite que la
 * flèche est censée dessiner.
 */
function initFlechesTriangle() {
  const conteneur = $('.bulles--triangle');
  if (!conteneur) return;

  const bulles = $$('.bulle', conteneur);
  const fleches = [
    { element: $('.bulles__fleche--1', conteneur), depart: bulles[0], arrivee: bulles[1] },
    { element: $('.bulles__fleche--2', conteneur), depart: bulles[1], arrivee: bulles[2] },
  ];
  if (fleches.some(({ element, depart, arrivee }) => !element || !depart || !arrivee)) return;

  function centrer() {
    // En dessous de 900 px, les flèches sont masquées (bulles empilées) :
    // le calcul serait fait sur des positions qui ne veulent rien dire.
    if (!window.matchMedia('(min-width: 900px)').matches) return;

    const cadre = conteneur.getBoundingClientRect();

    fleches.forEach(({ element, depart, arrivee }) => {
      const a = depart.getBoundingClientRect();
      const b = arrivee.getBoundingClientRect();
      const milieuX = (a.left + a.width / 2 + b.left + b.width / 2) / 2;
      const milieuY = (a.top + a.height / 2 + b.top + b.height / 2) / 2;
      const largeur = element.getBoundingClientRect().width;
      const hauteur = element.getBoundingClientRect().height;

      element.style.left = `${milieuX - cadre.left - largeur / 2}px`;
      element.style.top = `${milieuY - cadre.top - hauteur / 2}px`;
    });
  }

  centrer();

  // Les colonnes sont fluides : la position idéale change avec la largeur.
  let planifie;
  window.addEventListener('resize', () => {
    clearTimeout(planifie);
    planifie = setTimeout(centrer, 120);
  });

  // Les polices arrivent après le premier rendu et peuvent décaler les
  // bulles de quelques pixels — d'où un second passage une fois chargées.
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(centrer);
  }

  // Chaque bulle porte `.apparait` : tant qu'elle n'a pas défilé jusque dans
  // la fenêtre, elle est décalée de 18 px par l'apparition progressive
  // (`.js .apparait`, plus bas dans styles.css). Un premier calcul fait avant
  // ce défilement mesurerait donc la mauvaise position et la flèche resterait
  // figée là — visible au chargement direct sur cette section, ou en
  // remontant la page après l'avoir déjà vue. On réagit à la fin de cette
  // transition précise plutôt que d'ajouter une temporisation arbitraire.
  conteneur.addEventListener('transitionend', (evenement) => {
    if (evenement.propertyName === 'transform') centrer();
  });
}

/* ==========================================================================
   Démarrage
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initNavigation();
  initApparitions();
  initFlechesTriangle();

  const anneeCourante = $('#annee');
  if (anneeCourante) anneeCourante.textContent = new Date().getFullYear();
});
