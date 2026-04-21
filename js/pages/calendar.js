// VELQOR JOURNAL — Calendar Page
import { AppState, openModal } from '../app.js';
import { fmt, fmtDate, toDate, computeMetrics } from '../utils.js';

let _calYear  = new Date().getFullYear();
let _calMonth = new Date().getMonth(); // 0-indexed

export function renderCalendar() {
  return `
<div class="page-wrapper page-enter">
  <div class="page-header page-header-row">
    <div>
      <div class="page-title">Calendar</div>
      <div class="page-subtitle">Daily trading activity at a glance</div>
    </div>
    <button class="btn-primary" id="cal-add-trade">
      <svg viewBox="0 0 16 16" width="14" height="14" fill="none"><line x1="8" y1="2" x2="8" y2="14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="2" y1="8" x2="14" y2="8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
      Log Trade
    </button>
  </div>

  <div id="calendar-root"></div>
</div>`;
}

export function initCalendar() {
  document.getElementById('cal-add-trade')?.addEventListener('click', () => openModal('add-trade'));
  _buildCalendar();
}

function _buildCalendar() {
  const root = document.getElementById('calendar-root');
  if (!root) return;

  const { trades, profile } = AppState;
  const currency = profile?.currency || 'USD';

  // Build day map for this month
  const dayMap = {};
  trades.forEach(t => {
    const d = toDate(t.date);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    if (!dayMap[key]) dayMap[key] = [];
    dayMap[key].push(t);
  });

  // Month summary stats
  const monthTrades = trades.filter(t => {
    const d = toDate(t.date);
    return d.getFullYear() === _calYear && d.getMonth() === _calMonth;
  });
  const monthM = computeMetrics(monthTrades);

  // Previous year trades for year-over-year
  const prevYearTrades = trades.filter(t => {
    const d = toDate(t.date);
    return d.getFullYear() === _calYear - 1 && d.getMonth() === _calMonth;
  });
  const prevPnl = prevYearTrades.reduce((s, t) => s + (t.pnl || 0), 0);

  const monthName = new Date(_calYear, _calMonth, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  // All months in this year for sparkline bar
  const yearMonthPnls = Array.from({ length: 12 }, (_, mi) => {
    const t = trades.filter(x => { const d = toDate(x.date); return d.getFullYear() === _calYear && d.getMonth() === mi; });
    return { month: mi, pnl: t.reduce((s, x) => s + (x.pnl || 0), 0), trades: t.length };
  });
  const maxAbsMonth = Math.max(1, ...yearMonthPnls.map(m => Math.abs(m.pnl)));

  root.innerHTML = `
    <!-- Month navigation + stats strip -->
    <div class="cal-header-strip glass" style="border-radius:var(--radius-lg);padding:20px 24px;margin-bottom:20px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:16px;">
      <div style="display:flex;align-items:center;gap:16px;">
        <button class="cal-nav-btn" id="cal-prev" aria-label="Previous month">
          <svg viewBox="0 0 16 16" fill="none" width="16" height="16"><polyline points="10,3 5,8 10,13" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
        <div>
          <div style="font-family:'Syne',sans-serif;font-size:20px;font-weight:700;color:var(--text);">${monthName}</div>
          <div style="font-size:12px;color:var(--text-3);margin-top:2px;">${monthTrades.length} trade${monthTrades.length===1?'':'s'} this month</div>
        </div>
        <button class="cal-nav-btn" id="cal-next" aria-label="Next month">
          <svg viewBox="0 0 16 16" fill="none" width="16" height="16"><polyline points="6,3 11,8 6,13" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
        <button class="cal-nav-btn" id="cal-today" style="font-size:12px;font-weight:600;padding:6px 12px;border-radius:7px;color:var(--cyan);border:1px solid rgba(0,212,255,0.3);">Today</button>
      </div>
      <div style="display:flex;gap:28px;flex-wrap:wrap;">
        <div>
          <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.1em;color:var(--text-3);margin-bottom:3px;">Month P&L</div>
          <div style="font-family:'DM Mono',monospace;font-size:20px;font-weight:500;color:${monthM.netPnl>=0?'var(--green)':'var(--red)'};">${monthM.netPnl>=0?'+':''}${fmt(monthM.netPnl,currency)}</div>
        </div>
        <div>
          <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.1em;color:var(--text-3);margin-bottom:3px;">Win Rate</div>
          <div style="font-family:'DM Mono',monospace;font-size:20px;font-weight:500;color:var(--text);">${monthM.winRate}%</div>
        </div>
        <div>
          <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.1em;color:var(--text-3);margin-bottom:3px;">Best Day</div>
          <div style="font-family:'DM Mono',monospace;font-size:20px;font-weight:500;color:var(--green);">${_getBestDay(monthTrades, currency)}</div>
        </div>
        <div>
          <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.1em;color:var(--text-3);margin-bottom:3px;">Worst Day</div>
          <div style="font-family:'DM Mono',monospace;font-size:20px;font-weight:500;color:var(--red);">${_getWorstDay(monthTrades, currency)}</div>
        </div>
      </div>
    </div>

    <!-- Year mini-bar sparkline -->
    <div class="card" style="margin-bottom:20px;">
      <div class="card-header"><span class="card-title">${_calYear} Monthly Overview</span></div>
      <div class="card-body" style="padding:16px 20px;">
        <div style="display:flex;gap:4px;align-items:flex-end;height:52px;">
          ${yearMonthPnls.map((m, i) => {
            const isActive = i === _calMonth;
            const heightPct = Math.max(4, (Math.abs(m.pnl) / maxAbsMonth) * 100);
            const color = m.pnl > 0 ? 'var(--green)' : m.pnl < 0 ? 'var(--red)' : 'rgba(255,255,255,0.1)';
            const monthLabel = new Date(_calYear, i, 1).toLocaleDateString('en-US',{month:'short'});
            return `
              <div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;cursor:pointer;" class="year-month-bar" data-mi="${i}">
                <div style="width:100%;display:flex;align-items:flex-end;justify-content:center;height:40px;">
                  <div style="width:70%;height:${heightPct}%;background:${color};border-radius:3px 3px 0 0;opacity:${isActive?1:0.55};transition:opacity 0.2s;box-shadow:${isActive?`0 0 8px ${color}`:''};"></div>
                </div>
                <div style="font-size:10px;color:${isActive?'var(--cyan)':'var(--text-3)'};font-weight:${isActive?700:400};">${monthLabel}</div>
              </div>`;
          }).join('')}
        </div>
      </div>
    </div>

    <!-- Calendar grid -->
    <div class="card">
      <div id="cal-grid-wrap"></div>
    </div>
  `;

  _renderGrid(dayMap, currency);

  // Nav events
  document.getElementById('cal-prev')?.addEventListener('click', () => {
    _calMonth--;
    if (_calMonth < 0) { _calMonth = 11; _calYear--; }
    _buildCalendar();
  });
  document.getElementById('cal-next')?.addEventListener('click', () => {
    _calMonth++;
    if (_calMonth > 11) { _calMonth = 0; _calYear++; }
    _buildCalendar();
  });
  document.getElementById('cal-today')?.addEventListener('click', () => {
    _calYear  = new Date().getFullYear();
    _calMonth = new Date().getMonth();
    _buildCalendar();
  });
  document.querySelectorAll('.year-month-bar').forEach(el => {
    el.addEventListener('click', () => {
      _calMonth = parseInt(el.dataset.mi);
      _buildCalendar();
    });
  });
}

function _renderGrid(dayMap, currency) {
  const wrap = document.getElementById('cal-grid-wrap');
  if (!wrap) return;

  const firstDay = new Date(_calYear, _calMonth, 1);
  const lastDay  = new Date(_calYear, _calMonth + 1, 0);
  const today    = new Date();

  // Start grid from Monday
  let startDow = firstDay.getDay(); // 0=Sun
  startDow = startDow === 0 ? 6 : startDow - 1; // convert to Mon=0

  const DAY_HEADERS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const totalCells  = Math.ceil((startDow + lastDay.getDate()) / 7) * 7;

  // Build weeks for summary column
  const weeks = [];
  let currentWeek = [];
  let dayOffset = 0;

  for (let i = 0; i < totalCells; i++) {
    const dayNum = i - startDow + 1;
    const isValid = dayNum >= 1 && dayNum <= lastDay.getDate();
    const date    = isValid ? new Date(_calYear, _calMonth, dayNum) : null;
    const key     = date ? `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}` : null;
    const dayTrades = (key && dayMap[key]) ? dayMap[key] : [];
    const dayPnl  = dayTrades.reduce((s, t) => s + (t.pnl || 0), 0);
    const isToday = date && date.toDateString() === today.toDateString();
    currentWeek.push({ dayNum, isValid, date, dayTrades, dayPnl, isToday });

    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  }

  // Max abs pnl for color intensity
  const allDayPnls = Object.values(dayMap).map(arr => Math.abs(arr.reduce((s,t)=>s+(t.pnl||0),0)));
  const maxDayPnl  = Math.max(1, ...allDayPnls);

  const gridHTML = `
    <div style="overflow-x:auto;">
      <div style="min-width:660px;">
        <!-- Header row -->
        <div style="display:grid;grid-template-columns:repeat(7,1fr) 120px;border-bottom:1px solid var(--glass-border);">
          ${DAY_HEADERS.map(d => `
            <div style="padding:12px 14px;font-size:11px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:var(--text-3);text-align:center;">${d}</div>`).join('')}
          <div style="padding:12px 14px;font-size:11px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:var(--text-3);text-align:center;border-left:1px solid var(--glass-border);">Week</div>
        </div>

        <!-- Weeks -->
        ${weeks.map(week => {
          const weekTrades = week.flatMap(d => d.dayTrades);
          const weekPnl    = weekTrades.reduce((s,t)=>s+(t.pnl||0),0);
          const weekWins   = weekTrades.filter(t=>t.result==='win').length;
          const weekWR     = weekTrades.length ? Math.round(weekWins/weekTrades.length*100) : null;
          return `
            <div style="display:grid;grid-template-columns:repeat(7,1fr) 120px;border-bottom:1px solid rgba(255,255,255,0.04);">
              ${week.map(cell => _renderDayCell(cell, maxDayPnl, currency)).join('')}
              <!-- Week summary -->
              <div style="border-left:1px solid var(--glass-border);padding:12px 14px;display:flex;flex-direction:column;justify-content:center;gap:4px;background:rgba(0,0,0,0.15);">
                ${weekTrades.length > 0 ? `
                  <div style="font-size:11px;color:var(--text-3);">${weekTrades.length} trade${weekTrades.length===1?'':'s'}</div>
                  <div style="font-family:'DM Mono',monospace;font-size:14px;font-weight:500;color:${weekPnl>=0?'var(--green)':'var(--red)'};">${weekPnl>=0?'+':''}${fmt(weekPnl,currency)}</div>
                  ${weekWR !== null ? `<div style="font-size:10px;color:var(--text-3);">${weekWR}% WR</div>` : ''}
                ` : `<div style="font-size:11px;color:rgba(255,255,255,0.08);">—</div>`}
              </div>
            </div>`;
        }).join('')}
      </div>
    </div>`;

  wrap.innerHTML = gridHTML;

  // Click on day to open a day detail modal
  wrap.querySelectorAll('.cal-day-cell[data-day-key]').forEach(el => {
    el.addEventListener('click', () => {
      const key   = el.dataset.dayKey;
      const trades = dayMap[key] || [];
      if (trades.length === 0) return;
      _openDayModal(key, trades, currency);
    });
  });
}

function _renderDayCell(cell, maxDayPnl, currency) {
  const { dayNum, isValid, date, dayTrades, dayPnl, isToday } = cell;

  if (!isValid) {
    return `<div style="min-height:90px;padding:10px;border-right:1px solid rgba(255,255,255,0.03);background:rgba(0,0,0,0.1);"></div>`;
  }

  const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
  const hasTrades = dayTrades.length > 0;
  const wins  = dayTrades.filter(t => t.result === 'win').length;
  const losses = dayTrades.filter(t => t.result === 'loss').length;
  const intensity = hasTrades ? Math.min(0.45, 0.05 + (Math.abs(dayPnl) / maxDayPnl) * 0.45) : 0;
  const bgColor   = hasTrades ? (dayPnl >= 0 ? `rgba(0,230,118,${intensity})` : `rgba(255,61,87,${intensity})`) : 'transparent';
  const borderColor = isToday ? 'var(--cyan)' : 'rgba(255,255,255,0.03)';
  const isWeekend = date.getDay() === 0 || date.getDay() === 6;
  const isFuture  = date > new Date();

  return `
    <div class="cal-day-cell ${hasTrades?'has-trades':''} ${isWeekend?'weekend':''}"
      data-day-key="${hasTrades?key:''}"
      style="
        min-height:90px; padding:10px 12px;
        border-right:1px solid rgba(255,255,255,0.03);
        background:${bgColor};
        border-top:2px solid ${isToday?'var(--cyan)':'transparent'};
        cursor:${hasTrades?'pointer':'default'};
        transition:background 0.2s;
        position:relative;
        ${isFuture?'opacity:0.45':''}
      ">
      <!-- Day number -->
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
        <span style="
          font-size:13px; font-weight:${isToday?700:400};
          color:${isToday?'var(--cyan)':isWeekend?'var(--text-3)':'var(--text-2)'};
          ${isToday?`background:var(--cyan-dim);width:22px;height:22px;display:flex;align-items:center;justify-content:center;border-radius:50%;font-size:12px;`:''}
        ">${dayNum}</span>
        ${hasTrades ? `<span style="font-size:10px;font-weight:600;color:${dayPnl>=0?'var(--green)':'var(--red)'};background:${dayPnl>=0?'rgba(0,230,118,0.12)':'rgba(255,61,87,0.12)'};padding:1px 5px;border-radius:4px;">${dayTrades.length}</span>` : ''}
      </div>
      <!-- P&L -->
      ${hasTrades ? `
        <div style="font-family:'DM Mono',monospace;font-size:13px;font-weight:500;color:${dayPnl>=0?'var(--green)':'var(--red)'};margin-bottom:4px;">
          ${dayPnl>=0?'+':''}${fmt(dayPnl, currency)}
        </div>
        <!-- Win/loss dots -->
        <div style="display:flex;gap:3px;flex-wrap:wrap;margin-top:auto;">
          ${dayTrades.map(t => `
            <div title="${t.symbol||''} ${t.result||''}" style="width:7px;height:7px;border-radius:50%;background:${t.result==='win'?'var(--green)':t.result==='loss'?'var(--red)':'var(--amber)'};opacity:0.85;flex-shrink:0;"></div>`).join('')}
        </div>
      ` : ''}
    </div>`;
}

function _openDayModal(key, trades, currency) {
  const [y, m, d] = key.split('-').map(Number);
  const dateStr = new Date(y, m, d).toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric', year:'numeric' });
  const dayPnl  = trades.reduce((s, t) => s + (t.pnl || 0), 0);
  const wins    = trades.filter(t => t.result === 'win').length;
  const losses  = trades.filter(t => t.result === 'loss').length;

  const bg     = document.getElementById('modal-bg');
  const box    = document.getElementById('modal-box');
  if (!bg || !box) return;

  box.innerHTML = `
    <div class="modal-header">
      <div>
        <div class="modal-title">${dateStr}</div>
        <div style="font-size:12px;color:var(--text-3);margin-top:2px;">${trades.length} trade${trades.length===1?'':'s'} · ${wins}W ${losses}L</div>
      </div>
      <button class="modal-close" id="day-modal-close">
        <svg viewBox="0 0 14 14" fill="none"><line x1="1" y1="1" x2="13" y2="13" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="13" y1="1" x2="1" y2="13" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
      </button>
    </div>
    <div class="modal-body">
      <div style="display:flex;align-items:center;gap:16px;padding:14px 16px;background:${dayPnl>=0?'rgba(0,230,118,0.06)':'rgba(255,61,87,0.06)'};border-radius:var(--radius);border:1px solid ${dayPnl>=0?'rgba(0,230,118,0.2)':'rgba(255,61,87,0.2)'};margin-bottom:20px;">
        <div style="font-family:'DM Mono',monospace;font-size:28px;font-weight:500;color:${dayPnl>=0?'var(--green)':'var(--red)'};">${dayPnl>=0?'+':''}${fmt(dayPnl,currency)}</div>
        <div style="font-size:13px;color:var(--text-2);">Day P&L · ${Math.round(wins/trades.length*100)}% win rate</div>
      </div>
      <div style="display:flex;flex-direction:column;gap:10px;">
        ${trades.map(t => `
          <div style="padding:14px;background:var(--glass);border:1px solid var(--glass-border);border-radius:var(--radius);display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;">
            <div style="display:flex;align-items:center;gap:10px;">
              <span style="font-family:'Syne',sans-serif;font-size:14px;font-weight:700;color:var(--text);">${t.symbol||'—'}</span>
              <span class="badge ${t.direction==='long'?'badge-long':'badge-short'}">${t.direction||'—'}</span>
              <span class="badge ${t.result==='win'?'badge-win':t.result==='loss'?'badge-loss':'badge-be'}">${t.result||'—'}</span>
            </div>
            <div style="display:flex;align-items:center;gap:16px;">
              <span style="font-family:'DM Mono',monospace;font-size:15px;color:${(t.pnl||0)>=0?'var(--green)':'var(--red)'};">${(t.pnl||0)>=0?'+':''}${fmt(t.pnl||0,currency)}</span>
              <span style="font-family:'DM Mono',monospace;font-size:13px;color:${(t.rMultiple||0)>=0?'var(--green)':'var(--red)'};">${t.rMultiple!=null?(t.rMultiple>=0?'+':'')+t.rMultiple+'R':'—'}</span>
              <span style="font-size:12px;color:var(--text-3);">${t.time||''}</span>
            </div>
          </div>`).join('')}
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn-secondary" id="day-modal-close-2">Close</button>
    </div>
  `;

  bg.style.display = 'flex';
  const close = () => { bg.style.display = 'none'; };
  document.getElementById('day-modal-close')?.addEventListener('click', close);
  document.getElementById('day-modal-close-2')?.addEventListener('click', close);
  bg.addEventListener('click', e => { if (e.target === bg) close(); });
}

function _getBestDay(trades, currency) {
  if (!trades.length) return '—';
  const dayMap = {};
  trades.forEach(t => {
    const d = toDate(t.date);
    const k = d.toDateString();
    dayMap[k] = (dayMap[k] || 0) + (t.pnl || 0);
  });
  const best = Math.max(...Object.values(dayMap));
  return best > 0 ? '+' + fmt(best, currency) : '—';
}

function _getWorstDay(trades, currency) {
  if (!trades.length) return '—';
  const dayMap = {};
  trades.forEach(t => {
    const d = toDate(t.date);
    const k = d.toDateString();
    dayMap[k] = (dayMap[k] || 0) + (t.pnl || 0);
  });
  const worst = Math.min(...Object.values(dayMap));
  return worst < 0 ? fmt(worst, currency) : '—';
}
