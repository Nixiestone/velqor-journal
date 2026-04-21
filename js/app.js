// VELQOR JOURNAL — Main Application Entry Point
import { initFirebase, watchAuthState, initAuthUI, logout } from './auth.js';
import { DB } from './db.js';

// === SHARED STATE ===
export const AppState = {
  user:       null,
  profile:    null,
  trades:     [],
  playbook:   [],
  reviews:    [],
  milestones: [],
  _unsubs:    []
};

// === TOAST ===
export function toast(msg, type = 'info') {
  const stack = document.getElementById('toast-stack');
  if (!stack) return;
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<div class="toast-dot"></div><span>${msg}</span>`;
  stack.appendChild(el);
  setTimeout(() => {
    el.style.opacity = '0';
    el.style.transform = 'translateX(20px)';
    el.style.transition = 'all 0.3s ease';
    setTimeout(() => el.remove(), 300);
  }, 3500);
}

// === MODAL ===
export async function openModal(type, id = null) {
  const bg  = document.getElementById('modal-bg');
  const box = document.getElementById('modal-box');
  if (!bg || !box) return;

  let html = '', initFn = null;

  if (type === 'add-trade' || type === 'trade-detail') {
    const mod = await import('./pages/journal.js');
    if (type === 'add-trade') {
      html   = mod.renderAddTradeModal(id);
      initFn = () => mod.initAddTradeModal(id);
    } else {
      html   = mod.renderTradeDetail(id);
      initFn = () => mod.initTradeDetail(id);
    }
  } else {
    const mod = await import('./pages/misc-pages.js');
    switch (type) {
      case 'add-setup':
        html = mod.renderAddSetupModal(id); initFn = () => mod.initAddSetupModal(id); break;
      case 'add-review':
        html = mod.renderAddReviewModal(); initFn = () => mod.initAddReviewModal(); break;
      case 'add-milestone':
        html = mod.renderAddMilestoneModal(id); initFn = () => mod.initAddMilestoneModal(id); break;
      case 'edit-rules':
        html = mod.renderEditRulesModal(); initFn = () => mod.initEditRulesModal(); break;
      default: return;
    }
  }

  box.innerHTML = html;
  bg.style.display = 'flex';
  if (initFn) initFn();
}

// === ROUTER ===
const ROUTES = {
  dashboard:        ['./pages/dashboard.js',    'renderDashboard',    'initDashboard'],
  journal:          ['./pages/journal.js',       'renderJournal',      'initJournal'],
  calendar:         ['./pages/calendar.js',      'renderCalendar',     'initCalendar'],
  playbook:         ['./pages/misc-pages.js',    'renderPlaybook',     'initPlaybook'],
  analytics:        ['./pages/analytics.js',     'renderAnalytics',    'initAnalytics'],
  'time-analysis':  ['./pages/time-analysis.js', 'renderTimeAnalysis', 'initTimeAnalysis'],
  'risk-analysis':  ['./pages/risk-analysis.js', 'renderRiskAnalysis', 'initRiskAnalysis'],
  discipline:       ['./pages/discipline.js',    'renderDiscipline',   'initDiscipline'],
  review:           ['./pages/misc-pages.js',    'renderReview',       'initReview'],
  milestones:       ['./pages/misc-pages.js',    'renderMilestones',   'initMilestones'],
  settings:         ['./pages/misc-pages.js',    'renderSettings',     'initSettings'],
};

let _currentPage = null;
let _navigating  = false;

async function navigate(page) {
  if (!ROUTES[page]) page = 'dashboard';
  if (_navigating && _currentPage === page) return;
  _navigating = true;
  _currentPage = page;

  document.querySelectorAll('[data-page]').forEach(el => {
    el.classList.toggle('active', el.dataset.page === page);
  });

  const root = document.getElementById('page-root');
  if (!root) { _navigating = false; return; }

  const [path, renderFn, initFn] = ROUTES[page];
  try {
    const mod = await import(path);
    root.innerHTML = mod[renderFn]();
    if (mod[initFn]) await mod[initFn]();
  } catch(err) {
    console.error('[Router] Error loading page:', page, err);
    root.innerHTML = `
      <div class="page-wrapper">
        <div class="empty-state" style="padding:60px;">
          <div class="empty-title">Page Error</div>
          <div class="empty-desc">${err.message}</div>
        </div>
      </div>`;
  }

  document.getElementById('sidebar')?.classList.remove('open');
  document.getElementById('sidebar-overlay')?.classList.remove('visible');
  document.body.style.overflow = '';
  document.getElementById('main-content')?.scrollTo(0, 0);
  _navigating = false;
}

function getPage() {
  const h = window.location.hash.replace('#/', '').split('?')[0].trim();
  return h || 'dashboard';
}

// === SIDEBAR ===
let _sidebarInited = false;
function initSidebar() {
  if (_sidebarInited) return;
  _sidebarInited = true;

  const burger    = document.getElementById('mobile-burger');
  const sidebar   = document.getElementById('sidebar');
  const overlay   = document.getElementById('sidebar-overlay');
  const mobileAdd = document.getElementById('mobile-add');

  burger?.addEventListener('click', () => {
    const open = sidebar?.classList.toggle('open');
    overlay?.classList.toggle('visible', !!open);
    document.body.style.overflow = open ? 'hidden' : '';
  });
  overlay?.addEventListener('click', () => {
    sidebar?.classList.remove('open');
    overlay?.classList.remove('visible');
    document.body.style.overflow = '';
  });
  mobileAdd?.addEventListener('click', () => openModal('add-trade'));

  document.querySelectorAll('[data-page]').forEach(el => {
    el.addEventListener('click', e => {
      e.preventDefault();
      const page = el.dataset.page;
      if (page) window.location.hash = '#/' + page;
    });
  });

  document.getElementById('logout-btn')?.addEventListener('click', async () => {
    if (confirm('Sign out of VELQOR JOURNAL?')) await logout();
  });
}

// === UPDATE SIDEBAR USER INFO ===
function updateSidebarUser() {
  const p = AppState.profile;
  if (!p) return;
  const SYM = { USD:'$', EUR:'€', GBP:'£', NGN:'₦', JPY:'¥', AUD:'A$', CAD:'C$' };
  const sym = SYM[p.currency] || '$';
  const bal = (p.accountBalance || 0).toLocaleString('en-US', { minimumFractionDigits:2, maximumFractionDigits:2 });
  const avatar = document.getElementById('sidebar-avatar');
  const uname  = document.getElementById('sidebar-username');
  const ubal   = document.getElementById('sidebar-balance');
  if (avatar) avatar.textContent = (p.displayName || 'T')[0].toUpperCase();
  if (uname)  uname.textContent  = p.displayName || 'Trader';
  if (ubal)   ubal.textContent   = sym + bal;
}

// === REALTIME DATA ===
function subscribeData(uid) {
  AppState._unsubs.forEach(fn => fn());
  AppState._unsubs = [];

  // Track which data types have loaded
  let profileLoaded   = false;
  let tradesLoaded    = false;

  AppState._unsubs.push(DB.watchProfile(uid, profile => {
    AppState.profile = profile;
    updateSidebarUser();
    if (!profileLoaded) { profileLoaded = true; if (tradesLoaded) _initialNav(); }
    else if (_currentPage) navigate(_currentPage);
  }));

  AppState._unsubs.push(DB.watchTrades(uid, trades => {
    AppState.trades = trades;
    if (!tradesLoaded) { tradesLoaded = true; if (profileLoaded) _initialNav(); }
    else if (_currentPage) navigate(_currentPage);
  }));

  AppState._unsubs.push(DB.watchPlaybook(uid, playbook => {
    AppState.playbook = playbook;
  }));

  AppState._unsubs.push(DB.watchReviews(uid, reviews => {
    AppState.reviews = reviews;
  }));

  AppState._unsubs.push(DB.watchMilestones(uid, milestones => {
    AppState.milestones = milestones;
  }));
}

let _didInitialNav = false;
function _initialNav() {
  if (_didInitialNav) return;
  _didInitialNav = true;
  navigate(getPage());
}

// === AUTH SCREENS ===
function showApp() {
  const auth    = document.getElementById('auth-screen');
  const app     = document.getElementById('app');
  const loading = document.getElementById('app-loading');
  auth.classList.add('hidden');
  app.style.display = 'flex';
  loading.classList.add('hidden');
  setTimeout(() => {
    if (auth.classList.contains('hidden')) auth.style.display = 'none';
    loading.style.display = 'none';
  }, 500);
}

function showAuth() {
  const auth    = document.getElementById('auth-screen');
  const app     = document.getElementById('app');
  const loading = document.getElementById('app-loading');
  app.style.display = 'none';
  auth.style.display = 'flex';
  auth.classList.remove('hidden');
  loading.classList.add('hidden');
  setTimeout(() => { loading.style.display = 'none'; }, 500);

  AppState._unsubs.forEach(fn => fn());
  AppState._unsubs = [];
  AppState.user = null;
  AppState.profile = null;
  AppState.trades = [];
  AppState.playbook = [];
  AppState.reviews = [];
  AppState.milestones = [];
  _currentPage = null;
  _didInitialNav = false;
  _sidebarInited = false;
}

// === BOOT ===
async function boot() {
  initFirebase();

  function onLogin(user) {
    if (AppState.user?.uid === user.uid) return;
    AppState.user = user;
    subscribeData(user.uid);
    initSidebar();
    showApp();
  }

  initAuthUI(onLogin);
  watchAuthState(user => onLogin(user), () => showAuth());

  window.addEventListener('hashchange', () => {
    if (AppState.user) navigate(getPage());
  });
}

boot();
