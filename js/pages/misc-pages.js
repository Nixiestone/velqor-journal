// VELQOR JOURNAL — Playbook, Review, Milestones, Settings
import { AppState, openModal, closeModal, toast, getActiveAccount, getActiveTrades, getCurrency } from '../app.js';
import { DB } from '../db.js';
import { fmt, fmtDate, fmtR, computeMetrics, toDate } from '../utils.js';

// ─────────────────────────────────────────────
// SHARED CLOSE HELPER
// ─────────────────────────────────────────────
function _close() { closeModal(); }

// ─────────────────────────────────────────────
// PLAYBOOK
// ─────────────────────────────────────────────
export function renderPlaybook() {
  return `
<div class="page-wrapper page-enter">
  <div class="page-header page-header-row">
    <div>
      <div class="page-title">Playbook</div>
      <div class="page-subtitle">Your trading setups and strategies</div>
    </div>
    <button class="btn-primary" id="pb-add-btn">
      <svg viewBox="0 0 16 16" width="14" height="14" fill="none"><line x1="8" y1="2" x2="8" y2="14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="2" y1="8" x2="14" y2="8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
      Add Setup
    </button>
  </div>
  <div id="playbook-grid" class="playbook-grid"></div>
</div>`;
}

export function initPlaybook() {
  document.getElementById('pb-add-btn')?.addEventListener('click', () => openModal('add-setup'));
  _renderPlaybookGrid();
}

function _renderPlaybookGrid() {
  const grid = document.getElementById('playbook-grid');
  if (!grid) return;
  const { playbook } = AppState;
  const trades   = getActiveTrades();
  const currency = getCurrency();

  if (!playbook.length) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1;padding:60px;">
        <svg class="empty-icon" viewBox="0 0 40 40" fill="none" width="48" height="48"><path d="M8 5h17l7 7v23a1 1 0 01-1 1H8a1 1 0 01-1-1V6a1 1 0 011-1z" stroke="currentColor" stroke-width="1.5"/><path d="M25 5v7h7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><line x1="12" y1="15" x2="22" y2="15" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><line x1="12" y1="20" x2="26" y2="20" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
        <div class="empty-title">No setups yet</div>
        <div class="empty-desc">Build your playbook by adding your trading strategies</div>
      </div>`;
    return;
  }

  grid.innerHTML = playbook.map(s => {
    const st = trades.filter(t => t.setupId === s.id);
    const m  = computeMetrics(st);
    return `
      <div class="playbook-card">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:8px;gap:8px;">
          <div class="playbook-card-name">${s.name}</div>
          <div style="display:flex;gap:6px;flex-shrink:0;">
            <button class="btn-secondary" style="padding:4px 10px;font-size:11px;" data-edit-setup="${s.id}">Edit</button>
            <button class="btn-danger"    style="padding:4px 10px;font-size:11px;" data-del-setup="${s.id}">Delete</button>
          </div>
        </div>
        <div class="playbook-card-desc">${s.description || 'No description provided.'}</div>
        ${s.rules?.length ? `
          <div style="margin-bottom:12px;">
            <div style="font-size:10px;text-transform:uppercase;letter-spacing:0.08em;color:var(--text-3);margin-bottom:6px;">Entry Rules</div>
            <ul style="padding-left:16px;font-size:12px;color:var(--text-2);line-height:1.8;">${s.rules.map(r=>`<li>${r}</li>`).join('')}</ul>
          </div>` : ''}
        ${s.timeframe ? `<div style="font-size:12px;color:var(--text-3);margin-bottom:12px;">Timeframe: <span style="color:var(--cyan);">${s.timeframe}</span></div>` : ''}
        <div style="border-top:1px solid var(--glass-border);padding-top:12px;">
          <div style="font-size:10px;text-transform:uppercase;letter-spacing:0.08em;color:var(--text-3);margin-bottom:8px;">Performance · ${st.length} trades</div>
          <div class="playbook-stats">
            <div class="playbook-stat"><span class="playbook-stat-label">Win Rate</span><span class="playbook-stat-value">${m.winRate}%</span></div>
            <div class="playbook-stat"><span class="playbook-stat-label">Avg R</span><span class="playbook-stat-value ${m.avgR>=0?'text-green':'text-red'}">${fmtR(m.avgR)}</span></div>
            <div class="playbook-stat"><span class="playbook-stat-label">Net P&L</span><span class="playbook-stat-value ${m.netPnl>=0?'text-green':'text-red'}">${fmt(m.netPnl,currency)}</span></div>
            <div class="playbook-stat"><span class="playbook-stat-label">P.Factor</span><span class="playbook-stat-value">${m.profitFactor===999?'∞':m.profitFactor}</span></div>
          </div>
        </div>
      </div>`;
  }).join('');

  grid.querySelectorAll('[data-edit-setup]').forEach(b => b.addEventListener('click', () => openModal('add-setup', b.dataset.editSetup)));
  grid.querySelectorAll('[data-del-setup]').forEach(b => b.addEventListener('click', async () => {
    if (!confirm('Delete this setup? Trades linked to it will remain.')) return;
    await DB.deleteSetup(AppState.user.uid, b.dataset.delSetup);
    toast('Setup deleted.', 'info');
  }));
}

// ─────────────────────────────────────────────
// ADD / EDIT SETUP MODAL
// ─────────────────────────────────────────────
export function renderAddSetupModal(setupId = null) {
  const s = setupId ? AppState.playbook.find(x=>x.id===setupId) : null;
  const rules = s?.rules || [];
  return `
<div class="modal-header">
  <span class="modal-title">${s ? 'Edit Setup' : 'New Setup'}</span>
  <button class="modal-close" id="m-close"><svg viewBox="0 0 14 14" fill="none"><line x1="1" y1="1" x2="13" y2="13" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="13" y1="1" x2="1" y2="13" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></button>
</div>
<div class="modal-body">
  <div class="form-group mb-16">
    <label class="form-label">Setup Name</label>
    <input class="form-input" id="setup-name" placeholder="e.g. London Breakout" value="${s?.name||''}">
  </div>
  <div class="form-group mb-16">
    <label class="form-label">Description</label>
    <textarea class="form-input" id="setup-desc" rows="3" placeholder="Market conditions, timeframe, overview...">${s?.description||''}</textarea>
  </div>
  <div class="form-group mb-16">
    <label class="form-label">Preferred Timeframe</label>
    <input class="form-input" id="setup-tf" placeholder="e.g. H1, H4, M15" value="${s?.timeframe||''}">
  </div>
  <div class="form-section-title" style="margin-bottom:10px;">Entry Rules</div>
  <div id="setup-rules-list" class="rules-list" style="margin-bottom:10px;"></div>
  <div class="add-rule-row">
    <input class="form-input" id="new-rule-input" placeholder="Add a rule...">
    <button class="btn-secondary" id="add-rule-btn" style="white-space:nowrap;">Add</button>
  </div>
</div>
<div class="modal-footer">
  <button class="btn-secondary" id="m-cancel">Cancel</button>
  <button class="btn-primary"   id="setup-save-btn">${s ? 'Save Changes' : 'Create Setup'}</button>
</div>`;
}

export function initAddSetupModal(setupId = null) {
  const existing = setupId ? AppState.playbook.find(x=>x.id===setupId) : null;
  let rules = [...(existing?.rules || [])];

  document.getElementById('m-close')?.addEventListener('click', _close);
  document.getElementById('m-cancel')?.addEventListener('click', _close);

  function _refreshRules() {
    const list = document.getElementById('setup-rules-list');
    if (!list) return;
    if (!rules.length) { list.innerHTML = '<div style="font-size:12px;color:var(--text-3);padding:4px 0;">No rules added yet.</div>'; return; }
    list.innerHTML = rules.map((r,i) => `
      <div class="rule-item">
        <span class="rule-text">${r}</span>
        <button class="rule-delete" data-i="${i}" title="Remove">
          <svg viewBox="0 0 14 14" fill="none" width="13"><line x1="1" y1="1" x2="13" y2="13" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><line x1="13" y1="1" x2="1" y2="13" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
        </button>
      </div>`).join('');
    list.querySelectorAll('.rule-delete').forEach(b => b.addEventListener('click', () => { rules.splice(parseInt(b.dataset.i),1); _refreshRules(); }));
  }
  _refreshRules();

  const addRuleBtn = document.getElementById('add-rule-btn');
  const ruleInp   = document.getElementById('new-rule-input');
  function _addRule() { const v=ruleInp?.value.trim(); if(!v) return; rules.push(v); ruleInp.value=''; _refreshRules(); }
  addRuleBtn?.addEventListener('click', _addRule);
  ruleInp?.addEventListener('keydown', e => { if(e.key==='Enter'){e.preventDefault();_addRule();} });

  document.getElementById('setup-save-btn')?.addEventListener('click', async () => {
    const name = document.getElementById('setup-name')?.value.trim();
    if (!name) { toast('Setup name is required.', 'error'); return; }
    const btn = document.getElementById('setup-save-btn');
    btn.disabled = true; btn.textContent = 'Saving...';
    const data = {
      name,
      description: document.getElementById('setup-desc')?.value.trim() || '',
      timeframe:   document.getElementById('setup-tf')?.value.trim() || '',
      rules
    };
    try {
      if (existing) { await DB.updateSetup(AppState.user.uid, existing.id, data); toast('Setup updated.', 'success'); }
      else           { await DB.addSetup(AppState.user.uid, data);                 toast('Setup created.', 'success'); }
      _close();
    } catch(e) { toast(e.message, 'error'); btn.disabled=false; btn.textContent=existing?'Save Changes':'Create Setup'; }
  });
}

// ─────────────────────────────────────────────
// REVIEW PAGE
// ─────────────────────────────────────────────
export function renderReview() {
  return `
<div class="page-wrapper page-enter">
  <div class="page-header page-header-row">
    <div>
      <div class="page-title">Review</div>
      <div class="page-subtitle">Weekly and monthly performance reviews</div>
    </div>
    <button class="btn-primary" id="review-add-btn">
      <svg viewBox="0 0 16 16" width="14" height="14" fill="none"><line x1="8" y1="2" x2="8" y2="14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="2" y1="8" x2="14" y2="8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
      New Review
    </button>
  </div>
  <div id="reviews-body"></div>
</div>`;
}

export function initReview() {
  document.getElementById('review-add-btn')?.addEventListener('click', () => openModal('add-review'));
  _renderReviews();
}

function _renderReviews() {
  const body = document.getElementById('reviews-body');
  if (!body) return;
  const { reviews } = AppState;
  const currency    = getCurrency();
  const trades      = getActiveTrades();

  if (!reviews.length) {
    body.innerHTML = `
      <div class="empty-state" style="padding:60px;">
        <svg class="empty-icon" viewBox="0 0 40 40" fill="none" width="48" height="48"><rect x="5" y="7" width="30" height="26" rx="2" stroke="currentColor" stroke-width="1.5"/><line x1="5" y1="13" x2="35" y2="13" stroke="currentColor" stroke-width="1.5"/><line x1="12" y1="7" x2="12" y2="3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="28" y1="7" x2="28" y2="3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
        <div class="empty-title">No reviews yet</div>
        <div class="empty-desc">Write your first weekly or monthly review</div>
      </div>`;
    return;
  }

  const sorted   = [...reviews].sort((a,b) => toDate(b.startDate)-toDate(a.startDate));
  const monthly  = sorted.filter(r=>r.type==='monthly');
  const weekly   = sorted.filter(r=>r.type==='weekly');

  function _group(list, label) {
    if (!list.length) return '';
    return `
      <div style="margin-bottom:28px;">
        <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.12em;font-weight:600;color:var(--text-3);margin-bottom:14px;">${label}</div>
        <div style="display:flex;flex-direction:column;gap:12px;">
          ${list.map(r => {
            const rTrades = trades.filter(t => { const d=toDate(t.date); return d>=toDate(r.startDate)&&d<=toDate(r.endDate); });
            const m = computeMetrics(rTrades);
            return `
              <div class="review-card">
                <div style="display:flex;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;gap:8px;">
                  <div>
                    <div class="review-period">${r.type==='weekly'?'Weekly':'Monthly'} Review</div>
                    <div class="review-dates">${fmtDate(r.startDate)} — ${fmtDate(r.endDate)}</div>
                  </div>
                  <div style="display:flex;gap:8px;align-items:center;">
                    ${r.score!=null?`<div class="review-score"><span class="review-score-num">${r.score}</span><span class="review-score-label">/10</span></div>`:''}
                    <button class="btn-danger" style="padding:5px 10px;font-size:11px;" data-del-review="${r.id}">Delete</button>
                  </div>
                </div>
                <div class="review-stats" style="margin-top:14px;">
                  <div class="review-stat"><span class="review-stat-val ${m.netPnl>=0?'text-green':'text-red'}">${m.netPnl>=0?'+':''}${fmt(m.netPnl,currency)}</span><span class="review-stat-lbl">P&L</span></div>
                  <div class="review-stat"><span class="review-stat-val">${m.totalTrades}</span><span class="review-stat-lbl">Trades</span></div>
                  <div class="review-stat"><span class="review-stat-val">${m.winRate}%</span><span class="review-stat-lbl">Win Rate</span></div>
                  <div class="review-stat"><span class="review-stat-val ${m.avgR>=0?'text-green':'text-red'}">${fmtR(m.avgR)}</span><span class="review-stat-lbl">Avg R</span></div>
                </div>
                ${r.overall    ?`<div style="margin-top:12px;"><div style="font-size:10px;text-transform:uppercase;letter-spacing:0.08em;color:var(--text-3);margin-bottom:4px;">Assessment</div><div style="font-size:13px;color:var(--text-2);line-height:1.6;">${r.overall}</div></div>`:''}
                ${r.keyLessons ?`<div style="margin-top:10px;"><div style="font-size:10px;text-transform:uppercase;letter-spacing:0.08em;color:var(--cyan);margin-bottom:4px;">Key Lessons</div><div style="font-size:13px;color:var(--text-2);line-height:1.6;">${r.keyLessons}</div></div>`:''}
                ${r.improvements?`<div style="margin-top:10px;"><div style="font-size:10px;text-transform:uppercase;letter-spacing:0.08em;color:var(--amber);margin-bottom:4px;">Improvements</div><div style="font-size:13px;color:var(--text-2);line-height:1.6;">${r.improvements}</div></div>`:''}
              </div>`;
          }).join('')}
        </div>
      </div>`;
  }

  body.innerHTML = _group(monthly, 'Monthly Reviews') + _group(weekly, 'Weekly Reviews');

  body.querySelectorAll('[data-del-review]').forEach(b => b.addEventListener('click', async () => {
    if (!confirm('Delete this review?')) return;
    await DB.deleteReview(AppState.user.uid, b.dataset.delReview);
    toast('Review deleted.', 'info');
  }));
}

// ─────────────────────────────────────────────
// ADD REVIEW MODAL
// ─────────────────────────────────────────────
export function renderAddReviewModal() {
  const today   = new Date().toISOString().split('T')[0];
  const weekAgo = new Date(Date.now()-7*86400000).toISOString().split('T')[0];
  return `
<div class="modal-header">
  <span class="modal-title">New Review</span>
  <button class="modal-close" id="m-close"><svg viewBox="0 0 14 14" fill="none"><line x1="1" y1="1" x2="13" y2="13" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="13" y1="1" x2="1" y2="13" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></button>
</div>
<div class="modal-body">
  <div class="form-grid-2">
    <div class="form-group">
      <label class="form-label">Review Type</label>
      <select class="form-input form-select" id="rv-type">
        <option value="weekly">Weekly</option>
        <option value="monthly">Monthly</option>
      </select>
    </div>
    <div class="form-group">
      <label class="form-label">Score (1–10)</label>
      <input class="form-input" type="number" id="rv-score" min="1" max="10" placeholder="7">
    </div>
    <div class="form-group">
      <label class="form-label">Start Date</label>
      <input class="form-input" type="date" id="rv-start" value="${weekAgo}">
    </div>
    <div class="form-group">
      <label class="form-label">End Date</label>
      <input class="form-input" type="date" id="rv-end" value="${today}">
    </div>
  </div>
  <div class="form-group mt-16">
    <label class="form-label">Overall Assessment</label>
    <textarea class="form-input" id="rv-overall" rows="3" placeholder="How did the period go overall?"></textarea>
  </div>
  <div class="form-group mt-16">
    <label class="form-label">Key Lessons Learned</label>
    <textarea class="form-input" id="rv-lessons" rows="3" placeholder="What did you learn this period?"></textarea>
  </div>
  <div class="form-group mt-16">
    <label class="form-label">What to Improve Next Period</label>
    <textarea class="form-input" id="rv-improve" rows="2" placeholder="Specific improvements to make..."></textarea>
  </div>
  <div class="form-group mt-16">
    <label class="form-label">What Went Well</label>
    <textarea class="form-input" id="rv-good" rows="2" placeholder="Strengths to maintain..."></textarea>
  </div>
</div>
<div class="modal-footer">
  <button class="btn-secondary" id="m-cancel">Cancel</button>
  <button class="btn-primary"   id="rv-save-btn">Save Review</button>
</div>`;
}

export function initAddReviewModal() {
  document.getElementById('m-close')?.addEventListener('click', _close);
  document.getElementById('m-cancel')?.addEventListener('click', _close);

  document.getElementById('rv-save-btn')?.addEventListener('click', async () => {
    const startVal = document.getElementById('rv-start')?.value;
    const endVal   = document.getElementById('rv-end')?.value;
    if (!startVal) { toast('Start date is required.', 'error'); return; }
    if (!endVal)   { toast('End date is required.', 'error'); return; }

    const btn = document.getElementById('rv-save-btn');
    btn.disabled = true; btn.textContent = 'Saving...';

    try {
      const scoreRaw = document.getElementById('rv-score')?.value;
      const score    = scoreRaw ? parseInt(scoreRaw) : null;

      await DB.addReview(AppState.user.uid, {
        type:         document.getElementById('rv-type')?.value || 'weekly',
        score:        (score && score >= 1 && score <= 10) ? score : null,
        startDate:    DB.toTimestamp(startVal + 'T00:00:00'),
        endDate:      DB.toTimestamp(endVal   + 'T23:59:59'),
        overall:      document.getElementById('rv-overall')?.value.trim() || '',
        keyLessons:   document.getElementById('rv-lessons')?.value.trim() || '',
        improvements: document.getElementById('rv-improve')?.value.trim() || '',
        wentWell:     document.getElementById('rv-good')?.value.trim()    || ''
      });

      toast('Review saved.', 'success');
      _close();
    } catch(e) {
      console.error('Review save error:', e);
      toast('Error saving review: ' + e.message, 'error');
      btn.disabled = false; btn.textContent = 'Save Review';
    }
  });
}

// ─────────────────────────────────────────────
// MILESTONES PAGE
// ─────────────────────────────────────────────
export function renderMilestones() {
  return `
<div class="page-wrapper page-enter">
  <div class="page-header page-header-row">
    <div>
      <div class="page-title">Milestones</div>
      <div class="page-subtitle">Goals and achievement tracking</div>
    </div>
    <button class="btn-primary" id="ms-add-btn">
      <svg viewBox="0 0 16 16" width="14" height="14" fill="none"><line x1="8" y1="2" x2="8" y2="14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="2" y1="8" x2="14" y2="8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
      Add Milestone
    </button>
  </div>
  <div id="ms-content"></div>
</div>`;
}

export function initMilestones() {
  document.getElementById('ms-add-btn')?.addEventListener('click', () => openModal('add-milestone'));
  _renderMilestoneGrid();
}

function _getMilestoneProgress(ms) {
  const trades  = getActiveTrades();
  const profile = AppState.profile;
  const acct    = getActiveAccount();
  switch(ms.type) {
    case 'balance':  return { current: acct?.balance || 0,              target: ms.target };
    case 'pnl':      return { current: trades.reduce((s,t)=>s+(t.pnl||0),0), target: ms.target };
    case 'trades':   return { current: trades.length,                   target: ms.target };
    case 'winrate':  { const m=computeMetrics(trades); return { current: m.winRate, target: ms.target }; }
    case 'streak': {
      let best=0,cur=0;
      [...trades].sort((a,b)=>toDate(a.date)-toDate(b.date)).forEach(t=>{if(t.result==='win'){cur++;best=Math.max(best,cur);}else cur=0;});
      return { current: best, target: ms.target };
    }
    default: return { current: ms.currentValue || 0, target: ms.target || 100 };
  }
}

function _renderMilestoneGrid() {
  const content = document.getElementById('ms-content');
  if (!content) return;
  const { milestones } = AppState;
  const currency = getCurrency();

  if (!milestones.length) {
    content.innerHTML = `
      <div class="empty-state" style="padding:60px;">
        <svg class="empty-icon" viewBox="0 0 40 40" fill="none" width="48" height="48"><polygon points="20,3 24,13 35,15 27,23 29,34 20,29 11,34 13,23 5,15 16,13" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" fill="none"/></svg>
        <div class="empty-title">No milestones yet</div>
        <div class="empty-desc">Set goals to track your progress</div>
      </div>`;
    return;
  }

  content.innerHTML = `<div class="milestones-grid">
    ${milestones.map(ms => {
      const { current, target } = _getMilestoneProgress(ms);
      const pct      = target > 0 ? Math.min(100, (current / target) * 100) : 0;
      const achieved = ms.achieved || pct >= 100;
      const isMoney  = ['balance','pnl'].includes(ms.type);
      const dispCur  = isMoney ? fmt(current, currency) : (ms.type==='winrate' ? current.toFixed(1)+'%' : Math.floor(current).toString());
      const dispTgt  = isMoney ? fmt(target,  currency) : (ms.type==='winrate' ? target+'%' : target.toString());

      return `
        <div class="milestone-card ${achieved?'achieved':''}">
          <div class="milestone-top">
            <div>
              <div class="milestone-title">${ms.title}</div>
              <div class="milestone-type">${(ms.type||'custom').toUpperCase()} GOAL</div>
            </div>
            <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px;">
              ${achieved?`<span class="milestone-badge-achieved"><svg viewBox="0 0 12 12" fill="none" width="11"><polyline points="1,6 4.5,9.5 11,2.5" stroke="var(--green)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>Done</span>`:''}
              <div style="display:flex;gap:4px;">
                <button class="btn-secondary" style="padding:3px 8px;font-size:11px;" data-edit-ms="${ms.id}">Edit</button>
                <button class="btn-danger"    style="padding:3px 8px;font-size:11px;" data-del-ms="${ms.id}">Del</button>
              </div>
            </div>
          </div>
          ${ms.description?`<div style="font-size:13px;color:var(--text-2);margin-bottom:14px;line-height:1.5;">${ms.description}</div>`:''}
          <div class="milestone-progress-bar"><div class="milestone-progress-fill ${achieved?'achieved':''}" style="width:${pct.toFixed(1)}%;"></div></div>
          <div class="milestone-progress-text">
            <span>${dispCur}</span>
            <span>${Math.round(pct)}%</span>
            <span>${dispTgt}</span>
          </div>
          ${ms.targetDate?`<div style="margin-top:8px;font-size:11px;color:var(--text-3);">Target: ${fmtDate(ms.targetDate)}</div>`:''}
        </div>`;
    }).join('')}
  </div>`;

  content.querySelectorAll('[data-edit-ms]').forEach(b => b.addEventListener('click', () => openModal('add-milestone', b.dataset.editMs)));
  content.querySelectorAll('[data-del-ms]').forEach(b => b.addEventListener('click', async () => {
    if (!confirm('Delete this milestone?')) return;
    await DB.deleteMilestone(AppState.user.uid, b.dataset.delMs);
    toast('Milestone deleted.', 'info');
  }));
}

// ─────────────────────────────────────────────
// ADD MILESTONE MODAL
// ─────────────────────────────────────────────
export function renderAddMilestoneModal(msId = null) {
  const ms    = msId ? AppState.milestones.find(x=>x.id===msId) : null;
  const today = new Date().toISOString().split('T')[0];
  return `
<div class="modal-header">
  <span class="modal-title">${ms ? 'Edit Milestone' : 'New Milestone'}</span>
  <button class="modal-close" id="m-close"><svg viewBox="0 0 14 14" fill="none"><line x1="1" y1="1" x2="13" y2="13" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="13" y1="1" x2="1" y2="13" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></button>
</div>
<div class="modal-body">
  <div class="form-group mb-16">
    <label class="form-label">Title</label>
    <input class="form-input" id="ms-title" placeholder="e.g. Reach $25,000 balance" value="${ms?.title||''}">
  </div>
  <div class="form-group mb-16">
    <label class="form-label">Description (optional)</label>
    <textarea class="form-input" id="ms-desc" rows="2" placeholder="Why this milestone matters to you...">${ms?.description||''}</textarea>
  </div>
  <div class="form-grid-2">
    <div class="form-group">
      <label class="form-label">Goal Type</label>
      <select class="form-input form-select" id="ms-type">
        <option value="balance"  ${ms?.type==='balance' ?'selected':''}>Account Balance</option>
        <option value="pnl"      ${ms?.type==='pnl'     ?'selected':''}>Total P&L</option>
        <option value="trades"   ${ms?.type==='trades'  ?'selected':''}>Trade Count</option>
        <option value="winrate"  ${ms?.type==='winrate' ?'selected':''}>Win Rate (%)</option>
        <option value="streak"   ${ms?.type==='streak'  ?'selected':''}>Win Streak</option>
        <option value="custom"   ${ms?.type==='custom'  ?'selected':''}>Custom</option>
      </select>
    </div>
    <div class="form-group">
      <label class="form-label">Target Value</label>
      <input class="form-input" type="number" id="ms-target" placeholder="e.g. 25000" value="${ms?.target||''}">
    </div>
    <div class="form-group">
      <label class="form-label">Target Date (optional)</label>
      <input class="form-input" type="date" id="ms-date" value="${ms?.targetDate ? (toDate(ms.targetDate).toISOString().split('T')[0]) : today}">
    </div>
  </div>
</div>
<div class="modal-footer">
  <button class="btn-secondary" id="m-cancel">Cancel</button>
  <button class="btn-primary"   id="ms-save-btn">${ms ? 'Save Changes' : 'Create Milestone'}</button>
</div>`;
}

export function initAddMilestoneModal(msId = null) {
  const existing = msId ? AppState.milestones.find(x=>x.id===msId) : null;

  document.getElementById('m-close')?.addEventListener('click', _close);
  document.getElementById('m-cancel')?.addEventListener('click', _close);

  document.getElementById('ms-save-btn')?.addEventListener('click', async () => {
    const title     = document.getElementById('ms-title')?.value.trim();
    const targetRaw = document.getElementById('ms-target')?.value;
    const target    = parseFloat(targetRaw);

    if (!title)     { toast('Title is required.', 'error'); return; }
    if (!targetRaw || isNaN(target)) { toast('Target value is required.', 'error'); return; }

    const btn = document.getElementById('ms-save-btn');
    btn.disabled = true; btn.textContent = 'Saving...';

    const dateVal = document.getElementById('ms-date')?.value;
    const data = {
      title,
      description: document.getElementById('ms-desc')?.value.trim() || '',
      type:        document.getElementById('ms-type')?.value || 'custom',
      target,
      targetDate:  dateVal ? DB.toTimestamp(dateVal + 'T00:00:00') : null,
      achieved:    existing?.achieved || false
    };

    try {
      if (existing) { await DB.updateMilestone(AppState.user.uid, existing.id, data); toast('Milestone updated.', 'success'); }
      else           { await DB.addMilestone(AppState.user.uid, data);                 toast('Milestone created.', 'success'); }
      _close();
    } catch(e) {
      console.error('Milestone save error:', e);
      toast('Error: ' + e.message, 'error');
      btn.disabled = false; btn.textContent = existing ? 'Save Changes' : 'Create Milestone';
    }
  });
}

// ─────────────────────────────────────────────
// SETTINGS PAGE
// ─────────────────────────────────────────────
export function renderSettings() {
  const p = AppState.profile || {};
  const accounts = AppState.accounts;
  const CURRENCIES = ['USD','EUR','GBP','NGN','JPY','AUD','CAD','CHF','USDT','ZAR','BTC'];
  const ACCT_COLORS = ['#00d4ff','#8b5cf6','#00e676','#ffd060','#ff3d57','#ff9f43','#54a0ff'];
  const SYM = {USD:'$',EUR:'€',GBP:'£',NGN:'₦',JPY:'¥',AUD:'A$',CAD:'C$',CHF:'Fr',USDT:'T$',ZAR:'R',BTC:'₿'};

  return `
<div class="page-wrapper page-enter">
  <div class="page-header"><div class="page-title">Settings</div><div class="page-subtitle">Account preferences and configuration</div></div>
  <div style="max-width:680px;display:flex;flex-direction:column;gap:0;">

    <!-- ACCOUNTS -->
    <div class="settings-section">
      <div class="settings-section-title">Trading Accounts</div>
      <div id="settings-accounts-list" style="display:flex;flex-direction:column;gap:8px;margin-bottom:14px;">
        ${accounts.map(a => {
          const color = ACCT_COLORS[a.colorIndex??0];
          const sym   = SYM[a.currency]||'$';
          const isAct = a.id === (p.activeAccountId || accounts[0]?.id);
          return `
            <div style="display:flex;align-items:center;gap:12px;padding:12px 14px;background:var(--glass);border:1px solid ${isAct?'rgba(0,212,255,0.25)':'var(--glass-border)'};border-radius:var(--radius);">
              <div style="width:10px;height:10px;border-radius:50%;background:${color};flex-shrink:0;"></div>
              <div style="flex:1;min-width:0;">
                <div style="font-size:13px;font-weight:600;color:var(--text);">${a.name} ${isAct?'<span style="font-size:10px;color:var(--cyan);font-weight:400;">(active)</span>':''}</div>
                <div style="font-size:11px;color:var(--text-3);">${a.broker||'No broker'} · ${a.currency} · ${sym}${(a.balance||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}</div>
              </div>
              <div style="display:flex;gap:6px;flex-shrink:0;">
                ${!isAct?`<button class="btn-secondary" style="padding:4px 10px;font-size:11px;" data-switch-acct="${a.id}">Switch</button>`:''}
                <button class="btn-secondary" style="padding:4px 10px;font-size:11px;" data-edit-acct="${a.id}">Edit</button>
                ${accounts.length>1?`<button class="btn-danger" style="padding:4px 10px;font-size:11px;" data-del-acct="${a.id}">Delete</button>`:''}
              </div>
            </div>`;
        }).join('')}
      </div>
      <button class="btn-secondary" id="settings-add-acct" style="width:fit-content;">
        <svg viewBox="0 0 14 14" fill="none" width="12" style="margin-right:6px;"><line x1="7" y1="2" x2="7" y2="12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><line x1="2" y1="7" x2="12" y2="7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
        Add Account
      </button>
    </div>

    <!-- PROFILE -->
    <div class="settings-section">
      <div class="settings-section-title">Profile</div>
      <div class="settings-row">
        <div class="settings-row-info"><div class="settings-row-label">Display Name</div></div>
        <input class="form-input settings-input" id="set-name" value="${p.displayName||''}" placeholder="Trader">
      </div>
      <div class="settings-row">
        <div class="settings-row-info"><div class="settings-row-label">Risk % Per Trade</div><div class="settings-row-desc">Target risk shown in Risk Analysis</div></div>
        <input class="form-input settings-input" type="number" id="set-risk" value="${p.riskPerTrade||1}" min="0.1" step="0.1">
      </div>
      <div style="margin-top:16px;">
        <button class="btn-primary" id="save-profile-btn" style="width:fit-content;">Save Profile</button>
      </div>
    </div>

    <!-- DISCIPLINE RULES -->
    <div class="settings-section">
      <div class="settings-section-title">Discipline Rules</div>
      <div id="rules-settings-list" class="rules-list" style="margin-bottom:10px;"></div>
      <div class="add-rule-row">
        <input class="form-input" id="settings-rule-inp" placeholder="Add a rule...">
        <button class="btn-secondary" id="settings-add-rule" style="white-space:nowrap;">Add Rule</button>
      </div>
      <div style="margin-top:12px;">
        <button class="btn-secondary" id="save-rules-btn" style="width:fit-content;">Save Rules</button>
      </div>
    </div>

    <!-- DATA -->
    <div class="settings-section">
      <div class="settings-section-title">Data</div>
      <div class="settings-row">
        <div class="settings-row-info"><div class="settings-row-label">Export All Data</div><div class="settings-row-desc">Download a full JSON backup of your data</div></div>
        <button class="btn-secondary" id="export-json-btn">Export JSON</button>
      </div>
    </div>

  </div>
</div>`;
}

export function initSettings() {
  let rules = [...(AppState.profile?.disciplineRules || [])];

  function _refreshRulesList() {
    const list = document.getElementById('rules-settings-list');
    if (!list) return;
    if (!rules.length) { list.innerHTML = '<div style="font-size:12px;color:var(--text-3);">No rules defined.</div>'; return; }
    list.innerHTML = rules.map((r,i) => `
      <div class="rule-item">
        <span class="rule-text">${r}</span>
        <button class="rule-delete" data-ri="${i}"><svg viewBox="0 0 14 14" fill="none" width="13"><line x1="1" y1="1" x2="13" y2="13" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><line x1="13" y1="1" x2="1" y2="13" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></button>
      </div>`).join('');
    list.querySelectorAll('.rule-delete').forEach(b => b.addEventListener('click', () => { rules.splice(parseInt(b.dataset.ri),1); _refreshRulesList(); }));
  }
  _refreshRulesList();

  document.getElementById('settings-add-rule')?.addEventListener('click', () => {
    const inp = document.getElementById('settings-rule-inp');
    const v   = inp?.value.trim(); if(!v) return;
    rules.push(v); inp.value=''; _refreshRulesList();
  });
  document.getElementById('settings-rule-inp')?.addEventListener('keydown', e => { if(e.key==='Enter'){e.preventDefault();document.getElementById('settings-add-rule')?.click();} });

  document.getElementById('settings-add-acct')?.addEventListener('click', () => openModal('add-account'));

  document.querySelectorAll('[data-edit-acct]').forEach(b => b.addEventListener('click', () => openModal('edit-account', b.dataset.editAcct)));
  document.querySelectorAll('[data-switch-acct]').forEach(b => b.addEventListener('click', async () => {
    await DB.updateProfile(AppState.user.uid, { activeAccountId: b.dataset.switchAcct });
    toast('Account switched.', 'success');
  }));
  document.querySelectorAll('[data-del-acct]').forEach(b => b.addEventListener('click', async () => {
    const acct = AppState.accounts.find(a=>a.id===b.dataset.delAcct);
    if (!acct || !confirm(`Delete "${acct.name}"?`)) return;
    await DB.deleteAccount(AppState.user.uid, acct.id);
    if (AppState.profile?.activeAccountId === acct.id) {
      const other = AppState.accounts.find(a=>a.id!==acct.id);
      if (other) await DB.updateProfile(AppState.user.uid, { activeAccountId: other.id });
    }
    toast('Account deleted.', 'info');
  }));

  document.getElementById('save-profile-btn')?.addEventListener('click', async () => {
    const btn = document.getElementById('save-profile-btn');
    btn.disabled=true; btn.textContent='Saving...';
    try {
      await DB.updateProfile(AppState.user.uid, {
        displayName:  document.getElementById('set-name')?.value.trim() || 'Trader',
        riskPerTrade: parseFloat(document.getElementById('set-risk')?.value) || 1
      });
      toast('Profile saved.', 'success');
    } catch(e) { toast(e.message, 'error'); }
    btn.disabled=false; btn.textContent='Save Profile';
  });

  document.getElementById('save-rules-btn')?.addEventListener('click', async () => {
    const btn = document.getElementById('save-rules-btn');
    btn.disabled=true; btn.textContent='Saving...';
    try {
      await DB.updateProfile(AppState.user.uid, { disciplineRules: rules });
      toast('Rules saved.', 'success');
    } catch(e) { toast(e.message, 'error'); }
    btn.disabled=false; btn.textContent='Save Rules';
  });

  document.getElementById('export-json-btn')?.addEventListener('click', () => {
    const data = JSON.stringify({ trades: AppState.trades, profile: AppState.profile, accounts: AppState.accounts, playbook: AppState.playbook, reviews: AppState.reviews, milestones: AppState.milestones }, null, 2);
    const blob = new Blob([data],{type:'application/json'});
    const url  = URL.createObjectURL(blob);
    const a    = Object.assign(document.createElement('a'),{href:url,download:'velqor-journal-backup.json'});
    a.click(); URL.revokeObjectURL(url);
    toast('Data exported.', 'success');
  });
}

// ─────────────────────────────────────────────
// EDIT RULES MODAL
// ─────────────────────────────────────────────
export function renderEditRulesModal() {
  const rules = AppState.profile?.disciplineRules || [];
  return `
<div class="modal-header">
  <span class="modal-title">Trading Rules</span>
  <button class="modal-close" id="m-close"><svg viewBox="0 0 14 14" fill="none"><line x1="1" y1="1" x2="13" y2="13" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="13" y1="1" x2="1" y2="13" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></button>
</div>
<div class="modal-body">
  <div id="er-rules-list" class="rules-list" style="margin-bottom:10px;"></div>
  <div class="add-rule-row">
    <input class="form-input" id="er-new-rule" placeholder="New rule...">
    <button class="btn-secondary" id="er-add-btn">Add</button>
  </div>
</div>
<div class="modal-footer">
  <button class="btn-secondary" id="m-cancel">Cancel</button>
  <button class="btn-primary"   id="er-save-btn">Save Rules</button>
</div>`;
}

export function initEditRulesModal() {
  let rules = [...(AppState.profile?.disciplineRules || [])];
  document.getElementById('m-close')?.addEventListener('click', _close);
  document.getElementById('m-cancel')?.addEventListener('click', _close);

  function _refresh() {
    const list = document.getElementById('er-rules-list');
    if (!list) return;
    list.innerHTML = rules.map((r,i)=>`<div class="rule-item"><span class="rule-text">${r}</span><button class="rule-delete" data-i="${i}"><svg viewBox="0 0 14 14" fill="none" width="13"><line x1="1" y1="1" x2="13" y2="13" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><line x1="13" y1="1" x2="1" y2="13" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></button></div>`).join('');
    list.querySelectorAll('.rule-delete').forEach(b => b.addEventListener('click',()=>{rules.splice(parseInt(b.dataset.i),1);_refresh();}));
  }
  _refresh();

  document.getElementById('er-add-btn')?.addEventListener('click',()=>{ const inp=document.getElementById('er-new-rule'); const v=inp?.value.trim(); if(!v)return; rules.push(v); inp.value=''; _refresh(); });
  document.getElementById('er-save-btn')?.addEventListener('click', async ()=>{
    const btn=document.getElementById('er-save-btn'); btn.disabled=true; btn.textContent='Saving...';
    try{ await DB.updateProfile(AppState.user.uid,{disciplineRules:rules}); toast('Rules saved.','success'); _close(); }
    catch(e){ toast(e.message,'error'); btn.disabled=false; btn.textContent='Save Rules'; }
  });
}
