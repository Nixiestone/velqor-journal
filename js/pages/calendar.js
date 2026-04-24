// VELQOR JOURNAL — Enhanced Calendar
import { AppState, openModal, getActiveTrades, getCurrency } from '../app.js';
import { fmt, toDate, computeMetrics } from '../utils.js';

let _year  = new Date().getFullYear();
let _month = new Date().getMonth();

export function renderCalendar() {
  return `
<div class="page-wrapper page-enter">
  <div class="page-header page-header-row">
    <div>
      <div class="page-title">Calendar</div>
      <div class="page-subtitle">Daily trading activity — click any day to view trades</div>
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
  const root     = document.getElementById('calendar-root');
  if (!root) return;
  const trades   = getActiveTrades();
  const currency = getCurrency();

  // Build day map
  const dayMap = {};
  trades.forEach(t => {
    const d   = toDate(t.date);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    if (!dayMap[key]) dayMap[key] = [];
    dayMap[key].push(t);
  });

  // Month trades
  const mTrades = trades.filter(t => { const d=toDate(t.date); return d.getFullYear()===_year&&d.getMonth()===_month; });
  const m        = computeMetrics(mTrades);
  const mLabel   = new Date(_year,_month,1).toLocaleDateString('en-US',{month:'long',year:'numeric'});

  // Year monthly bars
  const yBars = Array.from({length:12},(_,i) => {
    const t = trades.filter(x=>{const d=toDate(x.date);return d.getFullYear()===_year&&d.getMonth()===i;});
    return { mi:i, pnl:t.reduce((s,x)=>s+(x.pnl||0),0), trades:t.length };
  });
  const maxBar = Math.max(1,...yBars.map(b=>Math.abs(b.pnl)));

  // Best/worst day
  const dayPnls = Object.entries(dayMap).filter(([k])=>{const[y,mo]=k.split('-');return +y===_year&&+mo===_month;}).map(([,t])=>t.reduce((s,x)=>s+(x.pnl||0),0));
  const bestDay  = dayPnls.length ? Math.max(...dayPnls) : 0;
  const worstDay = dayPnls.length ? Math.min(...dayPnls) : 0;
  const SYM = {USD:'$',EUR:'€',GBP:'£',NGN:'₦',JPY:'¥',AUD:'A$',CAD:'C$',CHF:'Fr',USDT:'T$',ZAR:'R',BTC:'₿'};
  const sym = SYM[currency]||'$';

  root.innerHTML = `
    <!-- Month header strip -->
    <div class="glass cal-header-strip" style="border-radius:var(--radius-lg);padding:20px 24px;margin-bottom:16px;">
      <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:16px;">
        <div style="display:flex;align-items:center;gap:12px;">
          <button class="cal-nav-btn" id="cal-prev" aria-label="Previous month"><svg viewBox="0 0 12 12" fill="none" width="14"><polyline points="8,2 4,6 8,10" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
          <div>
            <div style="font-family:'Syne',sans-serif;font-size:20px;font-weight:700;color:var(--text);">${mLabel}</div>
            <div style="font-size:12px;color:var(--text-3);margin-top:2px;">${mTrades.length} trade${mTrades.length===1?'':'s'}</div>
          </div>
          <button class="cal-nav-btn" id="cal-next" aria-label="Next month"><svg viewBox="0 0 12 12" fill="none" width="14"><polyline points="4,2 8,6 4,10" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
          <button class="cal-nav-btn" id="cal-today" style="font-size:11px;font-weight:600;padding:5px 12px;border-radius:6px;color:var(--cyan);border-color:rgba(0,212,255,0.3);">Today</button>
        </div>
        <div style="display:flex;gap:24px;flex-wrap:wrap;">
          <div><div style="font-size:10px;text-transform:uppercase;letter-spacing:0.1em;color:var(--text-3);margin-bottom:3px;">Month P&L</div><div style="font-family:'DM Mono',monospace;font-size:20px;font-weight:500;color:${m.netPnl>=0?'var(--green)':'var(--red)'};">${m.netPnl>=0?'+':''}${fmt(m.netPnl,currency)}</div></div>
          <div><div style="font-size:10px;text-transform:uppercase;letter-spacing:0.1em;color:var(--text-3);margin-bottom:3px;">Win Rate</div><div style="font-family:'DM Mono',monospace;font-size:20px;font-weight:500;color:var(--text);">${m.winRate}%</div></div>
          <div><div style="font-size:10px;text-transform:uppercase;letter-spacing:0.1em;color:var(--text-3);margin-bottom:3px;">Best Day</div><div style="font-family:'DM Mono',monospace;font-size:20px;font-weight:500;color:var(--green);">${bestDay>0?'+'+sym+bestDay.toFixed(0):'—'}</div></div>
          <div><div style="font-size:10px;text-transform:uppercase;letter-spacing:0.1em;color:var(--text-3);margin-bottom:3px;">Worst Day</div><div style="font-family:'DM Mono',monospace;font-size:20px;font-weight:500;color:var(--red);">${worstDay<0?sym+worstDay.toFixed(0):'—'}</div></div>
        </div>
      </div>
    </div>

    <!-- Year bar spark -->
    <div class="card" style="margin-bottom:16px;">
      <div class="card-header"><span class="card-title">${_year} — Monthly P&L</span><span style="font-size:11px;color:var(--text-3);">Click to jump to month</span></div>
      <div class="card-body" style="padding:12px 20px 16px;">
        <div style="display:flex;gap:3px;align-items:flex-end;height:56px;">
          ${yBars.map(b => {
            const h    = Math.max(4,(Math.abs(b.pnl)/maxBar)*100);
            const col  = b.pnl>0?'var(--green)':b.pnl<0?'var(--red)':'rgba(255,255,255,0.1)';
            const mon  = new Date(_year,b.mi,1).toLocaleDateString('en-US',{month:'short'});
            const isAct= b.mi===_month;
            return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:3px;cursor:pointer;" class="ybar-btn" data-mi="${b.mi}">
              <div style="width:100%;display:flex;align-items:flex-end;justify-content:center;height:40px;">
                <div style="width:80%;height:${h}%;background:${col};border-radius:3px 3px 0 0;opacity:${isAct?1:0.5};box-shadow:${isAct?`0 0 6px ${col}`:''};transition:all 0.2s;"></div>
              </div>
              <div style="font-size:10px;color:${isAct?'var(--cyan)':'var(--text-3)'};font-weight:${isAct?700:400};">${mon}</div>
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

  document.getElementById('cal-prev')?.addEventListener('click', () => { _month--; if(_month<0){_month=11;_year--;} _buildCalendar(); });
  document.getElementById('cal-next')?.addEventListener('click', () => { _month++; if(_month>11){_month=0;_year++;} _buildCalendar(); });
  document.getElementById('cal-today')?.addEventListener('click', () => { _year=new Date().getFullYear(); _month=new Date().getMonth(); _buildCalendar(); });
  root.querySelectorAll('.ybar-btn').forEach(el => el.addEventListener('click', () => { _month=parseInt(el.dataset.mi); _buildCalendar(); }));
}

function _renderGrid(dayMap, currency) {
  const wrap    = document.getElementById('cal-grid-wrap');
  if (!wrap) return;
  const first   = new Date(_year,_month,1);
  const last    = new Date(_year,_month+1,0);
  const today   = new Date();
  let startDow  = first.getDay(); startDow = startDow===0?6:startDow-1;
  const total   = Math.ceil((startDow+last.getDate())/7)*7;
  const DAYS    = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

  const allPnls = Object.values(dayMap).map(t=>Math.abs(t.reduce((s,x)=>s+(x.pnl||0),0)));
  const maxPnl  = Math.max(1,...allPnls);

  // Build weeks
  const weeks = [];
  let week = [];
  for (let i=0;i<total;i++) {
    const dn = i-startDow+1;
    const isValid = dn>=1&&dn<=last.getDate();
    const date = isValid ? new Date(_year,_month,dn) : null;
    const key  = date ? `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}` : null;
    const dTrades = (key&&dayMap[key])||[];
    week.push({ dn, isValid, date, dTrades, dayPnl:dTrades.reduce((s,t)=>s+(t.pnl||0),0), isToday:date&&date.toDateString()===today.toDateString(), isWeekend:date&&(date.getDay()===0||date.getDay()===6) });
    if (week.length===7) { weeks.push(week); week=[]; }
  }

  wrap.innerHTML = `<div style="overflow-x:auto;"><div style="min-width:660px;">
    <!-- Header -->
    <div style="display:grid;grid-template-columns:repeat(7,1fr) 130px;border-bottom:1px solid var(--glass-border);">
      ${DAYS.map(d=>`<div style="padding:10px 12px;font-size:10px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:var(--text-3);text-align:center;">${d}</div>`).join('')}
      <div style="padding:10px 12px;font-size:10px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:var(--text-3);text-align:center;border-left:1px solid var(--glass-border);">Week Summary</div>
    </div>
    <!-- Weeks -->
    ${weeks.map(wk => {
      const wTrades = wk.flatMap(c=>c.dTrades);
      const wPnl    = wTrades.reduce((s,t)=>s+(t.pnl||0),0);
      const wWins   = wTrades.filter(t=>t.result==='win').length;
      const wWR     = wTrades.length ? Math.round(wWins/wTrades.length*100) : null;
      const pfColor = wPnl>=0?'var(--green)':'var(--red)';
      return `<div style="display:grid;grid-template-columns:repeat(7,1fr) 130px;border-bottom:1px solid rgba(255,255,255,0.04);">
        ${wk.map(c=>_cell(c,maxPnl,currency)).join('')}
        <div style="border-left:1px solid var(--glass-border);padding:12px;background:rgba(0,0,0,0.12);display:flex;flex-direction:column;justify-content:center;gap:4px;">
          ${wTrades.length>0?`
            <div style="font-size:11px;color:var(--text-3);">${wTrades.length} trade${wTrades.length===1?'':'s'}</div>
            <div style="font-family:'DM Mono',monospace;font-size:13px;font-weight:600;color:${pfColor};">${wPnl>=0?'+':''}${fmt(wPnl,currency)}</div>
            ${wWR!==null?`<div style="font-size:10px;color:var(--text-3);">${wWR}% WR · ${wWins}W/${wTrades.length-wWins}L</div>`:''}
            <div style="display:flex;gap:2px;flex-wrap:wrap;margin-top:2px;">
              ${wTrades.slice(0,8).map(t=>`<div style="width:6px;height:6px;border-radius:50%;background:${t.result==='win'?'var(--green)':t.result==='loss'?'var(--red)':'var(--amber)'};opacity:0.8;"></div>`).join('')}
            </div>`
          :`<div style="font-size:10px;color:rgba(255,255,255,0.1);">No trades</div>`}
        </div>
      </div>`;
    }).join('')}
  </div></div>`;

  wrap.querySelectorAll('.cal-day[data-key]').forEach(el => {
    el.addEventListener('click', () => {
      const key = el.dataset.key; if(!key) return;
      const t   = dayMap[key]||[]; if(!t.length) return;
      _dayModal(key,t,currency);
    });
  });
}

function _cell(c, maxPnl, currency) {
  const {dn,isValid,date,dTrades,dayPnl,isToday,isWeekend} = c;
  if (!isValid) return `<div style="min-height:88px;background:rgba(0,0,0,0.06);border-right:1px solid rgba(255,255,255,0.03);"></div>`;
  const key  = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
  const has  = dTrades.length>0;
  const inten= has ? Math.min(0.5,0.05+(Math.abs(dayPnl)/maxPnl)*0.5) : 0;
  const bg   = has ? (dayPnl>=0?`rgba(0,230,118,${inten})`:`rgba(255,61,87,${inten})`) : 'transparent';
  const wins = dTrades.filter(t=>t.result==='win').length;
  const SYM  = {USD:'$',EUR:'€',GBP:'£',NGN:'₦',JPY:'¥',AUD:'A$',CAD:'C$',CHF:'Fr',USDT:'T$',ZAR:'R',BTC:'₿'};
  const sym  = SYM[currency]||'$';
  const pnlStr = has ? (dayPnl>=0?'+':'')+sym+(Math.abs(dayPnl)<1000?Math.abs(dayPnl).toFixed(0):Math.abs(dayPnl)>=1000?(Math.abs(dayPnl)/1000).toFixed(1)+'k':Math.abs(dayPnl).toFixed(0)) : '';
  const isFuture = date > new Date();
  return `
    <div class="cal-day ${has?'cal-day-active':''}"
      data-key="${has?key:''}"
      style="min-height:88px;padding:8px 10px;border-right:1px solid rgba(255,255,255,0.03);background:${bg};border-top:2px solid ${isToday?'var(--cyan)':'transparent'};cursor:${has?'pointer':'default'};transition:all 0.15s;${isWeekend?'opacity:0.7':''}${isFuture?';opacity:0.35':''};">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:5px;">
        <span style="font-size:12px;font-weight:${isToday?700:400};color:${isToday?'var(--cyan)':isWeekend?'var(--text-3)':'var(--text-2)'};${isToday?'background:var(--cyan-dim);width:20px;height:20px;display:flex;align-items:center;justify-content:center;border-radius:50%;font-size:11px;':''}">${dn}</span>
        ${has?`<span style="font-size:10px;font-weight:700;color:${dayPnl>=0?'var(--green)':'var(--red)'};background:${dayPnl>=0?'rgba(0,230,118,0.12)':'rgba(255,61,87,0.12)'};padding:1px 5px;border-radius:4px;">${dTrades.length}</span>`:''}
      </div>
      ${has?`
        <div style="font-family:'DM Mono',monospace;font-size:12px;font-weight:600;color:${dayPnl>=0?'var(--green)':'var(--red)'};">${pnlStr}</div>
        <div style="display:flex;gap:2px;flex-wrap:wrap;margin-top:4px;">
          ${dTrades.slice(0,6).map(t=>`<div title="${t.symbol||''} ${t.result||''}" style="width:6px;height:6px;border-radius:50%;background:${t.result==='win'?'var(--green)':t.result==='loss'?'var(--red)':'var(--amber)'};opacity:0.9;"></div>`).join('')}
          ${dTrades.length>6?`<span style="font-size:9px;color:var(--text-3);">+${dTrades.length-6}</span>`:''}
        </div>`:''}
    </div>`;
}

function _dayModal(key, trades, currency) {
  const [y,m,d] = key.split('-').map(Number);
  const dateStr  = new Date(y,m,d).toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric'});
  const dayPnl   = trades.reduce((s,t)=>s+(t.pnl||0),0);
  const wins     = trades.filter(t=>t.result==='win').length;
  const bg = document.getElementById('modal-bg');
  const box= document.getElementById('modal-box');
  if (!bg||!box) return;

  box.innerHTML = `
<div class="modal-header">
  <div>
    <div class="modal-title">${dateStr}</div>
    <div style="font-size:12px;color:var(--text-3);margin-top:2px;">${trades.length} trade${trades.length===1?'':'s'} · ${wins}W ${trades.length-wins}L</div>
  </div>
  <button class="modal-close" id="dm-close"><svg viewBox="0 0 14 14" fill="none"><line x1="1" y1="1" x2="13" y2="13" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="13" y1="1" x2="1" y2="13" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></button>
</div>
<div class="modal-body">
  <div style="display:flex;align-items:center;gap:16px;padding:14px 16px;background:${dayPnl>=0?'rgba(0,230,118,0.06)':'rgba(255,61,87,0.06)'};border-radius:var(--radius);border:1px solid ${dayPnl>=0?'rgba(0,230,118,0.2)':'rgba(255,61,87,0.2)'};margin-bottom:20px;">
    <div style="font-family:'DM Mono',monospace;font-size:28px;font-weight:500;color:${dayPnl>=0?'var(--green)':'var(--red)'};">${dayPnl>=0?'+':''}${fmt(dayPnl,currency)}</div>
    <div style="font-size:13px;color:var(--text-2);">${trades.length>0?Math.round(wins/trades.length*100):0}% win rate</div>
  </div>
  <div style="display:flex;flex-direction:column;gap:10px;">
    ${trades.map(t=>`
      <div style="padding:14px;background:var(--glass);border:1px solid var(--glass-border);border-radius:var(--radius);display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;">
        <div style="display:flex;align-items:center;gap:8px;">
          <span style="font-family:'Syne',sans-serif;font-size:14px;font-weight:700;color:var(--text);">${t.symbol||'—'}</span>
          <span class="badge ${t.direction==='long'?'badge-long':'badge-short'}">${t.direction||'—'}</span>
          <span class="badge ${t.result==='win'?'badge-win':t.result==='loss'?'badge-loss':'badge-be'}">${t.result||'—'}</span>
        </div>
        <div style="display:flex;align-items:center;gap:14px;">
          <span style="font-family:'DM Mono',monospace;font-size:15px;color:${(t.pnl||0)>=0?'var(--green)':'var(--red)'};">${(t.pnl||0)>=0?'+':''}${fmt(t.pnl||0,currency)}</span>
          <span style="font-family:'DM Mono',monospace;font-size:13px;color:${(t.rMultiple||0)>=0?'var(--green)':'var(--red)'};">${t.rMultiple!=null?(t.rMultiple>=0?'+':'')+t.rMultiple+'R':'—'}</span>
          <span style="font-size:12px;color:var(--text-3);">${t.session||''} · ${t.time||''}</span>
        </div>
      </div>`).join('')}
  </div>
</div>
<div class="modal-footer">
  <button class="btn-secondary" id="dm-close-2">Close</button>
  <button class="btn-primary" id="dm-add-trade">Log Another Trade</button>
</div>`;
  bg.style.display = 'flex';
  const close = () => { bg.style.display='none'; };
  document.getElementById('dm-close')?.addEventListener('click', close);
  document.getElementById('dm-close-2')?.addEventListener('click', close);
  document.getElementById('dm-add-trade')?.addEventListener('click', () => { close(); openModal('add-trade'); });
  bg.addEventListener('click', e=>{ if(e.target===bg) close(); });
}
