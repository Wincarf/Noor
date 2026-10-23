/**
 * app.js — Main entry: router, init, connection status
 * This file defines the missing `nav()` function and bootstraps the app.
 */
import { state }      from './state.js';
import { dbGetAll, dbGet } from './db.js';

// ── Views ──────────────────────────────────────────────────────────────
import * as HomeView     from './views/home.js';
import * as AddView      from './views/add.js';
import * as ReviewView   from './views/review.js';
import * as HistoryView  from './views/history.js';
import * as SettingsView from './views/settings.js';
import * as EvidenceView from './views/evidence.js';

const VIEWS = {
  home:     HomeView,
  add:      AddView,
  review:   ReviewView,
  history:  HistoryView,
  settings: SettingsView,
  evidence: EvidenceView,
};

// ── Router ─────────────────────────────────────────────────────────────

/**
 * nav() — resolves current hash, renders correct view, updates bottom nav.
 * This was the missing critical function in the previous codebase.
 */
function nav() {
  const hash  = location.hash.slice(1) || 'home';
  const route = (hash in VIEWS) ? hash : 'home';
  const mod   = VIEWS[route];

  const viewEl = document.getElementById('view');
  viewEl.innerHTML = mod.html(state);
  mod.bind(state);

  // Highlight active bottom-nav item
  document.querySelectorAll('[data-nav]').forEach(el => {
    el.classList.toggle('active', el.dataset.nav === route);
  });

  // Scroll view to top on route change
  viewEl.scrollIntoView({ behavior: 'instant', block: 'start' });
}

// ── Connection status ──────────────────────────────────────────────────
function updateConnection() {
  const dot   = document.getElementById('conn-dot');
  const label = document.getElementById('conn-label');
  if (navigator.onLine) {
    dot?.classList.add('online');
    if (label) label.textContent = 'Conectado';
  } else {
    dot?.classList.remove('online');
    if (label) label.textContent = 'Offline pronto';
  }
}

// ── Init ───────────────────────────────────────────────────────────────
async function init() {
  // Load persisted data
  const [plans, reports, queue, savedSettings] = await Promise.all([
    dbGetAll('plans'),
    dbGetAll('reports'),
    dbGetAll('queue'),
    dbGet('settings', 'app'),
  ]);

  state.plans   = plans.sort((a, b)   => b.createdAt - a.createdAt);
  state.reports = reports.sort((a, b) => b.createdAt - a.createdAt);
  state.queue   = queue.sort((a, b)   => b.createdAt - a.createdAt);
  if (savedSettings) Object.assign(state.settings, savedSettings);

  // Register Service Worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }

  // Connection events
  window.addEventListener('online',  updateConnection);
  window.addEventListener('offline', updateConnection);
  updateConnection();

  // Hash-based routing
  window.addEventListener('hashchange', nav);

  // Internal re-render event (used by views to refresh without hash change)
  window.addEventListener('noor:rerender', nav);

  // Initial render
  nav();
}

init();
