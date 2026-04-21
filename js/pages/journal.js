// VELQOR JOURNAL — Trade Journal Page
import { AppState, openModal, toast } from '../app.js';
import { DB } from '../db.js';
import { fmt, fmtR, fmtDate, fmtTime, calcRMultiple, getSessionFromTime, SYMBOLS, SESSIONS, EMOTIONS, TIMEFRAMES } from '../utils.js';

let _filterResult = 'all';
let _filterDir    = 'all';
let _searchQuery  = '';
let _sortKey      = 'date';
let _sortDir      = -1;
let _viewMode     = 'table'; // 'table' | 'cards'

export function renderJournal() {
  return `
<div class="page-wrapper page-enter">
  <div class="page-header page-header-row">
    <div>
      <div class="page-title">Trade Journal</div>
      <div class="page-subtitle" id="journal-subtitle">Loading trades…</div>
    </div>
    <button class="btn-primary" id="journal-add-btn">
      <svg viewBox="0 0 16 16" width="14" height="14" fill="none"><line x1="8" y1="2" x2="8" y2="14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="2" y1="8" x2="14" y2="8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
      Log Trade
    </button>
  </div>

  <div class="filter-bar">
    <div class="search-input-wrap">
      <svg viewBox="0 0 16 16" fill="none"><circle cx="6.5" cy="6.5" r="5" stroke="currentColor" stroke-width="1.5"/><line x1="10.5" y1="10.5" x2="14" y2="14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
      <input class="form-input search-input" id="journal-search" placeholder="Search symbol, setup, notes…" type="text" value="${_searchQuery}">
    </div>
    <div id="result-filters" class="d-flex gap-8">
      ${['all','win','loss','breakeven'].map(r => `<button class="filter-chip ${_filterResult===r?'active':''}" data-result="${r}">${r === 'all' ? 'All' : r.charAt(0).toUpperCase()+r.slice(1)}</button>`).join('')}
    </div>
    <div id="dir-filters" class="d-flex gap-8">
      ${['all','long','short'].map(d => `<button class="filter-chip ${_filterDir===d?'active':''}" data-dir="${d}">${d.charAt(0).toUpperCase()+d.slice(1)}</button>`).join('')}
    </div>
    <div class="seg-control" style="margin-left:auto;">
      <button class="seg-btn ${_viewMode==='table'?'active':''}" id="view-table">Table</button>
      <button class="seg-btn ${_viewMode==='cards'?'active':''}" id="view-cards">Cards</button>
    </div>
  </div>

  <div class="card">
    <div id="journal-body"></div>
  </div>
</div>`;
}

export function initJournal() {
  const addBtn   = document.getElementById('journal-add-btn');
  const search   = document.getElementById('journal-search');
  const rfBtns   = document.querySelectorAll('[data-result]');
  const dfBtns   = document.querySelectorAll('[data-dir]');
  const viewTbl  = document.getElementById('view-table');
  const viewCard = document.getElementById('view-cards');

  addBtn?.addEventListener('click', () => openModal('add-trade'));
  search?.addEventListener('input', e => { _searchQuery = e.target.value; _renderBody(); });
  rfBtns.forEach(b => b.addEventListener('click', () => { _filterResult = b.dataset.result; rfBtns.forEach(x=>x.classList.toggle('active',x.dataset.result===_filterResult)); _renderBody(); }));
  dfBtns.forEach(b => b.addEventListener('click', () => { _filterDir = b.dataset.dir; dfBtns.forEach(x=>x.classList.toggle('active',x.dataset.dir===_filterDir)); _renderBody(); }));
  viewTbl?.addEventListener('click',  () => { _viewMode = 'table'; viewTbl.classList.add('active'); viewCard.classList.remove('active'); _renderBody(); });
  viewCard?.addEventListener('click', () => { _viewMode = 'cards'; viewCard.classList.add('active'); viewTbl.classList.remove('active'); _renderBody(); });

  _renderBody();
}

function _getFiltered() {
  let t = [...AppState.trades];
  if (_filterResult !== 'all') t = t.filter(x => x.result === _filterResult);
  if (_filterDir    !== 'all') t = t.filter(x => x.direction === _filterDir);
  if (_searchQuery) {
    const q = _searchQuery.toLowerCase();
    t = t.filter(x => (x.symbol||'').toLowerCase().includes(q) || (x.notes||'').toLowerCase().includes(q) || (x.setupName||'').toLowerCase().includes(q));
  }
  t.sort((a,b) => {
    let va, vb;
    if (_sortKey === 'date') { va = (a.date?.toDate?.()??new Date(a.date)).getTime(); vb = (b.date?.toDate?.()??new Date(b.date)).getTime(); }
    else if (_sortKey === 'pnl') { va = a.pnl||0; vb = b.pnl||0; }
    else if (_sortKey === 'r')   { va = a.rMultiple||0; vb = b.rMultiple||0; }
    else { va = 0; vb = 0; }
    return (va - vb) * _sortDir;
  });
  return t;
}

function _renderBody() {
  const body = document.getElementById('journal-body');
  const sub  = document.getElementById('journal-subtitle');
  if (!body) return;
  const trades = _getFiltered();
  if (sub) sub.textContent = `${trades.length} trade${trades.length===1?'':'s'}`;
  if (!trades.length) {
    body.innerHTML = `
      <div class="empty-state">
        <svg class="empty-icon" viewBox="0 0 40 40" fill="none" width="48" height="48"><rect x="5" y="5" width="30" height="30" rx="4" stroke="currentColor" stroke-width="1.5"/><line x1="12" y1="14" x2="28" y2="14" stroke="currentColor" stroke-width="1.5"/><line x1="12" y1="20" x2="24" y2="20" stroke="currentColor" stroke-width="1.5"/><line x1="12" y1="26" x2="18" y2="26" stroke="currentColor" stroke-width="1.5"/></svg>
        <div class="empty-title">No trades found</div>
        <div class="empty-desc">Log your first trade or adjust your filters</div>
      </div>`;
    return;
  }
  if (_viewMode === 'cards') {
    body.innerHTML = `<div style="padding:16px;display:flex;flex-direction:column;gap:8px;">${trades.map(t => _tradeCard(t)).join('')}</div>`;
  } else {
    body.innerHTML = _tradeTable(trades);
  }
  body.querySelectorAll('[data-trade-id]').forEach(el => {
    el.addEventListener('click', () => openModal('trade-detail', el.dataset.tradeId));
  });
  body.querySelectorAll('[data-delete-trade]').forEach(el => {
    el.addEventListener('click', async e => {
      e.stopPropagation();
      if (!confirm('Delete this trade? This cannot be undone.')) return;
      await DB.deleteTrade(AppState.user.uid, el.dataset.deleteTraide || el.dataset.deleteTrade);
      toast('Trade deleted.', 'info');
    });
  });
  const currency = AppState.profile?.currency || 'USD';
}

function _tradeTable(trades) {
  const currency = AppState.profile?.currency || 'USD';
  return `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Date</th><th>Symbol</th><th>Dir</th><th>Setup</th>
            <th>Entry</th><th>Exit</th><th>P&amp;L</th><th>R</th>
            <th>Session</th><th>Result</th><th>Score</th><th></th>
          </tr>
        </thead>
        <tbody>
          ${trades.map(t => `
            <tr data-trade-id="${t.id}" style="cursor:pointer;">
              <td style="font-size:12px;color:var(--text-3);white-space:nowrap;">${fmtDate(t.date)}</td>
              <td class="td-symbol">${t.symbol||'—'}</td>
              <td><span class="badge ${t.direction==='long'?'badge-long':'badge-short'}">${t.direction||'—'}</span></td>
              <td style="font-size:12px;color:var(--text-2);max-width:100px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${t.setupName||'—'}</td>
              <td class="td-mono">${t.entryPrice!=null?t.entryPrice:'—'}</td>
              <td class="td-mono">${t.exitPrice!=null?t.exitPrice:'—'}</td>
              <td class="td-mono ${(t.pnl||0)>=0?'text-green':'text-red'}">${fmt(t.pnl||0, currency)}</td>
              <td class="td-mono ${(t.rMultiple||0)>=0?'text-green':'text-red'}">${fmtR(t.rMultiple)}</td>
              <td style="font-size:12px;"><span class="badge badge-gray">${t.session||'—'}</span></td>
              <td><span class="badge ${t.result==='win'?'badge-win':t.result==='loss'?'badge-loss':'badge-be'}">${t.result||'—'}</span></td>
              <td class="td-mono" style="color:var(--cyan);">${t.executionScore!=null?t.executionScore+'/10':'—'}</td>
              <td class="td-action">
                <button class="btn-danger" data-delete-trade="${t.id}" style="font-size:11px;padding:4px 8px;" title="Delete">
                  <svg viewBox="0 0 14 14" fill="none" width="12"><polyline points="1,3 3,3 13,3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M11.5,3l-1,9h-7l-1-9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
                </button>
              </td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>`;
}

function _tradeCard(t) {
  const currency = AppState.profile?.currency || 'USD';
  return `
    <div class="trade-card" data-trade-id="${t.id}">
      <div class="trade-card-header">
        <div>
          <span class="trade-card-symbol">${t.symbol||'—'}</span>
          <span style="margin-left:8px;"><span class="badge ${t.direction==='long'?'badge-long':'badge-short'}">${t.direction||'—'}</span></span>
        </div>
        <span class="badge ${t.result==='win'?'badge-win':t.result==='loss'?'badge-loss':'badge-be'}">${t.result||'—'}</span>
      </div>
      <div class="trade-card-row">
        <span class="trade-card-pnl ${(t.pnl||0)>=0?'pos':'neg'}">${fmt(t.pnl||0, currency)}</span>
        <span class="td-mono ${(t.rMultiple||0)>=0?'text-green':'text-red'}" style="font-size:14px;">${fmtR(t.rMultiple)}</span>
      </div>
      <div class="trade-card-meta" style="margin-top:8px;">
        ${fmtDate(t.date)} · ${t.session||'—'} · ${t.setupName||'No setup'}
        ${t.executionScore!=null ? ` · <span style="color:var(--cyan);">${t.executionScore}/10</span>` : ''}
      </div>
    </div>`;
}

// === ADD/EDIT TRADE MODAL ===
export function renderAddTradeModal(tradeId = null) {
  const existing = tradeId ? AppState.trades.find(t => t.id === tradeId) : null;
  const t = existing || {};
  const playbook = AppState.playbook;
  const dateVal = t.date ? (() => { const d = t.date.toDate?.() ?? new Date(t.date); return d.toISOString().split('T')[0]; })() : new Date().toISOString().split('T')[0];
  const timeVal = t.time || new Date().toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit',hour12:false});

  return `
<div class="modal-header">
  <span class="modal-title">${existing ? 'Edit Trade' : 'Log New Trade'}</span>
  <button class="modal-close" id="modal-close-btn">
    <svg viewBox="0 0 14 14" fill="none"><line x1="1" y1="1" x2="13" y2="13" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="13" y1="1" x2="1" y2="13" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
  </button>
</div>
<div class="modal-body">
  <form id="trade-form" novalidate>

    <div class="form-section">
      <div class="form-section-title">Trade Details</div>
      <div class="form-grid-2">
        <div class="form-group">
          <label class="form-label">Symbol</label>
          <input class="form-input" id="tf-symbol" list="symbol-list" placeholder="EUR/USD" value="${t.symbol||''}" autocomplete="off">
          <datalist id="symbol-list">${SYMBOLS.map(s=>`<option value="${s}">`).join('')}</datalist>
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
            ${playbook.map(s => `<option value="${s.id}" ${t.setupId===s.id?'selected':''}>${s.name}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Session</label>
          <select class="form-input form-select" id="tf-session">
            ${SESSIONS.map(s => `<option value="${s}" ${t.session===s?'selected':''}>${s}</option>`).join('')}
          </select>
        </div>
      </div>
    </div>

    <div class="form-section">
      <div class="form-section-title">Prices &amp; Risk</div>
      <div class="form-grid-3">
        <div class="form-group">
          <label class="form-label">Entry Price</label>
          <input class="form-input" type="number" id="tf-entry" step="any" placeholder="1.08500" value="${t.entryPrice!=null?t.entryPrice:''}">
        </div>
        <div class="form-group">
          <label class="form-label">Stop Loss</label>
          <input class="form-input" type="number" id="tf-stop" step="any" placeholder="1.08200" value="${t.stopLoss!=null?t.stopLoss:''}">
        </div>
        <div class="form-group">
          <label class="form-label">Take Profit</label>
          <input class="form-input" type="number" id="tf-tp" step="any" placeholder="1.09100" value="${t.takeProfit!=null?t.takeProfit:''}">
        </div>
        <div class="form-group">
          <label class="form-label">Exit Price</label>
          <input class="form-input" type="number" id="tf-exit" step="any" placeholder="1.09000" value="${t.exitPrice!=null?t.exitPrice:''}">
        </div>
        <div class="form-group">
          <label class="form-label">Position Size (lots)</label>
          <input class="form-input" type="number" id="tf-size" step="any" placeholder="0.10" value="${t.positionSize!=null?t.positionSize:''}">
        </div>
        <div class="form-group">
          <label class="form-label">Risk %</label>
          <input class="form-input" type="number" id="tf-risk-pct" step="0.1" placeholder="1.0" value="${t.riskPercent!=null?t.riskPercent:''}">
        </div>
      </div>
      <div class="form-grid-2 mt-16">
        <div class="form-group">
          <label class="form-label">P&amp;L ($)</label>
          <input class="form-input" type="number" id="tf-pnl" step="any" placeholder="250.00" value="${t.pnl!=null?t.pnl:''}">
        </div>
        <div class="form-group">
          <label class="form-label">R-Multiple <span style="color:var(--text-3);font-weight:400;" id="r-calc-display">(auto)</span></label>
          <input class="form-input" type="number" id="tf-r" step="0.01" placeholder="Auto-calculated" value="${t.rMultiple!=null?t.rMultiple:''}">
        </div>
      </div>
    </div>

    <div class="form-section">
      <div class="form-section-title">Outcome</div>
      <div class="form-grid-2">
        <div class="form-group">
          <label class="form-label">Result</label>
          <select class="form-input form-select" id="tf-result">
            <option value="">Select result</option>
            <option value="win"       ${t.result==='win'?'selected':''}>Win</option>
            <option value="loss"      ${t.result==='loss'?'selected':''}>Loss</option>
            <option value="breakeven" ${t.result==='breakeven'?'selected':''}>Breakeven</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Execution Score: <span id="exec-val">${t.executionScore!=null?t.executionScore:5}</span>/10</label>
          <div class="score-input-wrap">
            <input type="range" id="tf-exec" min="1" max="10" step="1" value="${t.executionScore!=null?t.executionScore:5}">
          </div>
        </div>
      </div>
    </div>

    <div class="form-section">
      <div class="form-section-title">Psychology &amp; Discipline</div>
      <div class="form-group mb-16">
        <label class="form-label">Emotional State</label>
        <div class="emotion-grid" id="emotion-grid">
          ${EMOTIONS.map(e => `<div class="emotion-chip ${t.emotion===e?'selected':''}" data-emotion="${e}">${e}</div>`).join('')}
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
      <div class="form-group">
        <label class="form-label">Trade Notes</label>
        <textarea class="form-input" id="tf-notes" rows="3" placeholder="Setup rationale, entry reasoning, mistakes…">${t.notes||''}</textarea>
      </div>
      <div class="form-group mt-16">
        <label class="form-label">Mistakes Made (optional)</label>
        <textarea class="form-input" id="tf-mistakes" rows="2" placeholder="What went wrong, what to improve…">${(t.mistakes||[]).join('\n')}</textarea>
      </div>
      <div class="form-group mt-16">
        <label class="form-label">Screenshot URL (optional)</label>
        <input class="form-input" type="url" id="tf-screenshot" placeholder="https://…" value="${t.screenshotUrl||''}">
      </div>
    </div>
  </form>
</div>
<div class="modal-footer">
  <button class="btn-secondary" id="modal-cancel-btn">Cancel</button>
  <button class="btn-primary" id="trade-submit-btn">
    <span id="trade-submit-label">${existing ? 'Save Changes' : 'Log Trade'}</span>
    <span id="trade-submit-spinner" style="display:none;" class="btn-spinner"></span>
  </button>
</div>`;
}

export function initAddTradeModal(tradeId = null) {
  const existing  = tradeId ? AppState.trades.find(t => t.id === tradeId) : null;
  const closeBtn  = document.getElementById('modal-close-btn');
  const cancelBtn = document.getElementById('modal-cancel-btn');
  const submitBtn = document.getElementById('trade-submit-btn');
  const label     = document.getElementById('trade-submit-label');
  const spinner   = document.getElementById('trade-submit-spinner');
  const dirBtns   = document.querySelectorAll('#dir-toggle .direction-btn');
  const emotBtns  = document.querySelectorAll('#emotion-grid .emotion-chip');
  const execSlider= document.getElementById('tf-exec');
  const execVal   = document.getElementById('exec-val');
  const rDisplay  = document.getElementById('r-calc-display');

  const close = () => { document.getElementById('modal-bg').style.display = 'none'; };
  closeBtn?.addEventListener('click', close);
  cancelBtn?.addEventListener('click', close);
  document.getElementById('modal-bg')?.addEventListener('click', e => { if (e.target === document.getElementById('modal-bg')) close(); });

  dirBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      dirBtns.forEach(b => { b.classList.remove('selected-long','selected-short'); });
      btn.classList.add(btn.dataset.dir === 'long' ? 'selected-long' : 'selected-short');
      document.getElementById('tf-direction').value = btn.dataset.dir;
      _autoCalcR();
    });
  });

  emotBtns.forEach(chip => {
    chip.addEventListener('click', () => {
      emotBtns.forEach(c => c.classList.remove('selected'));
      chip.classList.add('selected');
      document.getElementById('tf-emotion').value = chip.dataset.emotion;
    });
  });

  execSlider?.addEventListener('input', () => { execVal.textContent = execSlider.value; });

  ['tf-entry','tf-stop','tf-exit','tf-direction'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', _autoCalcR);
  });

  function _autoCalcR() {
    const entry = parseFloat(document.getElementById('tf-entry')?.value);
    const stop  = parseFloat(document.getElementById('tf-stop')?.value);
    const exit  = parseFloat(document.getElementById('tf-exit')?.value);
    const dir   = document.getElementById('tf-direction')?.value;
    if (entry && stop && exit && dir) {
      const r = calcRMultiple(entry, exit, stop, dir);
      document.getElementById('tf-r').value = r;
      if (rDisplay) rDisplay.textContent = `(${r >= 0 ? '+' : ''}${r}R)`;
    }
  }

  submitBtn?.addEventListener('click', async () => {
    const symbol    = document.getElementById('tf-symbol')?.value.trim().toUpperCase();
    const direction = document.getElementById('tf-direction')?.value;
    const dateStr   = document.getElementById('tf-date')?.value;
    const timeStr   = document.getElementById('tf-time')?.value;
    const result    = document.getElementById('tf-result')?.value;
    const pnl       = parseFloat(document.getElementById('tf-pnl')?.value);

    if (!symbol)    { toast('Symbol is required.', 'error'); return; }
    if (!direction) { toast('Select a direction (Long or Short).', 'error'); return; }
    if (!dateStr)   { toast('Date is required.', 'error'); return; }
    if (!result)    { toast('Select a trade result.', 'error'); return; }
    if (isNaN(pnl)) { toast('P&L is required.', 'error'); return; }

    const setupSelect = document.getElementById('tf-setup');
    const setupId     = setupSelect?.value || null;
    const setupName   = setupId ? AppState.playbook.find(s=>s.id===setupId)?.name || '' : '';
    const session     = document.getElementById('tf-session')?.value || getSessionFromTime(timeStr);
    const rVal        = parseFloat(document.getElementById('tf-r')?.value);
    const profile     = AppState.profile;
    const currency    = profile?.currency || 'USD';

    const trade = {
      symbol,
      direction,
      date:       DB.toTimestamp(dateStr + 'T' + (timeStr || '00:00')),
      time:       timeStr || '00:00',
      session,
      setupId:    setupId || null,
      setupName,
      entryPrice:  parseFloat(document.getElementById('tf-entry')?.value) || null,
      stopLoss:    parseFloat(document.getElementById('tf-stop')?.value)  || null,
      takeProfit:  parseFloat(document.getElementById('tf-tp')?.value)    || null,
      exitPrice:   parseFloat(document.getElementById('tf-exit')?.value)  || null,
      positionSize:parseFloat(document.getElementById('tf-size')?.value)  || null,
      riskPercent: parseFloat(document.getElementById('tf-risk-pct')?.value) || null,
      pnl,
      pnlPercent:  profile?.accountBalance ? parseFloat((pnl/profile.accountBalance*100).toFixed(3)) : null,
      rMultiple:   isNaN(rVal) ? null : rVal,
      result,
      executionScore: parseInt(document.getElementById('tf-exec')?.value) || 5,
      emotion:     document.getElementById('tf-emotion')?.value || null,
      followedRules: document.getElementById('tf-rules')?.checked || false,
      notes:       document.getElementById('tf-notes')?.value.trim() || '',
      mistakes:    (document.getElementById('tf-mistakes')?.value||'').split('\n').filter(Boolean),
      screenshotUrl: document.getElementById('tf-screenshot')?.value.trim() || null,
      accountBalanceBefore: profile?.accountBalance || 0,
      currency,
      tags: []
    };

    label.style.display = 'none';
    spinner.style.display = '';
    submitBtn.disabled = true;
    try {
      if (existing) {
        await DB.updateTrade(AppState.user.uid, existing.id, trade);
        // Update account balance
        if (profile) {
          const oldPnl = existing.pnl || 0;
          const diff   = pnl - oldPnl;
          await DB.updateProfile(AppState.user.uid, { accountBalance: (profile.accountBalance||0) + diff });
        }
        toast('Trade updated.', 'success');
      } else {
        await DB.addTrade(AppState.user.uid, trade);
        if (profile) {
          await DB.updateProfile(AppState.user.uid, { accountBalance: (profile.accountBalance||0) + pnl });
        }
        toast('Trade logged.', 'success');
      }
      close();
    } catch(err) {
      toast(err.message, 'error');
      label.style.display = '';
      spinner.style.display = 'none';
      submitBtn.disabled = false;
    }
  });
}

// === TRADE DETAIL MODAL ===
export function renderTradeDetail(tradeId) {
  const t = AppState.trades.find(x => x.id === tradeId);
  if (!t) return '<div class="modal-body"><p>Trade not found.</p></div>';
  const currency = AppState.profile?.currency || 'USD';
  const dateStr  = t.date?.toDate ? t.date.toDate() : new Date(t.date);
  return `
<div class="modal-header">
  <div>
    <span class="modal-title">${t.symbol||'Trade'}</span>
    <span style="margin-left:10px;"><span class="badge ${t.direction==='long'?'badge-long':'badge-short'}">${t.direction||''}</span></span>
  </div>
  <button class="modal-close" id="modal-close-btn">
    <svg viewBox="0 0 14 14" fill="none"><line x1="1" y1="1" x2="13" y2="13" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="13" y1="1" x2="1" y2="13" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
  </button>
</div>
<div class="modal-body">
  <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:24px;">
    <span class="badge ${t.result==='win'?'badge-win':t.result==='loss'?'badge-loss':'badge-be'}" style="font-size:13px;padding:6px 14px;">${(t.result||'—').toUpperCase()}</span>
    <span style="font-family:'DM Mono',monospace;font-size:22px;font-weight:500;color:${(t.pnl||0)>=0?'var(--green)':'var(--red)'};">${fmt(t.pnl||0,currency)}</span>
    <span style="font-family:'DM Mono',monospace;font-size:18px;color:${(t.rMultiple||0)>=0?'var(--green)':'var(--red)'};">${fmtR(t.rMultiple)}</span>
  </div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px;">
    ${[
      ['Date',        dateStr.toLocaleString('en-US',{dateStyle:'medium',timeStyle:'short'})],
      ['Session',     t.session||'—'],
      ['Setup',       t.setupName||'—'],
      ['Entry',       t.entryPrice??'—'],
      ['Exit',        t.exitPrice??'—'],
      ['Stop Loss',   t.stopLoss??'—'],
      ['Take Profit', t.takeProfit??'—'],
      ['Position',    t.positionSize!=null ? t.positionSize+' lots' : '—'],
      ['Risk %',      t.riskPercent!=null ? t.riskPercent+'%' : '—'],
      ['Exec Score',  t.executionScore!=null ? t.executionScore+'/10' : '—'],
      ['Emotion',     t.emotion||'—'],
      ['Followed Rules', t.followedRules ? 'Yes' : 'No'],
    ].map(([l,v]) => `
      <div style="padding:10px 14px;background:rgba(0,0,0,0.2);border-radius:8px;">
        <div style="font-size:10px;text-transform:uppercase;letter-spacing:0.08em;color:var(--text-3);margin-bottom:3px;">${l}</div>
        <div style="font-size:13px;font-family:'DM Mono',monospace;color:var(--text);">${v}</div>
      </div>`).join('')}
  </div>
  ${t.notes ? `<div style="margin-bottom:16px;"><div style="font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:var(--text-3);margin-bottom:6px;">Notes</div><div style="font-size:13px;color:var(--text-2);line-height:1.6;">${t.notes}</div></div>` : ''}
  ${t.mistakes?.length ? `<div style="margin-bottom:16px;"><div style="font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:var(--red);margin-bottom:6px;">Mistakes</div><ul style="padding-left:18px;font-size:13px;color:var(--text-2);line-height:1.8;">${t.mistakes.map(m=>`<li>${m}</li>`).join('')}</ul></div>` : ''}
  ${t.screenshotUrl ? `<a href="${t.screenshotUrl}" target="_blank" style="color:var(--cyan);font-size:13px;">View Screenshot</a>` : ''}
</div>
<div class="modal-footer">
  <button class="btn-secondary" id="modal-close-btn-2">Close</button>
  <button class="btn-secondary" id="trade-edit-btn">Edit</button>
</div>`;
}

export function initTradeDetail(tradeId) {
  const close = () => { document.getElementById('modal-bg').style.display = 'none'; };
  document.getElementById('modal-close-btn')?.addEventListener('click', close);
  document.getElementById('modal-close-btn-2')?.addEventListener('click', close);
  document.getElementById('modal-bg')?.addEventListener('click', e => { if (e.target === document.getElementById('modal-bg')) close(); });
  document.getElementById('trade-edit-btn')?.addEventListener('click', () => openModal('add-trade', tradeId));
}
