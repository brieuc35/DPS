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
};

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
   Thème clair / sombre
   ========================================================================== */

const CLE_THEME = 'dps.theme';

function appliquerTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  const bouton = $('.bascule-theme');
  if (bouton) {
    bouton.setAttribute(
      'aria-label',
      theme === 'dark' ? 'Passer au thème clair' : 'Passer au thème sombre'
    );
  }
}

function initTheme() {
  // Même résolution que le script inline du <head>, qui pose déjà le thème
  // avant le premier rendu : ici on ne fait que la confirmer et brancher
  // le bouton. Le monde de la marque est nocturne, donc « sombre » est le
  // choix par défaut ; seul un système réglé en clair l'emporte.
  const stocke = Stockage.lire(CLE_THEME, null);
  const clairDemande = window.matchMedia('(prefers-color-scheme: light)').matches;
  appliquerTheme(stocke || (clairDemande ? 'light' : 'dark'));

  const bouton = $('.bascule-theme');
  if (!bouton) return;

  bouton.addEventListener('click', () => {
    const actuel = document.documentElement.getAttribute('data-theme');
    const suivant = actuel === 'dark' ? 'light' : 'dark';
    appliquerTheme(suivant);
    Stockage.ecrire(CLE_THEME, suivant);
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

function notifier(message, emoji = '✅') {
  let toast = $('.toast');

  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'toast';
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    document.body.appendChild(toast);
  }

  toast.innerHTML = `<span aria-hidden="true">${emoji}</span><span>${echapper(message)}</span>`;
  // Force un reflow pour que la transition rejoue si le toast est déjà affiché.
  void toast.offsetWidth;
  toast.classList.add('est-visible');

  clearTimeout(minuteurToast);
  minuteurToast = setTimeout(() => toast.classList.remove('est-visible'), 3800);
}

/* ==========================================================================
   Démarrage
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initNavigation();
  initApparitions();

  const anneeCourante = $('#annee');
  if (anneeCourante) anneeCourante.textContent = new Date().getFullYear();
});
