// VELQOR JOURNAL — Playbook, Review, Milestones, Settings

import { AppState, openModal, toast } from '../app.js';
import { DB } from '../db.js';
import { fmt, fmtDate, fmtR, computeMetrics, generateId, toDate } from '../utils.js';

// ===================== PLAYBOOK =====================
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
  const grid    = document.getElementById('playbook-grid');
  if (!grid) return;
  const { playbook, trades, profile } = AppState;
  const currency = profile?.currency || 'USD';
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
    const sTrades = trades.filter(t => t.setupId === s.id);
    const m = computeMetrics(sTrades);
    return `
      <div class="playbook-card" data-setup-id="${s.id}">
        <div style="display:flex;align-items:start;justify-content:space-between;margin-bottom:6px;">
          <div class="playbook-card-name">${s.name}</div>
          <div style="display:flex;gap:4px;">
            <button class="btn-secondary" style="padding:4px 10px;font-size:11px;" data-edit-setup="${s.id}">Edit</button>
            <button class="btn-danger"    style="padding:4px 10px;font-size:11px;" data-delete-setup="${s.id}">Del</button>
          </div>
        </div>
        <div class="playbook-card-desc">${s.description||'No description'}</div>
        ${s.rules?.length ? `
          <div style="margin-bottom:12px;">
            <div style="font-size:10px;text-transform:uppercase;letter-spacing:0.08em;color:var(--text-3);margin-bottom:6px;">Entry Rules</div>
            <ul style="padding-left:16px;font-size:12px;color:var(--text-2);line-height:1.7;">
              ${s.rules.map(r=>`<li>${r}</li>`).join('')}
            </ul>
          </div>` : ''}
        <div style="border-top:1px solid var(--glass-border);padding-top:12px;">
          <div style="font-size:10px;text-transform:uppercase;letter-spacing:0.08em;color:var(--text-3);margin-bottom:8px;">Performance (${sTrades.length} trades)</div>
          <div class="playbook-stats">
            <div class="playbook-stat"><span class="playbook-stat-label">Win Rate</span><span class="playbook-stat-value">${m.winRate}%</span></div>
            <div class="playbook-stat"><span class="playbook-stat-label">Avg R</span><span class="playbook-stat-value ${m.avgR>=0?'text-green':'text-red'}">${fmtR(m.avgR)}</span></div>
            <div class="playbook-stat"><span class="playbook-stat-label">Net P&L</span><span class="playbook-stat-value ${m.netPnl>=0?'text-green':'text-red'}">${fmt(m.netPnl,currency)}</span></div>
            <div class="playbook-stat"><span class="playbook-stat-label">PF</span><span class="playbook-stat-value">${m.profitFactor===999?'∞':m.profitFactor}</span></div>
          </div>
        </div>
      </div>`;
  }).join('');

  grid.querySelectorAll('[data-edit-setup]').forEach(btn => {
    btn.addEventListener('click', e => { e.stopPropagation(); openModal('add-setup', btn.dataset.editSetup); });
  });
  grid.querySelectorAll('[data-delete-setup]').forEach(btn => {
    btn.addEventListener('click', async e => {
      e.stopPropagation();
      if (!confirm('Delete this setup?')) return;
      await DB.deleteSetup(AppState.user.uid, btn.dataset.deleteSetup);
      toast('Setup deleted.', 'info');
    });
  });
}

export function renderAddSetupModal(setupId = null) {
  const s = setupId ? AppState.playbook.find(x=>x.id===setupId) : null;
  const rules = s?.rules || [];
  return `
<div class="modal-header">
  <span class="modal-title">${s?'Edit Setup':'New Setup'}</span>
  <button class="modal-close" id="modal-close-btn"><svg viewBox="0 0 14 14" fill="none"><line x1="1" y1="1" x2="13" y2="13" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="13" y1="1" x2="1" y2="13" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></button>
</div>
<div class="modal-body">
  <div class="form-section">
    <div class="form-group">
      <label class="form-label">Setup Name</label>
      <input class="form-input" id="setup-name" placeholder="e.g. London Breakout" value="${s?.name||''}">
    </div>
    <div class="form-group mt-16">
      <label class="form-label">Description</label>
      <textarea class="form-input" id="setup-desc" rows="3" placeholder="Describe the setup, market conditions, timeframe…">${s?.description||''}</textarea>
    </div>
  </div>
  <div class="form-section">
    <div class="form-section-title">Entry Rules</div>
    <div id="setup-rules-list" class="rules-list">
      ${rules.map((r,i) => `
        <div class="rule-item">
          <span class="rule-text">${r}</span>
          <button class="rule-delete" data-rule-idx="${i}" title="Remove">
            <svg viewBox="0 0 14 14" fill="none" width="14"><line x1="1" y1="1" x2="13" y2="13" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><line x1="13" y1="1" x2="1" y2="13" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
          </button>
        </div>`).join('')}
    </div>
    <div class="add-rule-row">
      <input class="form-input" id="new-rule-input" placeholder="Add entry rule…">
      <button class="btn-secondary" id="add-rule-btn" style="white-space:nowrap;">Add Rule</button>
    </div>
  </div>
  <div class="form-group">
    <label class="form-label">Preferred Timeframe</label>
    <input class="form-input" id="setup-tf" placeholder="H1, H4…" value="${s?.timeframe||''}">
  </div>
</div>
<div class="modal-footer">
  <button class="btn-secondary" id="modal-cancel-btn">Cancel</button>
  <button class="btn-primary" id="setup-submit-btn">${s?'Save':'Create Setup'}</button>
</div>`;
}

export function initAddSetupModal(setupId = null) {
  const existing = setupId ? AppState.playbook.find(x=>x.id===setupId) : null;
  let rules = [...(existing?.rules||[])];
  const close = () => { document.getElementById('modal-bg').style.display='none'; };
  document.getElementById('modal-close-btn')?.addEventListener('click', close);
  document.getElementById('modal-cancel-btn')?.addEventListener('click', close);
  document.getElementById('modal-bg')?.addEventListener('click', e => { if(e.target===document.getElementById('modal-bg'))close(); });

  function refreshRules() {
    const list = document.getElementById('setup-rules-list');
    if (!list) return;
    list.innerHTML = rules.map((r,i) => `
      <div class="rule-item">
        <span class="rule-text">${r}</span>
        <button class="rule-delete" data-rule-idx="${i}"><svg viewBox="0 0 14 14" fill="none" width="14"><line x1="1" y1="1" x2="13" y2="13" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><line x1="13" y1="1" x2="1" y2="13" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></button>
      </div>`).join('');
    list.querySelectorAll('.rule-delete').forEach(btn => {
      btn.addEventListener('click', () => { rules.splice(parseInt(btn.dataset.ruleIdx),1); refreshRules(); });
    });
  }
  refreshRules();

  document.getElementById('add-rule-btn')?.addEventListener('click', () => {
    const inp = document.getElementById('new-rule-input');
    const val = inp?.value.trim();
    if (!val) return;
    rules.push(val); inp.value=''; refreshRules();
  });
  document.getElementById('new-rule-input')?.addEventListener('keydown', e => {
    if (e.key==='Enter') { e.preventDefault(); document.getElementById('add-rule-btn')?.click(); }
  });

  document.getElementById('setup-submit-btn')?.addEventListener('click', async () => {
    const name = document.getElementById('setup-name')?.value.trim();
    if (!name) { toast('Setup name required.','error'); return; }
    const data = {
      name,
      description: document.getElementById('setup-desc')?.value.trim() || '',
      rules,
      timeframe: document.getElementById('setup-tf')?.value.trim() || ''
    };
    try {
      if (existing) await DB.updateSetup(AppState.user.uid, existing.id, data);
      else          await DB.addSetup(AppState.user.uid, data);
      toast(existing?'Setup updated.':'Setup created.','success');
      close();
    } catch(e) { toast(e.message,'error'); }
  });
}

// ===================== REVIEW =====================
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
  const { reviews, profile } = AppState;
  const currency = profile?.currency || 'USD';
  if (!reviews.length) {
    body.innerHTML = `
      <div class="empty-state" style="padding:60px;">
        <svg class="empty-icon" viewBox="0 0 40 40" fill="none" width="48" height="48"><rect x="5" y="7" width="30" height="26" rx="2" stroke="currentColor" stroke-width="1.5"/><line x1="5" y1="13" x2="35" y2="13" stroke="currentColor" stroke-width="1.5"/><line x1="12" y1="7" x2="12" y2="3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="28" y1="7" x2="28" y2="3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
        <div class="empty-title">No reviews yet</div>
        <div class="empty-desc">Write your first weekly or monthly review</div>
      </div>`;
    return;
  }
  const weeks  = reviews.filter(r=>r.type==='weekly').sort((a,b)=>toDate(b.startDate)-toDate(a.startDate));
  const months = reviews.filter(r=>r.type==='monthly').sort((a,b)=>toDate(b.startDate)-toDate(a.startDate));

  const renderGroup = (list, label) => list.length ? `
    <div style="margin-bottom:28px;">
      <div style="font-size:12px;text-transform:uppercase;letter-spacing:0.12em;font-weight:600;color:var(--text-3);margin-bottom:14px;">${label}</div>
      <div style="display:flex;flex-direction:column;gap:12px;">
        ${list.map(r => {
          const tradePeriod = AppState.trades.filter(t => {
            const d = toDate(t.date);
            return d >= toDate(r.startDate) && d <= toDate(r.endDate);
          });
          const m = computeMetrics(tradePeriod);
          return `
            <div class="review-card">
              <div style="display:flex;align-items:start;justify-content:space-between;flex-wrap:wrap;gap:8px;">
                <div>
                  <div class="review-period">${r.type==='weekly'?'Weekly':'Monthly'} Review</div>
                  <div class="review-dates">${fmtDate(r.startDate)} — ${fmtDate(r.endDate)}</div>
                </div>
                <div style="display:flex;gap:6px;">
                  <div class="review-score"><span class="review-score-num">${r.score||'—'}</span><span class="review-score-label">/10 score</span></div>
                  <button class="btn-danger" style="padding:5px 10px;font-size:11px;" data-delete-review="${r.id}">Delete</button>
                </div>
              </div>
              <div class="review-stats" style="margin-top:14px;">
                <div class="review-stat"><span class="review-stat-val ${m.netPnl>=0?'text-green':'text-red'}">${m.netPnl>=0?'+':''}${fmt(m.netPnl,currency)}</span><span class="review-stat-lbl">P&L</span></div>
                <div class="review-stat"><span class="review-stat-val">${m.totalTrades}</span><span class="review-stat-lbl">Trades</span></div>
                <div class="review-stat"><span class="review-stat-val">${m.winRate}%</span><span class="review-stat-lbl">Win Rate</span></div>
                <div class="review-stat"><span class="review-stat-val ${m.avgR>=0?'text-green':'text-red'}">${fmtR(m.avgR)}</span><span class="review-stat-lbl">Avg R</span></div>
              </div>
              ${r.keyLessons ? `<div style="margin-top:12px;"><div style="font-size:10px;text-transform:uppercase;letter-spacing:0.08em;color:var(--text-3);margin-bottom:5px;">Key Lessons</div><div style="font-size:13px;color:var(--text-2);line-height:1.6;">${r.keyLessons}</div></div>` : ''}
              ${r.improvements ? `<div style="margin-top:10px;"><div style="font-size:10px;text-transform:uppercase;letter-spacing:0.08em;color:var(--cyan);margin-bottom:5px;">Improvements</div><div style="font-size:13px;color:var(--text-2);line-height:1.6;">${r.improvements}</div></div>` : ''}
            </div>`;
        }).join('')}
      </div>
    </div>` : '';

  body.innerHTML = renderGroup(months, 'Monthly Reviews') + renderGroup(weeks, 'Weekly Reviews');
  body.querySelectorAll('[data-delete-review]').forEach(btn => {
    btn.addEventListener('click', async e => {
      e.stopPropagation();
      if (!confirm('Delete this review?')) return;
      await DB.deleteReview(AppState.user.uid, btn.dataset.deleteReview);
      toast('Review deleted.','info');
    });
  });
}

export function renderAddReviewModal() {
  const today = new Date().toISOString().split('T')[0];
  const weekAgo = new Date(Date.now()-7*864e5).toISOString().split('T')[0];
  return `
<div class="modal-header">
  <span class="modal-title">New Review</span>
  <button class="modal-close" id="modal-close-btn"><svg viewBox="0 0 14 14" fill="none"><line x1="1" y1="1" x2="13" y2="13" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="13" y1="1" x2="1" y2="13" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></button>
</div>
<div class="modal-body">
  <div class="form-grid-2">
    <div class="form-group">
      <label class="form-label">Type</label>
      <select class="form-input form-select" id="rv-type"><option value="weekly">Weekly</option><option value="monthly">Monthly</option></select>
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
    <label class="form-label">Key Lessons</label>
    <textarea class="form-input" id="rv-lessons" rows="3" placeholder="What did you learn this period?"></textarea>
  </div>
  <div class="form-group mt-16">
    <label class="form-label">What to Improve</label>
    <textarea class="form-input" id="rv-improve" rows="2" placeholder="Specific things to work on next period…"></textarea>
  </div>
  <div class="form-group mt-16">
    <label class="form-label">What Went Well</label>
    <textarea class="form-input" id="rv-good" rows="2" placeholder="Strengths to maintain…"></textarea>
  </div>
</div>
<div class="modal-footer">
  <button class="btn-secondary" id="modal-cancel-btn">Cancel</button>
  <button class="btn-primary" id="review-submit-btn">Save Review</button>
</div>`;
}

export function initAddReviewModal() {
  const close = () => { document.getElementById('modal-bg').style.display='none'; };
  document.getElementById('modal-close-btn')?.addEventListener('click', close);
  document.getElementById('modal-cancel-btn')?.addEventListener('click', close);
  document.getElementById('modal-bg')?.addEventListener('click', e=>{ if(e.target===document.getElementById('modal-bg'))close(); });
  document.getElementById('review-submit-btn')?.addEventListener('click', async () => {
    const startDate = document.getElementById('rv-start')?.value;
    const endDate   = document.getElementById('rv-end')?.value;
    if (!startDate||!endDate) { toast('Dates required.','error'); return; }
    await DB.addReview(AppState.user.uid, {
      type:        document.getElementById('rv-type')?.value||'weekly',
      score:       parseInt(document.getElementById('rv-score')?.value)||null,
      startDate:   DB.toTimestamp(startDate),
      endDate:     DB.toTimestamp(endDate),
      overall:     document.getElementById('rv-overall')?.value.trim()||'',
      keyLessons:  document.getElementById('rv-lessons')?.value.trim()||'',
      improvements:document.getElementById('rv-improve')?.value.trim()||'',
      wentWell:    document.getElementById('rv-good')?.value.trim()||''
    });
    toast('Review saved.','success'); close();
  });
}

// ===================== MILESTONES =====================
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
  <div id="ms-grid"></div>
</div>`;
}

export function initMilestones() {
  document.getElementById('ms-add-btn')?.addEventListener('click', () => openModal('add-milestone'));
  _renderMilestoneGrid();
}

function _getMilestoneProgress(ms) {
  const { trades, profile } = AppState;
  switch (ms.type) {
    case 'balance': return { current: profile?.accountBalance||0, target: ms.target };
    case 'trades':  return { current: trades.length, target: ms.target };
    case 'winrate': {
      const m = computeMetrics(trades);
      return { current: m.winRate, target: ms.target };
    }
    case 'pnl':     return { current: trades.reduce((s,t)=>s+(t.pnl||0),0), target: ms.target };
    case 'streak':  {
      let best=0,cur=0;
      [...trades].sort((a,b)=>toDate(a.date)-toDate(b.date)).forEach(t=>{
        if(t.result==='win'){cur++;best=Math.max(best,cur);}else cur=0;
      });
      return { current: best, target: ms.target };
    }
    default: return { current: ms.current||0, target: ms.target||100 };
  }
}

function _renderMilestoneGrid() {
  const grid = document.getElementById('ms-grid');
  if (!grid) return;
  const { milestones, profile } = AppState;
  const currency = profile?.currency||'USD';
  if (!milestones.length) {
    grid.innerHTML = `
      <div class="empty-state" style="padding:60px;">
        <svg class="empty-icon" viewBox="0 0 40 40" fill="none" width="48" height="48"><polygon points="20,3 24,13 35,15 27,23 29,34 20,29 11,34 13,23 5,15 16,13" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" fill="none"/></svg>
        <div class="empty-title">No milestones yet</div>
        <div class="empty-desc">Set goals to keep yourself motivated and on track</div>
      </div>`;
    return;
  }
  grid.innerHTML = `<div class="milestones-grid">${milestones.map(ms => {
    const { current, target } = _getMilestoneProgress(ms);
    const pct      = Math.min(100, target > 0 ? (current/target*100) : 0);
    const achieved = ms.achieved || pct >= 100;
    const displayCurrent = ['balance','pnl'].includes(ms.type) ? fmt(current,currency) : current.toFixed(ms.type==='winrate'?1:0);
    const displayTarget  = ['balance','pnl'].includes(ms.type) ? fmt(target,currency)  : target+(ms.type==='winrate'?'%':'');
    return `
      <div class="milestone-card ${achieved?'achieved':''}">
        <div class="milestone-top">
          <div>
            <div class="milestone-title">${ms.title}</div>
            <div class="milestone-type">${ms.type?.toUpperCase()||'CUSTOM'} GOAL</div>
          </div>
          <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px;">
            ${achieved ? `<span class="milestone-badge-achieved"><svg viewBox="0 0 14 14" fill="none" width="12"><polyline points="2,7 5.5,10.5 12,3.5" stroke="var(--green)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg> Achieved</span>` : ''}
            <div style="display:flex;gap:4px;">
              <button class="btn-secondary" style="padding:3px 8px;font-size:11px;" data-edit-ms="${ms.id}">Edit</button>
              <button class="btn-danger"    style="padding:3px 8px;font-size:11px;" data-delete-ms="${ms.id}">Del</button>
            </div>
          </div>
        </div>
        <div style="font-size:13px;color:var(--text-2);margin-bottom:14px;">${ms.description||''}</div>
        <div class="milestone-progress-bar">
          <div class="milestone-progress-fill ${achieved?'achieved':''}" style="width:${pct}%;"></div>
        </div>
        <div class="milestone-progress-text">
          <span>${displayCurrent}</span>
          <span>${Math.round(pct)}%</span>
          <span>${displayTarget}</span>
        </div>
        ${ms.targetDate ? `<div style="margin-top:8px;font-size:11px;color:var(--text-3);">Target: ${fmtDate(ms.targetDate)}</div>` : ''}
      </div>`;
  }).join('')}</div>`;

  grid.querySelectorAll('[data-delete-ms]').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Delete this milestone?')) return;
      await DB.deleteMilestone(AppState.user.uid, btn.dataset.deleteMs);
      toast('Milestone deleted.','info');
    });
  });
  grid.querySelectorAll('[data-edit-ms]').forEach(btn => {
    btn.addEventListener('click', () => openModal('add-milestone', btn.dataset.editMs));
  });
}

export function renderAddMilestoneModal(msId = null) {
  const ms = msId ? AppState.milestones.find(x=>x.id===msId) : null;
  const today = new Date().toISOString().split('T')[0];
  return `
<div class="modal-header">
  <span class="modal-title">${ms?'Edit Milestone':'New Milestone'}</span>
  <button class="modal-close" id="modal-close-btn"><svg viewBox="0 0 14 14" fill="none"><line x1="1" y1="1" x2="13" y2="13" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="13" y1="1" x2="1" y2="13" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></button>
</div>
<div class="modal-body">
  <div class="form-group mb-16">
    <label class="form-label">Title</label>
    <input class="form-input" id="ms-title" placeholder="e.g. Reach $25,000 balance" value="${ms?.title||''}">
  </div>
  <div class="form-group mb-16">
    <label class="form-label">Description</label>
    <textarea class="form-input" id="ms-desc" rows="2" placeholder="Context or motivation…">${ms?.description||''}</textarea>
  </div>
  <div class="form-grid-2">
    <div class="form-group">
      <label class="form-label">Milestone Type</label>
      <select class="form-input form-select" id="ms-type">
        <option value="balance"  ${ms?.type==='balance'?'selected':''}>Account Balance</option>
        <option value="pnl"      ${ms?.type==='pnl'?'selected':''}>Total P&L</option>
        <option value="trades"   ${ms?.type==='trades'?'selected':''}>Trade Count</option>
        <option value="winrate"  ${ms?.type==='winrate'?'selected':''}>Win Rate (%)</option>
        <option value="streak"   ${ms?.type==='streak'?'selected':''}>Win Streak</option>
        <option value="custom"   ${ms?.type==='custom'?'selected':''}>Custom</option>
      </select>
    </div>
    <div class="form-group">
      <label class="form-label">Target Value</label>
      <input class="form-input" type="number" id="ms-target" placeholder="25000" value="${ms?.target||''}">
    </div>
    <div class="form-group">
      <label class="form-label">Target Date (optional)</label>
      <input class="form-input" type="date" id="ms-date" value="${ms?.targetDate?(ms.targetDate?.toDate?.()??new Date(ms.targetDate)).toISOString().split('T')[0]:today}">
    </div>
  </div>
</div>
<div class="modal-footer">
  <button class="btn-secondary" id="modal-cancel-btn">Cancel</button>
  <button class="btn-primary"   id="ms-submit-btn">${ms?'Save':'Create'}</button>
</div>`;
}

export function initAddMilestoneModal(msId = null) {
  const existing = msId ? AppState.milestones.find(x=>x.id===msId) : null;
  const close = () => { document.getElementById('modal-bg').style.display='none'; };
  document.getElementById('modal-close-btn')?.addEventListener('click', close);
  document.getElementById('modal-cancel-btn')?.addEventListener('click', close);
  document.getElementById('modal-bg')?.addEventListener('click', e=>{ if(e.target===document.getElementById('modal-bg'))close(); });
  document.getElementById('ms-submit-btn')?.addEventListener('click', async () => {
    const title  = document.getElementById('ms-title')?.value.trim();
    const target = parseFloat(document.getElementById('ms-target')?.value);
    if (!title) { toast('Title required.','error'); return; }
    if (isNaN(target)) { toast('Target value required.','error'); return; }
    const dateVal = document.getElementById('ms-date')?.value;
    const data = {
      title,
      description: document.getElementById('ms-desc')?.value.trim()||'',
      type:        document.getElementById('ms-type')?.value||'custom',
      target,
      targetDate:  dateVal ? DB.toTimestamp(dateVal) : null,
      achieved:    existing?.achieved||false
    };
    try {
      if (existing) await DB.updateMilestone(AppState.user.uid, existing.id, data);
      else          await DB.addMilestone(AppState.user.uid, data);
      toast(existing?'Milestone updated.':'Milestone created.','success');
      close();
    } catch(e) { toast(e.message,'error'); }
  });
}

// ===================== SETTINGS =====================
export function renderSettings() {
  const { profile } = AppState;
  const p = profile || {};
  const CURRENCIES = ['USD','EUR','GBP','NGN','JPY','AUD','CAD'];
  return `
<div class="page-wrapper page-enter">
  <div class="page-header">
    <div class="page-title">Settings</div>
    <div class="page-subtitle">Account preferences and configuration</div>
  </div>
  <div style="max-width:640px;">

    <div class="settings-section">
      <div class="settings-section-title">Account</div>
      <div class="settings-row">
        <div class="settings-row-info"><div class="settings-row-label">Display Name</div><div class="settings-row-desc">Your name shown in the journal</div></div>
        <input class="form-input settings-input" id="set-name" value="${p.displayName||''}" placeholder="Trader">
      </div>
      <div class="settings-row">
        <div class="settings-row-info"><div class="settings-row-label">Starting Balance</div><div class="settings-row-desc">Used to calculate returns</div></div>
        <input class="form-input settings-input" type="number" id="set-starting" value="${p.startingBalance||10000}" min="0">
      </div>
      <div class="settings-row">
        <div class="settings-row-info"><div class="settings-row-label">Current Balance</div><div class="settings-row-desc">Your current account balance</div></div>
        <input class="form-input settings-input" type="number" id="set-balance" value="${p.accountBalance||0}" min="0">
      </div>
      <div class="settings-row">
        <div class="settings-row-info"><div class="settings-row-label">Currency</div><div class="settings-row-desc">Display currency for P&L</div></div>
        <select class="form-input settings-input form-select" id="set-currency">
          ${CURRENCIES.map(c=>`<option value="${c}" ${p.currency===c?'selected':''}>${c}</option>`).join('')}
        </select>
      </div>
      <div class="settings-row">
        <div class="settings-row-info"><div class="settings-row-label">Default Risk % Per Trade</div><div class="settings-row-desc">Shown in risk analysis</div></div>
        <input class="form-input settings-input" type="number" id="set-risk" value="${p.riskPerTrade||1}" min="0.1" step="0.1">
      </div>
      <div style="margin-top:16px;">
        <button class="btn-primary" id="save-settings-btn" style="width:fit-content;">Save Changes</button>
      </div>
    </div>

    <div class="settings-section">
      <div class="settings-section-title">Discipline Rules</div>
      <div id="rules-list-settings" class="rules-list">
        ${(p.disciplineRules||[]).map((r,i) => `
          <div class="rule-item">
            <span class="rule-text">${r}</span>
            <button class="rule-delete" data-rule-idx="${i}"><svg viewBox="0 0 14 14" fill="none" width="14"><line x1="1" y1="1" x2="13" y2="13" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><line x1="13" y1="1" x2="1" y2="13" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></button>
          </div>`).join('')}
      </div>
      <div class="add-rule-row">
        <input class="form-input" id="new-setting-rule" placeholder="Add rule…">
        <button class="btn-secondary" id="add-setting-rule" style="white-space:nowrap;">Add</button>
      </div>
    </div>

    <div class="settings-section">
      <div class="settings-section-title">Danger Zone</div>
      <div class="settings-row">
        <div class="settings-row-info"><div class="settings-row-label" style="color:var(--red);">Export All Data</div><div class="settings-row-desc">Download your trades as JSON</div></div>
        <button class="btn-secondary" id="export-btn" style="white-space:nowrap;">Export JSON</button>
      </div>
    </div>
  </div>
</div>`;
}

export function initSettings() {
  let rules = [...(AppState.profile?.disciplineRules||[])];

  function refreshSettingRules() {
    const list = document.getElementById('rules-list-settings');
    if (!list) return;
    list.innerHTML = rules.map((r,i) => `
      <div class="rule-item">
        <span class="rule-text">${r}</span>
        <button class="rule-delete" data-rule-idx="${i}"><svg viewBox="0 0 14 14" fill="none" width="14"><line x1="1" y1="1" x2="13" y2="13" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><line x1="13" y1="1" x2="1" y2="13" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></button>
      </div>`).join('');
    list.querySelectorAll('.rule-delete').forEach(btn => {
      btn.addEventListener('click', () => { rules.splice(parseInt(btn.dataset.ruleIdx),1); refreshSettingRules(); });
    });
  }
  refreshSettingRules();

  document.getElementById('add-setting-rule')?.addEventListener('click', () => {
    const inp = document.getElementById('new-setting-rule');
    const val = inp?.value.trim(); if (!val) return;
    rules.push(val); inp.value=''; refreshSettingRules();
  });

  document.getElementById('save-settings-btn')?.addEventListener('click', async () => {
    try {
      await DB.updateProfile(AppState.user.uid, {
        displayName:     document.getElementById('set-name')?.value.trim()||'Trader',
        startingBalance: parseFloat(document.getElementById('set-starting')?.value)||10000,
        accountBalance:  parseFloat(document.getElementById('set-balance')?.value)||0,
        currency:        document.getElementById('set-currency')?.value||'USD',
        riskPerTrade:    parseFloat(document.getElementById('set-risk')?.value)||1,
        disciplineRules: rules
      });
      toast('Settings saved.','success');
    } catch(e) { toast(e.message,'error'); }
  });

  document.getElementById('export-btn')?.addEventListener('click', () => {
    const data = JSON.stringify({ trades: AppState.trades, profile: AppState.profile, playbook: AppState.playbook }, null, 2);
    const blob = new Blob([data], {type:'application/json'});
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a'); a.href=url; a.download='velqor-journal.json'; a.click();
    URL.revokeObjectURL(url);
    toast('Data exported.','success');
  });
}

// ===================== EDIT RULES MODAL =====================
export function renderEditRulesModal() {
  const rules = AppState.profile?.disciplineRules||[];
  return `
<div class="modal-header">
  <span class="modal-title">Trading Rules</span>
  <button class="modal-close" id="modal-close-btn"><svg viewBox="0 0 14 14" fill="none"><line x1="1" y1="1" x2="13" y2="13" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="13" y1="1" x2="1" y2="13" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></button>
</div>
<div class="modal-body">
  <div id="er-rules-list" class="rules-list">
    ${rules.map((r,i)=>`<div class="rule-item"><span class="rule-text">${r}</span><button class="rule-delete" data-rule-idx="${i}"><svg viewBox="0 0 14 14" fill="none" width="14"><line x1="1" y1="1" x2="13" y2="13" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><line x1="13" y1="1" x2="1" y2="13" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></button></div>`).join('')}
  </div>
  <div class="add-rule-row">
    <input class="form-input" id="er-new-rule" placeholder="New rule…">
    <button class="btn-secondary" id="er-add-btn">Add</button>
  </div>
</div>
<div class="modal-footer">
  <button class="btn-secondary" id="modal-cancel-btn">Cancel</button>
  <button class="btn-primary" id="er-save-btn">Save</button>
</div>`;
}

export function initEditRulesModal() {
  let rules = [...(AppState.profile?.disciplineRules||[])];
  const close = () => { document.getElementById('modal-bg').style.display='none'; };
  document.getElementById('modal-close-btn')?.addEventListener('click', close);
  document.getElementById('modal-cancel-btn')?.addEventListener('click', close);
  document.getElementById('modal-bg')?.addEventListener('click', e=>{ if(e.target===document.getElementById('modal-bg'))close(); });

  function refresh() {
    const list = document.getElementById('er-rules-list');
    if (!list) return;
    list.innerHTML = rules.map((r,i)=>`<div class="rule-item"><span class="rule-text">${r}</span><button class="rule-delete" data-rule-idx="${i}"><svg viewBox="0 0 14 14" fill="none" width="14"><line x1="1" y1="1" x2="13" y2="13" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><line x1="13" y1="1" x2="1" y2="13" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></button></div>`).join('');
    list.querySelectorAll('.rule-delete').forEach(btn => {
      btn.addEventListener('click', () => { rules.splice(parseInt(btn.dataset.ruleIdx),1); refresh(); });
    });
  }
  refresh();
  document.getElementById('er-add-btn')?.addEventListener('click',()=>{
    const inp=document.getElementById('er-new-rule'); const v=inp?.value.trim(); if(!v)return;
    rules.push(v); inp.value=''; refresh();
  });
  document.getElementById('er-save-btn')?.addEventListener('click', async ()=>{
    await DB.updateProfile(AppState.user.uid,{disciplineRules:rules});
    toast('Rules saved.','success'); close();
  });
}
