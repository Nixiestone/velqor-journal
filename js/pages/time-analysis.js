// VELQOR JOURNAL — Time Analysis Page
import { AppState, openModal, getActiveTrades, getCurrency, closeModal } from '../app.js';
import { fmt, fmtR, computeMetrics, getBySession, getByDayOfWeek, getByHour, groupByPeriod, colorForValue } from '../utils.js';
import { Charts } from '../charts.js';

export function renderTimeAnalysis() {
  return `
<div class="page-wrapper page-enter">
  <div class="page-header">
    <div class="page-title">Time Analysis</div>
    <div class="page-subtitle">Identify your best and worst trading windows</div>
  </div>
  <div id="time-content"></div>
</div>`;
}

export function initTimeAnalysis() {
  const trades   = getActiveTrades();
  const currency = getCurrency();
  const content  = document.getElementById('time-content');
  if (!content) return;

  const sessions = getBySession(trades);
  const byDay    = getByDayOfWeek(trades);
  const byHour   = getByHour(trades);
  const monthGrp = groupByPeriod(trades, 'month');

  // Best session
  const bestSession = Object.entries(sessions).sort((a,b)=>b[1].pnl-a[1].pnl)[0];
  const bestDay     = [...byDay].sort((a,b)=>b.pnl-a.pnl)[0];
  const bestHour    = [...byHour].filter(h=>h.trades>0).sort((a,b)=>b.pnl-a.pnl)[0];

  content.innerHTML = `
    <!-- Summary stat cards -->
    <div class="stats-grid" style="margin-bottom:24px;">
      <div class="stat-card" style="--accent:var(--cyan)">
        <div class="stat-label">Best Session</div>
        <div class="stat-value" style="font-size:18px;color:var(--cyan);">${bestSession?bestSession[0]:'—'}</div>
        <div class="stat-change">${bestSession?fmt(bestSession[1].pnl,currency)+' · '+bestSession[1].trades+' trades':'No data'}</div>
      </div>
      <div class="stat-card" style="--accent:var(--green)">
        <div class="stat-label">Best Day of Week</div>
        <div class="stat-value" style="font-size:18px;color:var(--green);">${bestDay?.pnl>0?bestDay.day:'—'}</div>
        <div class="stat-change">${bestDay?.trades?fmt(bestDay.pnl,currency)+' · '+bestDay.trades+' trades':'No data'}</div>
      </div>
      <div class="stat-card" style="--accent:var(--amber)">
        <div class="stat-label">Best Hour (UTC)</div>
        <div class="stat-value" style="font-size:18px;color:var(--amber);">${bestHour?String(bestHour.hour).padStart(2,'0')+':00':'—'}</div>
        <div class="stat-change">${bestHour?fmt(bestHour.pnl,currency)+' · '+bestHour.trades+' trades':'No data'}</div>
      </div>
    </div>

    <!-- Session + Day charts -->
    <div class="grid-2" style="margin-bottom:24px;">
      <div class="card">
        <div class="card-header"><span class="card-title">P&amp;L by Session</span></div>
        <div class="card-body"><div class="chart-wrap" style="height:220px;"><canvas id="time-session"></canvas></div></div>
      </div>
      <div class="card">
        <div class="card-header"><span class="card-title">P&amp;L by Day of Week</span></div>
        <div class="card-body"><div class="chart-wrap" style="height:220px;"><canvas id="time-dow"></canvas></div></div>
      </div>
    </div>

    <!-- Hour heatmap -->
    <div class="card" style="margin-bottom:24px;">
      <div class="card-header"><span class="card-title">Hourly P&amp;L Heatmap</span><span class="text-dim" style="font-size:12px;">UTC</span></div>
      <div class="card-body">
        <div id="hour-heatmap"></div>
      </div>
    </div>

    <!-- Session detail table -->
    <div class="card">
      <div class="card-header"><span class="card-title">Session Breakdown</span></div>
      <div class="card-body-pad">
        <table>
          <thead><tr><th>Session</th><th>Trades</th><th>Win Rate</th><th>Net P&L</th><th>Avg P&L/Trade</th></tr></thead>
          <tbody>
            ${Object.entries(sessions).filter(([,v])=>v.trades>0).sort((a,b)=>b[1].pnl-a[1].pnl).map(([s,d]) => `
              <tr>
                <td style="font-weight:600;color:var(--text);">${s}</td>
                <td class="td-mono">${d.trades}</td>
                <td class="td-mono">${d.trades?Math.round(d.wins/d.trades*100):0}%</td>
                <td class="td-mono ${d.pnl>=0?'text-green':'text-red'}">${d.pnl>=0?'+':''}${fmt(d.pnl,currency)}</td>
                <td class="td-mono ${d.pnl>=0?'text-green':'text-red'}">${d.trades?fmt(d.pnl/d.trades,currency):'—'}</td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;

  Charts.sessionBar('time-session', sessions);
  Charts.dayOfWeekBar('time-dow', byDay);
  _buildHourHeatmap(byHour, currency);
}

function _buildHourHeatmap(byHour, currency) {
  const wrap = document.getElementById('hour-heatmap');
  if (!wrap) return;
  const maxAbs = Math.max(1, ...byHour.filter(h=>h.trades>0).map(h=>Math.abs(h.pnl)));
  const cells = byHour.map(h => {
    const bg = h.trades > 0 ? colorForValue(h.pnl, maxAbs) : 'rgba(255,255,255,0.02)';
    const textColor = h.trades > 0 ? (h.pnl>=0?'var(--green)':'var(--red)') : 'var(--text-3)';
    return `
      <div title="${h.hour}:00 UTC — ${h.trades} trades, ${fmt(h.pnl,currency)}" style="
        padding:10px 6px;border-radius:6px;background:${bg};text-align:center;cursor:default;
        transition:transform 0.2s;border:1px solid rgba(255,255,255,0.04);">
        <div style="font-size:10px;color:var(--text-3);margin-bottom:3px;">${String(h.hour).padStart(2,'0')}</div>
        ${h.trades > 0 ? `
          <div style="font-size:11px;font-family:'DM Mono',monospace;color:${textColor};">${h.pnl>=0?'+':''}${Math.round(h.pnl)}</div>
          <div style="font-size:9px;color:var(--text-3);">${h.trades}t</div>` : ''}
      </div>`;
  }).join('');
  wrap.innerHTML = `
    <div style="display:grid;grid-template-columns:repeat(12,1fr);gap:4px;">${cells.slice(0,12)}</div>
    <div style="display:grid;grid-template-columns:repeat(12,1fr);gap:4px;margin-top:4px;">${cells.slice(12,24)}</div>
    <div style="display:flex;align-items:center;justify-content:space-between;margin-top:10px;font-size:11px;color:var(--text-3);">
      <span>00:00</span><span style="color:var(--red);">Loss</span>
      <div style="flex:1;height:3px;margin:0 8px;background:linear-gradient(90deg,var(--red),rgba(255,255,255,0.1),var(--green));border-radius:2px;"></div>
      <span style="color:var(--green);">Profit</span><span>23:00</span>
    </div>`;
}
