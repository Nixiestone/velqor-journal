// VELQOR JOURNAL — Main Application
import { initFirebase, watchAuthState, initAuthUI, logout, finalizeRedirectLogin, getAuthErrorMessage } from './auth.js';
import { DB } from './db.js';

// === SHARED STATE ===
export const AppState = {
  user:          null,
  profile:       null,
  accounts:      [],
  activeAccount: null,
  trades:        [],
  playbook:      [],
  reviews:       [],
  milestones:    [],
  _unsubs:       []
};

// === MODULE CACHE — pre-loaded at boot so modals open instantly ===
const _mods = {};
async function _preload() {
  try {
    _mods.journal    = await import('./pages/journal.js');
    _mods.misc       = await import('./pages/misc-pages.js');
    _mods.dashboard  = await import('./pages/dashboard.js');
    _mods.calendar   = await import('./pages/calendar.js');
    _mods.analytics  = await import('./pages/analytics.js');
    _mods.time       = await import('./pages/time-analysis.js');
    _mods.risk       = await import('./pages/risk-analysis.js');
    _mods.discipline = await import('./pages/discipline.js');
    _mods.help       = await import('./pages/help.js');
    _mods.pdf        = await import('./pdf-export.js');
  } catch(e) { console.warn('Preload partial:', e.message); }
}

// === ACCOUNT HELPERS ===
export function getActiveAccount() {
  const id = AppState.profile?.activeAccountId;
  return AppState.accounts.find(a => a.id === id) || AppState.accounts[0] || null;
}
export function getActiveTrades() {
  const acct = getActiveAccount();
  if (!acct || !AppState.accounts.length) return AppState.trades;
  return AppState.trades.filter(t => !t.accountId || t.accountId === acct.id);
}
export function getCurrency() {
  return getActiveAccount()?.currency || AppState.profile?.currency || 'USD';
}

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

// === MODAL HELPERS ===
export function closeModal() {
  const bg = document.getElementById('modal-bg');
  if (bg) bg.style.display = 'none';
}

export async function openModal(type, id = null) {
  const bg  = document.getElementById('modal-bg');
  const box = document.getElementById('modal-box');
  if (!bg || !box) return;

  let html = '', initFn = null;

  // Use cached module — instant after preload
  if (type === 'add-trade' || type === 'trade-detail') {
    const mod = _mods.journal || await import('./pages/journal.js');
    if (type === 'add-trade') { html = mod.renderAddTradeModal(id); initFn = () => mod.initAddTradeModal(id); }
    else                      { html = mod.renderTradeDetail(id);   initFn = () => mod.initTradeDetail(id); }

  } else if (type === 'add-account' || type === 'edit-account') {
    html   = _renderAccountModal(id);
    initFn = () => _initAccountModal(id);

  } else {
    const mod = _mods.misc || await import('./pages/misc-pages.js');
    switch (type) {
      case 'add-setup':     html = mod.renderAddSetupModal(id);     initFn = () => mod.initAddSetupModal(id);    break;
      case 'add-review':    html = mod.renderAddReviewModal();       initFn = () => mod.initAddReviewModal();     break;
      case 'add-milestone': html = mod.renderAddMilestoneModal(id); initFn = () => mod.initAddMilestoneModal(id); break;
      case 'edit-rules':    html = mod.renderEditRulesModal();       initFn = () => mod.initEditRulesModal();     break;
      default: return;
    }
  }

  box.innerHTML = html;
  bg.style.display = 'flex';
  if (initFn) initFn();
}

// === ACCOUNT MODAL (inline — no extra module needed) ===
const ACCT_COLORS = ['#00d4ff','#8b5cf6','#00e676','#ffd060','#ff3d57','#ff9f43','#54a0ff'];
const SYM_MAP = { USD:'$',EUR:'€',GBP:'£',NGN:'₦',JPY:'¥',AUD:'A$',CAD:'C$',CHF:'Fr',USDT:'T$',ZAR:'R',BTC:'₿' };

function _renderAccountModal(accountId) {
  const acct = accountId ? AppState.accounts.find(a => a.id === accountId) : null;
  const CURRENCIES = ['USD','EUR','GBP','NGN','JPY','AUD','CAD','CHF','USDT','ZAR','BTC'];
  return `
<div class="modal-header">
  <span class="modal-title">${acct ? 'Edit Account' : 'Add Account'}</span>
  <button class="modal-close" id="m-close"><svg viewBox="0 0 14 14" fill="none"><line x1="1" y1="1" x2="13" y2="13" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="13" y1="1" x2="1" y2="13" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></button>
</div>
<div class="modal-body">
  <div class="form-group mb-16">
    <label class="form-label">Account Name</label>
    <input class="form-input" id="acct-name" placeholder="e.g. ICMarkets USD, Binance, FTMO" value="${acct?.name||''}">
  </div>
  <div class="form-group mb-16">
    <label class="form-label">Broker / Exchange</label>
    <input class="form-input" id="acct-broker" placeholder="e.g. ICMarkets, Binance, Pepperstone" value="${acct?.broker||''}">
  </div>
  <div class="form-grid-2">
    <div class="form-group">
      <label class="form-label">Currency</label>
      <select class="form-input form-select" id="acct-currency">
        ${CURRENCIES.map(c => `<option value="${c}" ${acct?.currency===c?'selected':''}>${c}</option>`).join('')}
      </select>
    </div>
    <div class="form-group">
      <label class="form-label">${acct ? 'Starting Balance' : 'Starting Balance'}</label>
      <input class="form-input" type="number" id="acct-balance" placeholder="10000" min="0" value="${acct?.startingBalance||''}">
    </div>
  </div>
  <div class="form-group mt-16">
    <label class="form-label">Account Colour</label>
    <div style="display:flex;gap:10px;margin-top:6px;" id="color-picker">
      ${ACCT_COLORS.map((c,i)=>`<button type="button" class="acct-color-btn" data-cidx="${i}" style="width:26px;height:26px;border-radius:50%;background:${c};border:2px solid ${(acct?.colorIndex??0)===i?'white':'transparent'};transition:border 0.15s;cursor:pointer;flex-shrink:0;"></button>`).join('')}
    </div>
    <input type="hidden" id="acct-color-idx" value="${acct?.colorIndex??0}">
  </div>
</div>
<div class="modal-footer">
  <button class="btn-secondary" id="m-cancel">Cancel</button>
  ${acct && AppState.accounts.length > 1 ? `<button class="btn-danger" id="m-delete">Delete Account</button>` : ''}
  <button class="btn-primary" id="m-save">${acct ? 'Save Changes' : 'Add Account'}</button>
</div>`;
}

function _initAccountModal(accountId) {
  const acct = accountId ? AppState.accounts.find(a => a.id === accountId) : null;

  document.getElementById('m-close')?.addEventListener('click', closeModal);
  document.getElementById('m-cancel')?.addEventListener('click', closeModal);

  document.querySelectorAll('.acct-color-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.acct-color-btn').forEach(b => b.style.border = '2px solid transparent');
      btn.style.border = '2px solid white';
      document.getElementById('acct-color-idx').value = btn.dataset.cidx;
    });
  });

  document.getElementById('m-delete')?.addEventListener('click', async () => {
    if (!confirm(`Delete "${acct.name}"? Trades remain but will be unlinked.`)) return;
    await DB.deleteAccount(AppState.user.uid, acct.id);
    if (AppState.profile?.activeAccountId === acct.id) {
      const other = AppState.accounts.find(a => a.id !== acct.id);
      if (other) await DB.updateProfile(AppState.user.uid, { activeAccountId: other.id });
    }
    toast('Account deleted.', 'info'); closeModal();
  });

  document.getElementById('m-save')?.addEventListener('click', async () => {
    const name = document.getElementById('acct-name')?.value.trim();
    if (!name) { toast('Account name is required.', 'error'); return; }
    const bal = parseFloat(document.getElementById('acct-balance')?.value) || 0;
    const data = {
      name,
      broker:          document.getElementById('acct-broker')?.value.trim() || '',
      currency:        document.getElementById('acct-currency')?.value || 'USD',
      startingBalance: bal,
      balance:         acct ? acct.balance : bal,
      colorIndex:      parseInt(document.getElementById('acct-color-idx')?.value) || 0
    };
    const btn = document.getElementById('m-save');
    btn.disabled = true; btn.textContent = 'Saving...';
    try {
      if (acct) {
        await DB.updateAccount(AppState.user.uid, acct.id, data);
        toast('Account updated.', 'success');
        closeModal();
        return;
      }

      const ref = await DB.addAccount(AppState.user.uid, data);
      toast('Account added.', 'success');
      closeModal();

      // Do not block modal close on this secondary sync write.
      if (!AppState.profile?.activeAccountId && AppState.accounts.length === 0) {
        DB.updateProfile(AppState.user.uid, { activeAccountId: ref.id }).catch(e => {
          toast(`Account added, but active account sync failed: ${e.message}`, 'error');
        });
      }
    } catch(e) {
      toast(e.message, 'error');
      btn.disabled=false;
      btn.textContent = acct?'Save Changes':'Add Account';
    }
  });
}

// === ACCOUNT SWITCHER UI ===
function _updateSwitcherUI() {
  const acct  = getActiveAccount();
  if (!acct) return;
  const color = ACCT_COLORS[acct.colorIndex ?? 0];
  const sym   = SYM_MAP[acct.currency] || '$';
  const dot   = document.getElementById('account-color-dot');
  const name  = document.getElementById('active-account-name');
  const bal   = document.getElementById('active-account-bal');
  if (dot)  dot.style.background = color;
  if (name) name.textContent = acct.name || 'Account';
  if (bal)  bal.textContent  = sym + (acct.balance||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});

  const listEl = document.getElementById('account-list-items');
  if (!listEl) return;
  const activeId = AppState.profile?.activeAccountId || AppState.accounts[0]?.id;
  listEl.innerHTML = AppState.accounts.map(a => {
    const isAct = a.id === activeId;
    const aColor = ACCT_COLORS[a.colorIndex ?? 0];
    const aSym   = SYM_MAP[a.currency] || '$';
    return `
      <div class="account-item ${isAct?'active':''}" data-acct-id="${a.id}" role="button" tabindex="0">
        <div class="account-item-dot" style="background:${aColor};"></div>
        <div class="account-item-info">
          <span class="account-item-name">${a.name}</span>
          <span class="account-item-bal">${aSym}${(a.balance||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})} · ${a.currency}</span>
        </div>
        ${isAct?'<svg viewBox="0 0 12 12" fill="none" width="12"><polyline points="1,6 4.5,9.5 11,2.5" stroke="var(--cyan)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>':''}
        <button class="account-item-edit" data-edit-acct="${a.id}" title="Edit account"><svg viewBox="0 0 14 14" fill="none" width="12"><path d="M9.5 2.5l2 2-7 7-2.5.5.5-2.5 7-7z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
      </div>`;
  }).join('');

  listEl.querySelectorAll('[data-acct-id]').forEach(el => {
    el.addEventListener('click', async e => {
      if (e.target.closest('[data-edit-acct]')) return;
      await DB.updateProfile(AppState.user.uid, { activeAccountId: el.dataset.acctId });
      _closeDropdown();
    });
  });
  listEl.querySelectorAll('[data-edit-acct]').forEach(btn => {
    btn.addEventListener('click', e => { e.stopPropagation(); _closeDropdown(); openModal('edit-account', btn.dataset.editAcct); });
  });
}

function _closeDropdown() {
  const dd = document.getElementById('account-dropdown');
  if (dd) dd.style.display = 'none';
}

let _switcherInited = false;
function _initAccountSwitcher() {
  if (_switcherInited) return; _switcherInited = true;
  const trigger  = document.getElementById('account-switcher-trigger');
  const dropdown = document.getElementById('account-dropdown');
  const addBtn   = document.getElementById('account-add-btn');

  trigger?.addEventListener('click', e => {
    e.stopPropagation();
    const isOpen = dropdown?.style.display !== 'none';
    if (dropdown) dropdown.style.display = isOpen ? 'none' : 'block';
    if (!isOpen) _updateSwitcherUI();
  });
  addBtn?.addEventListener('click', e => { e.stopPropagation(); _closeDropdown(); openModal('add-account'); });
  document.addEventListener('click', () => _closeDropdown());
}

// === ROUTER ===
const ROUTE_MAP = {
  dashboard:       { mod: 'dashboard',  render: 'renderDashboard',    init: 'initDashboard'    },
  journal:         { mod: 'journal',    render: 'renderJournal',       init: 'initJournal'      },
  calendar:        { mod: 'calendar',   render: 'renderCalendar',      init: 'initCalendar'     },
  playbook:        { mod: 'misc',       render: 'renderPlaybook',      init: 'initPlaybook'     },
  analytics:       { mod: 'analytics', render: 'renderAnalytics',     init: 'initAnalytics'    },
  'time-analysis': { mod: 'time',       render: 'renderTimeAnalysis',  init: 'initTimeAnalysis' },
  'risk-analysis': { mod: 'risk',       render: 'renderRiskAnalysis',  init: 'initRiskAnalysis' },
  discipline:      { mod: 'discipline', render: 'renderDiscipline',    init: 'initDiscipline'   },
  review:          { mod: 'misc',       render: 'renderReview',        init: 'initReview'       },
  milestones:      { mod: 'misc',       render: 'renderMilestones',    init: 'initMilestones'   },
  settings:        { mod: 'misc',       render: 'renderSettings',      init: 'initSettings'     },
  help:            { mod: 'help',       render: 'renderHelp',          init: 'initHelp'         },
};

const FALLBACK_PATHS = {
  dashboard:  './pages/dashboard.js',
  journal:    './pages/journal.js',
  calendar:   './pages/calendar.js',
  misc:       './pages/misc-pages.js',
  analytics:  './pages/analytics.js',
  time:       './pages/time-analysis.js',
  risk:       './pages/risk-analysis.js',
  discipline: './pages/discipline.js',
  help:       './pages/help.js',
};

let _currentPage = null, _navigating = false;

async function navigate(page) {
  if (!ROUTE_MAP[page]) page = 'dashboard';
  if (_navigating && _currentPage === page) return;
  _navigating = true; _currentPage = page;
  document.querySelectorAll('[data-page]').forEach(el => el.classList.toggle('active', el.dataset.page === page));
  const root = document.getElementById('page-root');
  if (!root) { _navigating = false; return; }
  const { mod: modKey, render: renderFn, init: initFn } = ROUTE_MAP[page];
  try {
    const mod = _mods[modKey] || await import(FALLBACK_PATHS[modKey]);
    if (!_mods[modKey]) _mods[modKey] = mod;
    root.innerHTML = mod[renderFn]();
    if (mod[initFn]) await mod[initFn]();
  } catch(err) {
    console.error('[Router]', page, err);
    root.innerHTML = `<div class="page-wrapper"><div class="empty-state" style="padding:60px;"><div class="empty-title">Page Error</div><div class="empty-desc">${err.message}</div></div></div>`;
  }
  document.getElementById('sidebar')?.classList.remove('open');
  document.getElementById('sidebar-overlay')?.classList.remove('visible');
  document.body.style.overflow = '';
  document.getElementById('main-content')?.scrollTo(0, 0);
  _navigating = false;
}

function _getPage() { return window.location.hash.replace('#/','').split('?')[0].trim() || 'dashboard'; }

// === SIDEBAR INIT ===
let _sidebarInited = false;
function _initSidebar() {
  if (_sidebarInited) return; _sidebarInited = true;
  const burger  = document.getElementById('mobile-burger');
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  burger?.addEventListener('click', () => { const o=sidebar?.classList.toggle('open'); overlay?.classList.toggle('visible',!!o); document.body.style.overflow=o?'hidden':''; });
  overlay?.addEventListener('click', () => { sidebar?.classList.remove('open'); overlay?.classList.remove('visible'); document.body.style.overflow=''; });
  document.getElementById('mobile-add')?.addEventListener('click', () => openModal('add-trade'));
  document.querySelectorAll('[data-page]').forEach(el => {
    el.addEventListener('click', e => { e.preventDefault(); const p=el.dataset.page; if(p) window.location.hash='#/'+p; });
  });
  document.getElementById('logout-btn')?.addEventListener('click', async () => { if(confirm('Sign out of VELQOR JOURNAL?')) await logout(); });
  document.getElementById('export-pdf-btn')?.addEventListener('click', async () => { const m=_mods.pdf||await import('./pdf-export.js'); m.generatePDF(); });
  _initAccountSwitcher();
}

// === UPDATE SIDEBAR ===
function _updateSidebarUser() {
  const p = AppState.profile;
  if (!p) return;
  const av = document.getElementById('sidebar-avatar');
  const un = document.getElementById('sidebar-username');
  const em = document.getElementById('sidebar-email');
  if (av) av.textContent = (p.displayName||'T')[0].toUpperCase();
  if (un) un.textContent = p.displayName || 'Trader';
  if (em) em.textContent = AppState.user?.email || '';
  _updateSwitcherUI();
}

// === DATA SUBSCRIPTIONS ===
function _subscribeData(uid) {
  AppState._unsubs.forEach(fn=>fn()); AppState._unsubs=[];
  let profileReady=false, tradesReady=false;

  AppState._unsubs.push(DB.watchProfile(uid, p => {
    AppState.profile = p; _updateSidebarUser();
    if (!profileReady) { profileReady=true; if(tradesReady) _doInitialNav(); }
    else if (_currentPage) navigate(_currentPage);
  }));

  AppState._unsubs.push(DB.watchAccounts(uid, accounts => {
    AppState.accounts = accounts;
    AppState.activeAccount = getActiveAccount();
    _updateSwitcherUI();
    if (_currentPage) navigate(_currentPage);
  }));

  AppState._unsubs.push(DB.watchTrades(uid, trades => {
    AppState.trades = trades;
    if (!tradesReady) { tradesReady=true; if(profileReady) _doInitialNav(); }
    else if (_currentPage) navigate(_currentPage);
  }));

  AppState._unsubs.push(DB.watchPlaybook(uid, pb => { AppState.playbook=pb; }));
  AppState._unsubs.push(DB.watchReviews(uid, rv => { AppState.reviews=rv; }));
  AppState._unsubs.push(DB.watchMilestones(uid, ms => { AppState.milestones=ms; }));
}

let _didInitNav = false;
function _doInitialNav() {
  if (_didInitNav) return; _didInitNav=true;
  navigate(_getPage());
}

// === AUTH SCREENS ===
function _showApp() {
  const auth = document.getElementById('auth-screen');
  const app  = document.getElementById('app');
  const load = document.getElementById('app-loading');
  if (auth) { auth.style.display = 'none'; }
  if (app)  { app.style.display  = 'flex'; }
  if (load) { load.style.display = 'none'; }
}

function _showAuth() {
  const auth=document.getElementById('auth-screen');
  const app =document.getElementById('app');
  const load=document.getElementById('app-loading');
  if(app)  app.style.display  = 'none';
  if(auth) { auth.style.display = 'flex'; auth.classList.remove('hidden'); }
  if(load) { load.style.display = 'none'; load.classList.add('hidden'); }
  AppState._unsubs.forEach(fn=>fn()); AppState._unsubs=[];
  Object.assign(AppState,{user:null,profile:null,accounts:[],activeAccount:null,trades:[],playbook:[],reviews:[],milestones:[]});
  _currentPage=null; _didInitNav=false; _sidebarInited=false; _switcherInited=false;
}

function _showAuthError(msg) {
  const errorDiv = document.getElementById('auth-error');
  if (!errorDiv) return;
  errorDiv.textContent = msg;
  errorDiv.style.display = '';
}

// === BOOT ===
async function boot() {
  // One-time backdrop click handler
  document.getElementById('modal-bg')?.addEventListener('click', e => {
    if (e.target === document.getElementById('modal-bg')) closeModal();
  });

  initFirebase();
  try {
    await finalizeRedirectLogin();
  } catch (err) {
    console.warn('[VELQOR] Redirect sign-in failed:', err);
    _showAuthError(getAuthErrorMessage(err));
  }

  function onLogin(user) {
    if (AppState.user?.uid === user.uid) return;
    AppState.user = user;
    _subscribeData(user.uid);
    _initSidebar();
    _showApp();
    // Preload modules after a short delay to not compete with initial render
    setTimeout(_preload, 1500);
  }

  initAuthUI(onLogin);
  watchAuthState(user => onLogin(user), () => _showAuth());
  window.addEventListener('hashchange', () => { if(AppState.user) navigate(_getPage()); });

  // Hard fallback: if Firebase hasn't responded in 5 seconds, show auth screen
  setTimeout(() => {
    const load = document.getElementById('app-loading');
    if (load && load.style.display !== 'none') {
      console.warn('[VELQOR] Firebase timeout — forcing auth screen');
      _showAuth();
    }
  }, 5000);
}
boot();
