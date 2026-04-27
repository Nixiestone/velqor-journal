// VELQOR JOURNAL — Trade Journal
import { AppState, openModal, toast, getActiveAccount, getActiveTrades, getCurrency } from '../app.js';
import { DB } from '../db.js';
import { fmt, fmtR, fmtDate, calcRMultiple, getSessionFromTime, SYMBOLS, SESSIONS, EMOTIONS } from '../utils.js';

let _filterResult = 'all', _filterDir = 'all', _search = '', _viewMode = 'table';

// ── SYMBOL CATEGORIES ────────────────────────────────────────────
const SYMBOL_GROUPS = {
  'Forex Majors':  ['EUR/USD','GBP/USD','USD/JPY','USD/CHF','AUD/USD','NZD/USD','USD/CAD'],
  'Forex Minors':  ['EUR/GBP','EUR/JPY','EUR/AUD','GBP/JPY','GBP/AUD','AUD/JPY','EUR/CAD'],
  'Forex Exotics': ['USD/ZAR','USD/NGN','USD/TRY','USD/MXN','EUR/ZAR','GBP/ZAR'],
  'Metals':        ['XAU/USD','XAG/USD','XPT/USD','XAUEUR'],
  'Crypto':        ['BTC/USD','ETH/USD','BTC/USDT','ETH/USDT','SOL/USD','BNB/USDT','XRP/USDT'],
  'Indices':       ['NAS100','US30','SPX500','GER40','UK100','JPN225','AUS200'],
  'Commodities':   ['USOIL','UKOIL','NATGAS','WHEAT','CORN'],
};
const ALL_SYMBOLS = Object.values(SYMBOL_GROUPS).flat();

// ── SEARCHABLE SYMBOL DROPDOWN ───────────────────────────────────
function buildSymbolDropdown(currentVal = '') {
  return `
    <div class="sym-dropdown-wrap" id="sym-wrap">
      <div class="sym-input-row form-input" id="sym-display" tabindex="0" role="combobox" aria-expanded="false">
        <span id="sym-display-text">${currentVal || 'Select symbol...'}</span>
        <svg viewBox="0 0 12 12" fill="none" width="11"><polyline points="2,4 6,8 10,4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </div>
      <input type="hidden" id="tf-symbol" value="${currentVal}">
      <div class="sym-dropdown" id="sym-dropdown" style="display:none;">
        <div class="sym-search-wrap">
          <svg viewBox="0 0 16 16" fill="none" width="13"><circle cx="6.5" cy="6.5" r="5" stroke="currentColor" stroke-width="1.5"/><line x1="10.5" y1="10.5" x2="14" y2="14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
          <input class="sym-search-input" id="sym-search" placeholder="Search symbols..." autocomplete="off" spellcheck="false">
        </div>
        <div class="sym-list" id="sym-list">
          ${renderSymbolGroups(SYMBOL_GROUPS)}
        </div>
      </div>
    </div>`;
}

function renderSymbolGroups(groups, filter = '') {
  const q = filter.trim().toLowerCase();
  let html = '';
  for (const [group, symbols] of Object.entries(groups)) {
    const matched = q ? symbols.filter(s => s.toLowerCase().includes(q)) : symbols;
    if (!matched.length) continue;
    html += `<div class="sym-group-label">${group}</div>`;
    html += matched.map(s => `<div class="sym-option" data-sym="${s}">${s}</div>`).join('');
  }
  if (!html && q) {
    // Show as custom
    html = `<div class="sym-option sym-custom" data-sym="${filter.toUpperCase().trim()}">${filter.toUpperCase().trim()} <span style="font-size:10px;color:var(--text-3);">(custom)</span></div>`;
  }
  return html;
}

function initSymbolDropdown(onSelect) {
  const wrap     = document.getElementById('sym-wrap');
  const display  = document.getElementById('sym-display');
  const dropdown = document.getElementById('sym-dropdown');
  const search   = document.getElementById('sym-search');
  const list     = document.getElementById('sym-list');
  const hidden   = document.getElementById('tf-symbol');
  if (!wrap || !display || !dropdown) return;

  function open() {
    dropdown.style.display = 'block'; display.setAttribute('aria-expanded','true');
    search.focus(); list.innerHTML = renderSymbolGroups(SYMBOL_GROUPS);
    attachOptions();
  }
  function close() { dropdown.style.display = 'none'; display.setAttribute('aria-expanded','false'); }
  function select(sym) {
    hidden.value = sym;
    document.getElementById('sym-display-text').textContent = sym;
    close();
    if (onSelect) onSelect(sym);
  }
  function attachOptions() {
    list.querySelectorAll('.sym-option').forEach(el => {
      el.addEventListener('mousedown', e => { e.preventDefault(); select(el.dataset.sym); });
    });
  }

  display.addEventListener('click', () => dropdown.style.display === 'none' ? open() : close());
  display.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
  search.addEventListener('input', () => {
    list.innerHTML = renderSymbolGroups(SYMBOL_GROUPS, search.value);
    attachOptions();
  });
  document.addEventListener('mousedown', e => { if (!wrap.contains(e.target)) close(); });
}

// ── RENDER PAGE ──────────────────────────────────────────────────
export function renderJournal() {
  return `
<div class="page-wrapper page-enter">
  <div class="page-header page-header-row">
    <div>
      <div class="page-title">Trade Journal</div>
      <div class="page-subtitle" id="journal-subtitle">Loading...</div>
    </div>
    <button class="btn-primary" id="journal-add-btn">
      <svg viewBox="0 0 16 16" width="14" height="14" fill="none"><line x1="8" y1="2" x2="8" y2="14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="2" y1="8" x2="14" y2="8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
      Log Trade
    </button>
  </div>
  <div class="filter-bar">
    <div class="search-input-wrap">
      <svg viewBox="0 0 16 16" fill="none"><circle cx="6.5" cy="6.5" r="5" stroke="currentColor" stroke-width="1.5"/><line x1="10.5" y1="10.5" x2="14" y2="14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
      <input class="form-input search-input" id="journal-search" placeholder="Search symbol, setup, notes..." value="${_search}">
    </div>
    <div class="d-flex gap-8">
      ${['all','win','loss','breakeven'].map(r => `<button class="filter-chip ${_filterResult===r?'active':''}" data-result="${r}">${r==='all'?'All':r[0].toUpperCase()+r.slice(1)}</button>`).join('')}
    </div>
    <div class="d-flex gap-8">
      ${['all','long','short'].map(d => `<button class="filter-chip ${_filterDir===d?'active':''}" data-dir="${d}">${d[0].toUpperCase()+d.slice(1)}</button>`).join('')}
    </div>
    <div class="seg-control" style="margin-left:auto;">
      <button class="seg-btn ${_viewMode==='table'?'active':''}" id="view-table">Table</button>
      <button class="seg-btn ${_viewMode==='cards'?'active':''}" id="view-cards">Cards</button>
    </div>
  </div>
  <div class="card"><div id="journal-body"></div></div>
</div>`;
}

export function initJournal() {
  document.getElementById('journal-add-btn')?.addEventListener('click', () => openModal('add-trade'));
  document.getElementById('journal-search')?.addEventListener('input', e => { _search = e.target.value; _renderBody(); });
  document.querySelectorAll('[data-result]').forEach(b => b.addEventListener('click', () => { _filterResult=b.dataset.result; document.querySelectorAll('[data-result]').forEach(x=>x.classList.toggle('active',x.dataset.result===_filterResult)); _renderBody(); }));
  document.querySelectorAll('[data-dir]').forEach(b => b.addEventListener('click', () => { _filterDir=b.dataset.dir; document.querySelectorAll('[data-dir]').forEach(x=>x.classList.toggle('active',x.dataset.dir===_filterDir)); _renderBody(); }));
  document.getElementById('view-table')?.addEventListener('click', () => { _viewMode='table'; document.getElementById('view-table').classList.add('active'); document.getElementById('view-cards').classList.remove('active'); _renderBody(); });
  document.getElementById('view-cards')?.addEventListener('click', () => { _viewMode='cards'; document.getElementById('view-cards').classList.add('active'); document.getElementById('view-table').classList.remove('active'); _renderBody(); });
  _renderBody();
}

function _getFiltered() {
  let t = [...getActiveTrades()];
  if (_filterResult !== 'all') t = t.filter(x => x.result === _filterResult);
  if (_filterDir    !== 'all') t = t.filter(x => x.direction === _filterDir);
  if (_search) { const q=_search.toLowerCase(); t=t.filter(x=>(x.symbol||'').toLowerCase().includes(q)||(x.notes||'').toLowerCase().includes(q)||(x.setupName||'').toLowerCase().includes(q)); }
  return t;
}

function _renderBody() {
  const body = document.getElementById('journal-body');
  const sub  = document.getElementById('journal-subtitle');
  if (!body) return;
  const trades   = _getFiltered();
  const currency = getCurrency();
  if (sub) sub.textContent = `${trades.length} trade${trades.length===1?'':'s'}`;
  if (!trades.length) {
    body.innerHTML = `<div class="empty-state"><svg class="empty-icon" viewBox="0 0 40 40" fill="none" width="48" height="48"><rect x="5" y="5" width="30" height="30" rx="4" stroke="currentColor" stroke-width="1.5"/><line x1="12" y1="14" x2="28" y2="14" stroke="currentColor" stroke-width="1.5"/><line x1="12" y1="20" x2="24" y2="20" stroke="currentColor" stroke-width="1.5"/></svg><div class="empty-title">No trades found</div><div class="empty-desc">Log your first trade or adjust filters</div></div>`;
    return;
  }
  body.innerHTML = _viewMode === 'cards' ? `<div style="padding:16px;display:flex;flex-direction:column;gap:8px;">${trades.map(t=>_tradeCard(t,currency)).join('')}</div>` : _tradeTable(trades, currency);
  body.querySelectorAll('[data-trade-id]').forEach(el => el.addEventListener('click', () => openModal('trade-detail', el.dataset.tradeId)));
  body.querySelectorAll('[data-delete-trade]').forEach(el => el.addEventListener('click', async e => {
    e.stopPropagation();
    if (!confirm('Delete this trade?')) return;
    const t = AppState.trades.find(x=>x.id===el.dataset.deleteTrade);
    if (t) {
      await DB.deleteTrade(AppState.user.uid, t.id);
      // Adjust account balance
      const acct = AppState.accounts.find(a=>a.id===t.accountId) || getActiveAccount();
      if (acct) await DB.updateAccount(AppState.user.uid, acct.id, { balance: (acct.balance||0) - (t.pnl||0) });
      toast('Trade deleted.','info');
    }
  }));
}

function _tradeTable(trades, currency) {
  return `<div class="table-wrap"><table>
    <thead><tr><th>Date</th><th>Symbol</th><th>Dir</th><th>Setup</th><th>Entry</th><th>Exit</th><th>P&amp;L</th><th>R</th><th>Session</th><th>Result</th><th>Score</th><th></th></tr></thead>
    <tbody>${trades.map(t=>`
      <tr data-trade-id="${t.id}" style="cursor:pointer;">
        <td style="font-size:12px;color:var(--text-3);white-space:nowrap;">${fmtDate(t.date)}</td>
        <td class="td-symbol">${t.symbol||'—'}</td>
        <td><span class="badge ${t.direction==='long'?'badge-long':'badge-short'}">${t.direction||'—'}</span></td>
        <td style="font-size:12px;color:var(--text-2);max-width:100px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${t.setupName||'—'}</td>
        <td class="td-mono">${t.entryPrice??'—'}</td><td class="td-mono">${t.exitPrice??'—'}</td>
        <td class="td-mono ${(t.pnl||0)>=0?'text-green':'text-red'}">${fmt(t.pnl||0,currency)}</td>
        <td class="td-mono ${(t.rMultiple||0)>=0?'text-green':'text-red'}">${fmtR(t.rMultiple)}</td>
        <td><span class="badge badge-gray" style="font-size:10px;">${t.session||'—'}</span></td>
        <td><span class="badge ${t.result==='win'?'badge-win':t.result==='loss'?'badge-loss':'badge-be'}">${t.result||'—'}</span></td>
        <td class="td-mono text-cyan">${t.executionScore!=null?t.executionScore+'/10':'—'}</td>
        <td class="td-action"><button class="btn-danger" data-delete-trade="${t.id}" style="font-size:11px;padding:4px 8px;" title="Delete" onclick="event.stopPropagation()">
          <svg viewBox="0 0 14 14" fill="none" width="12"><polyline points="1,3 3,3 13,3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M11.5,3l-1,9h-7l-1-9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
        </button></td>
      </tr>`).join('')}
    </tbody></table></div>`;
}

function _tradeCard(t, currency) {
  return `<div class="trade-card" data-trade-id="${t.id}">
    <div class="trade-card-header">
      <div><span class="trade-card-symbol">${t.symbol||'—'}</span><span style="margin-left:8px;"><span class="badge ${t.direction==='long'?'badge-long':'badge-short'}">${t.direction||'—'}</span></span></div>
      <span class="badge ${t.result==='win'?'badge-win':t.result==='loss'?'badge-loss':'badge-be'}">${t.result||'—'}</span>
    </div>
    <div class="trade-card-row">
      <span class="trade-card-pnl ${(t.pnl||0)>=0?'pos':'neg'}">${fmt(t.pnl||0,currency)}</span>
      <span class="td-mono ${(t.rMultiple||0)>=0?'text-green':'text-red'}" style="font-size:14px;">${fmtR(t.rMultiple)}</span>
    </div>
    <div class="trade-card-meta" style="margin-top:8px;">${fmtDate(t.date)} · ${t.session||'—'} · ${t.setupName||'No setup'}${t.executionScore!=null?` · <span style="color:var(--cyan);">${t.executionScore}/10</span>`:''}</div>
  </div>`;
}

// ── ADD/EDIT TRADE MODAL ─────────────────────────────────────────
export function renderAddTradeModal(tradeId = null) {
  const t = tradeId ? AppState.trades.find(x=>x.id===tradeId) : {};
  const defaultAccountId = t.accountId || getActiveAccount()?.id || AppState.accounts[0]?.id || '';
  const pb = AppState.playbook.filter(s => !s.accountId || s.accountId === defaultAccountId);
  const accountOptions = AppState.accounts.map(a => `<option value="${a.id}" ${a.id===defaultAccountId?'selected':''}>${a.name} · ${a.currency}</option>`).join('');
  const dateVal = t.date ? (() => { const d=t.date.toDate?.()??new Date(t.date); return d.toISOString().split('T')[0]; })() : new Date().toISOString().split('T')[0];
  const timeVal = t.time || new Date().toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit',hour12:false});
  const existing = !!tradeId;

  return `
<div class="modal-header">
  <span class="modal-title">${existing?'Edit Trade':'Log New Trade'}</span>
  <button class="modal-close" id="modal-close-btn"><svg viewBox="0 0 14 14" fill="none"><line x1="1" y1="1" x2="13" y2="13" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="13" y1="1" x2="1" y2="13" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></button>
</div>
<div class="modal-body">
  <form id="trade-form" novalidate>

    <div class="form-section">
      <div class="form-section-title">Trade Details</div>
      <div class="form-grid-2">
        <div class="form-group">
          <label class="form-label">Account</label>
          <select class="form-input form-select" id="tf-account">
            ${accountOptions || '<option value="">No account found</option>'}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Symbol</label>
          ${buildSymbolDropdown(t.symbol||'')}
        </div>
        <div class="form-group">
          <label class="form-label">Direction</label>
          <div class="direction-toggle" id="dir-toggle">
            <button type="button" class="direction-btn ${t.direction==='long'?'selected-long':''}" data-dir="long">Long</button>
            <button type="button" class="direction-btn ${t.direction==='short'?'selected-short':''}" data-dir="short">Short</button>
          </div>
          <input type="hidden" id="tf-direction" value="${t.direction||''}">
        </div>
        <div class="form-group">
          <label class="form-label">Date</label>
          <input class="form-input" type="date" id="tf-date" value="${dateVal}">
        </div>
        <div class="form-group">
          <label class="form-label">Time (24h)</label>
          <input class="form-input" type="time" id="tf-time" value="${timeVal}">
        </div>
        <div class="form-group">
          <label class="form-label">Setup / Playbook</label>
          <select class="form-input form-select" id="tf-setup">
            <option value="">No setup</option>
            ${pb.map(s=>`<option value="${s.id}" ${t.setupId===s.id?'selected':''}>${s.name}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Session</label>
          <select class="form-input form-select" id="tf-session">
            ${SESSIONS.map(s=>`<option value="${s}" ${t.session===s?'selected':''}>${s}</option>`).join('')}
          </select>
        </div>
      </div>
    </div>

    <div class="form-section">
      <div class="form-section-title">Prices &amp; Risk</div>
      <div class="form-grid-3">
        <div class="form-group"><label class="form-label">Entry Price</label><input class="form-input" type="number" id="tf-entry" step="any" placeholder="1.08500" value="${t.entryPrice??''}"></div>
        <div class="form-group"><label class="form-label">Stop Loss</label><input class="form-input" type="number" id="tf-stop" step="any" placeholder="1.08200" value="${t.stopLoss??''}"></div>
        <div class="form-group"><label class="form-label">Take Profit</label><input class="form-input" type="number" id="tf-tp" step="any" placeholder="1.09100" value="${t.takeProfit??''}"></div>
        <div class="form-group"><label class="form-label">Exit Price</label><input class="form-input" type="number" id="tf-exit" step="any" placeholder="1.09000" value="${t.exitPrice??''}"></div>
        <div class="form-group"><label class="form-label">Position Size (lots)</label><input class="form-input" type="number" id="tf-size" step="any" placeholder="0.10" value="${t.positionSize??''}"></div>
        <div class="form-group"><label class="form-label">Risk %</label><input class="form-input" type="number" id="tf-risk-pct" step="0.1" placeholder="1.0" value="${t.riskPercent??''}"></div>
      </div>
      <div class="form-grid-2 mt-16">
        <div class="form-group"><label class="form-label">P&amp;L</label><input class="form-input" type="number" id="tf-pnl" step="any" placeholder="250.00" value="${t.pnl??''}"></div>
        <div class="form-group"><label class="form-label">R-Multiple <span id="r-calc-display" style="color:var(--text-3);font-weight:400;">(auto)</span></label><input class="form-input" type="number" id="tf-r" step="0.01" placeholder="Auto-calculated" value="${t.rMultiple??''}"></div>
      </div>
    </div>

    <div class="form-section">
      <div class="form-section-title">Outcome</div>
      <div class="form-grid-2">
        <div class="form-group">
          <label class="form-label">Result</label>
          <select class="form-input form-select" id="tf-result">
            <option value="">Select result</option>
            <option value="win" ${t.result==='win'?'selected':''}>Win</option>
            <option value="loss" ${t.result==='loss'?'selected':''}>Loss</option>
            <option value="breakeven" ${t.result==='breakeven'?'selected':''}>Breakeven</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Execution Score: <span id="exec-val">${t.executionScore??5}</span>/10</label>
          <div class="score-input-wrap"><input type="range" id="tf-exec" min="1" max="10" step="1" value="${t.executionScore??5}"></div>
        </div>
      </div>
    </div>

    <div class="form-section">
      <div class="form-section-title">Psychology</div>
      <div class="form-group mb-16">
        <label class="form-label">Emotional State</label>
        <div class="emotion-grid" id="emotion-grid">
          ${EMOTIONS.map(e=>`<div class="emotion-chip ${t.emotion===e?'selected':''}" data-emotion="${e}">${e}</div>`).join('')}
        </div>
        <input type="hidden" id="tf-emotion" value="${t.emotion||''}">
      </div>
      <div class="checkbox-group">
        <input type="checkbox" id="tf-rules" ${t.followedRules?'checked':''}>
        <label class="checkbox-label" for="tf-rules">Followed all trading rules for this trade</label>
      </div>
    </div>

    <div class="form-section">
      <div class="form-section-title">Notes</div>
      <div class="form-group"><label class="form-label">Trade Notes</label><textarea class="form-input" id="tf-notes" rows="3" placeholder="Setup rationale, entry reasoning, market context...">${t.notes||''}</textarea></div>
      <div class="form-group mt-16"><label class="form-label">Mistakes / Improvements</label><textarea class="form-input" id="tf-mistakes" rows="2" placeholder="What went wrong, what to do differently...">${(t.mistakes||[]).join('\n')}</textarea></div>
      <div class="form-group mt-16"><label class="form-label">Screenshot URL (optional)</label><input class="form-input" type="url" id="tf-screenshot" placeholder="https://..." value="${t.screenshotUrl||''}"></div>
    </div>
  </form>
</div>
<div class="modal-footer">
  <button class="btn-secondary" id="modal-cancel-btn">Cancel</button>
  <button class="btn-primary" id="trade-submit-btn">
    <span id="trade-submit-label">${existing?'Save Changes':'Log Trade'}</span>
    <span id="trade-submit-spinner" style="display:none;" class="btn-spinner"></span>
  </button>
</div>`;
}

export function initAddTradeModal(tradeId = null) {
  const existing  = tradeId ? AppState.trades.find(t=>t.id===tradeId) : null;
  const close     = () => { document.getElementById('modal-bg').style.display='none'; };
  document.getElementById('modal-close-btn')?.addEventListener('click', close);
  document.getElementById('modal-cancel-btn')?.addEventListener('click', close);
  document.getElementById('modal-bg')?.addEventListener('click', e => { if(e.target===document.getElementById('modal-bg')) close(); });

  // Symbol dropdown
  initSymbolDropdown(null);

  // Direction
  document.querySelectorAll('#dir-toggle .direction-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#dir-toggle .direction-btn').forEach(b=>b.classList.remove('selected-long','selected-short'));
      btn.classList.add(btn.dataset.dir==='long'?'selected-long':'selected-short');
      document.getElementById('tf-direction').value = btn.dataset.dir;
      _autoR();
    });
  });

  // Emotion
  document.querySelectorAll('#emotion-grid .emotion-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('#emotion-grid .emotion-chip').forEach(c=>c.classList.remove('selected'));
      chip.classList.add('selected');
      document.getElementById('tf-emotion').value = chip.dataset.emotion;
    });
  });

  // Exec slider
  document.getElementById('tf-exec')?.addEventListener('input', function(){ document.getElementById('exec-val').textContent=this.value; });

  // Auto R
  ['tf-entry','tf-stop','tf-exit'].forEach(id => document.getElementById(id)?.addEventListener('input',_autoR));

  function _autoR() {
    const entry=parseFloat(document.getElementById('tf-entry')?.value);
    const stop =parseFloat(document.getElementById('tf-stop')?.value);
    const exit =parseFloat(document.getElementById('tf-exit')?.value);
    const dir  =document.getElementById('tf-direction')?.value;
    if(entry&&stop&&exit&&dir){
      const r=calcRMultiple(entry,exit,stop,dir);
      document.getElementById('tf-r').value=r;
      const d=document.getElementById('r-calc-display');
      if(d) d.textContent=`(${r>=0?'+':''}${r}R)`;
    }
  }

  // Submit
  document.getElementById('trade-submit-btn')?.addEventListener('click', async () => {
    const symbol    = document.getElementById('tf-symbol')?.value.trim().toUpperCase();
    const direction = document.getElementById('tf-direction')?.value;
    const dateStr   = document.getElementById('tf-date')?.value;
    const result    = document.getElementById('tf-result')?.value;
    const pnl       = parseFloat(document.getElementById('tf-pnl')?.value);

    if (!symbol)    { toast('Symbol is required.','error'); return; }
    if (!direction) { toast('Select Long or Short.','error'); return; }
    if (!dateStr)   { toast('Date is required.','error'); return; }
    if (!result)    { toast('Select a result.','error'); return; }
    if (isNaN(pnl)) { toast('P&L is required.','error'); return; }

    const timeStr   = document.getElementById('tf-time')?.value || '00:00';
    const setupSel  = document.getElementById('tf-setup');
    const setupId   = setupSel?.value || null;
    const setupName = setupId ? AppState.playbook.find(s=>s.id===setupId)?.name||'' : '';
    const rVal      = parseFloat(document.getElementById('tf-r')?.value);
    const selectedAccountId = document.getElementById('tf-account')?.value || '';
    const acct      = AppState.accounts.find(a => a.id === selectedAccountId) || getActiveAccount();

    const trade = {
      accountId:       acct?.id || null,
      symbol, direction,
      date:            DB.toTimestamp(dateStr+'T'+timeStr),
      time:            timeStr,
      session:         document.getElementById('tf-session')?.value || getSessionFromTime(timeStr),
      setupId, setupName,
      entryPrice:      parseFloat(document.getElementById('tf-entry')?.value)||null,
      stopLoss:        parseFloat(document.getElementById('tf-stop')?.value)||null,
      takeProfit:      parseFloat(document.getElementById('tf-tp')?.value)||null,
      exitPrice:       parseFloat(document.getElementById('tf-exit')?.value)||null,
      positionSize:    parseFloat(document.getElementById('tf-size')?.value)||null,
      riskPercent:     parseFloat(document.getElementById('tf-risk-pct')?.value)||null,
      pnl, rMultiple:  isNaN(rVal)?null:rVal,
      pnlPercent:      acct?.balance ? parseFloat((pnl/acct.balance*100).toFixed(3)):null,
      result,
      executionScore:  parseInt(document.getElementById('tf-exec')?.value)||5,
      emotion:         document.getElementById('tf-emotion')?.value||null,
      followedRules:   document.getElementById('tf-rules')?.checked||false,
      notes:           document.getElementById('tf-notes')?.value.trim()||'',
      mistakes:        (document.getElementById('tf-mistakes')?.value||'').split('\n').filter(Boolean),
      screenshotUrl:   document.getElementById('tf-screenshot')?.value.trim()||null,
      accountBalanceBefore: acct?.balance||0,
      currency:        acct?.currency || 'USD'
    };

    const lbl=document.getElementById('trade-submit-label'); const spn=document.getElementById('trade-submit-spinner');
    const btn=document.getElementById('trade-submit-btn');
    if(lbl) lbl.style.display='none'; if(spn) spn.style.display=''; btn.disabled=true;
    try {
      if (existing) {
        await DB.updateTrade(AppState.user.uid, existing.id, trade);
        toast('Trade updated.','success');
        close();
        if (acct) {
          const oldAcct = AppState.accounts.find(a => a.id === existing.accountId);
          const movedAccount = oldAcct && oldAcct.id !== acct.id;

          if (movedAccount) {
            DB.updateAccount(AppState.user.uid, oldAcct.id, { balance: (oldAcct.balance||0) - (existing.pnl||0) }).catch(err => {
              toast(`Trade saved, but old account sync failed: ${err.message}`, 'error');
            });
            DB.updateAccount(AppState.user.uid, acct.id, { balance: (acct.balance||0) + pnl }).catch(err => {
              toast(`Trade saved, but new account sync failed: ${err.message}`, 'error');
            });
          } else {
            const diff = pnl - (existing.pnl||0);
            DB.updateAccount(AppState.user.uid, acct.id, { balance: (acct.balance||0) + diff }).catch(err => {
              toast(`Trade saved, but balance sync failed: ${err.message}`, 'error');
            });
          }
        }
      } else {
        await DB.addTrade(AppState.user.uid, trade);
        toast('Trade logged.','success');
        close();
        if (acct) {
          DB.updateAccount(AppState.user.uid, acct.id, { balance: (acct.balance||0) + pnl }).catch(err => {
            toast(`Trade saved, but balance sync failed: ${err.message}`, 'error');
          });
        }
      }
    } catch(err) {
      toast(err.message,'error');
      if(lbl) lbl.style.display=''; if(spn) spn.style.display='none'; btn.disabled=false;
    }
  });
}

// ── TRADE DETAIL MODAL ───────────────────────────────────────────
export function renderTradeDetail(tradeId) {
  const t = AppState.trades.find(x=>x.id===tradeId);
  if (!t) return '<div class="modal-body"><p>Trade not found.</p></div>';
  const currency = t.currency || getCurrency();
  const d = t.date?.toDate?.()??new Date(t.date);
  return `
<div class="modal-header">
  <div><span class="modal-title">${t.symbol||'Trade'}</span><span style="margin-left:10px;"><span class="badge ${t.direction==='long'?'badge-long':'badge-short'}">${t.direction||''}</span></span></div>
  <button class="modal-close" id="modal-close-btn"><svg viewBox="0 0 14 14" fill="none"><line x1="1" y1="1" x2="13" y2="13" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="13" y1="1" x2="1" y2="13" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></button>
</div>
<div class="modal-body">
  <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:24px;">
    <span class="badge ${t.result==='win'?'badge-win':t.result==='loss'?'badge-loss':'badge-be'}" style="font-size:13px;padding:6px 14px;">${(t.result||'—').toUpperCase()}</span>
    <span style="font-family:'DM Mono',monospace;font-size:22px;font-weight:500;color:${(t.pnl||0)>=0?'var(--green)':'var(--red)'};">${fmt(t.pnl||0,currency)}</span>
    <span style="font-family:'DM Mono',monospace;font-size:18px;color:${(t.rMultiple||0)>=0?'var(--green)':'var(--red)'};">${fmtR(t.rMultiple)}</span>
  </div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px;">
    ${[['Date',d.toLocaleString('en-US',{dateStyle:'medium',timeStyle:'short'})],['Session',t.session||'—'],['Setup',t.setupName||'—'],['Entry',t.entryPrice??'—'],['Exit',t.exitPrice??'—'],['Stop Loss',t.stopLoss??'—'],['Take Profit',t.takeProfit??'—'],['Position',t.positionSize!=null?t.positionSize+' lots':'—'],['Risk %',t.riskPercent!=null?t.riskPercent+'%':'—'],['Exec Score',t.executionScore!=null?t.executionScore+'/10':'—'],['Emotion',t.emotion||'—'],['Rules',t.followedRules?'Followed':'Broken']].map(([l,v])=>`
      <div style="padding:10px 14px;background:rgba(0,0,0,0.2);border-radius:8px;">
        <div style="font-size:10px;text-transform:uppercase;letter-spacing:0.08em;color:var(--text-3);margin-bottom:3px;">${l}</div>
        <div style="font-size:13px;font-family:'DM Mono',monospace;color:var(--text);">${v}</div>
      </div>`).join('')}
  </div>
  ${t.notes?`<div style="margin-bottom:16px;"><div style="font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:var(--text-3);margin-bottom:6px;">Notes</div><div style="font-size:13px;color:var(--text-2);line-height:1.6;">${t.notes}</div></div>`:''}
  ${t.mistakes?.length?`<div style="margin-bottom:16px;"><div style="font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:var(--red);margin-bottom:6px;">Mistakes</div><ul style="padding-left:18px;font-size:13px;color:var(--text-2);line-height:1.8;">${t.mistakes.map(m=>`<li>${m}</li>`).join('')}</ul></div>`:''}
  ${t.screenshotUrl?`<a href="${t.screenshotUrl}" target="_blank" rel="noopener" style="color:var(--cyan);font-size:13px;">View Screenshot</a>`:''}
</div>
<div class="modal-footer">
  <button class="btn-secondary" id="modal-close-btn-2">Close</button>
  <button class="btn-secondary" id="trade-edit-btn">Edit Trade</button>
</div>`;
}

export function initTradeDetail(tradeId) {
  const close = () => { document.getElementById('modal-bg').style.display='none'; };
  document.getElementById('modal-close-btn')?.addEventListener('click', close);
  document.getElementById('modal-close-btn-2')?.addEventListener('click', close);
  document.getElementById('modal-bg')?.addEventListener('click', e=>{ if(e.target===document.getElementById('modal-bg'))close(); });
  document.getElementById('trade-edit-btn')?.addEventListener('click', () => openModal('add-trade', tradeId));
}
