// VELQOR JOURNAL — Risk Analysis
import { AppState } from '../app.js';
import { fmt, fmtR, computeMetrics, computeDrawdownSeries, groupByPeriod } from '../utils.js';
import { Charts } from '../charts.js';

export function renderRiskAnalysis() {
  return `
<div class="page-wrapper page-enter">
  <div class="page-header">
    <div class="page-title">Risk Analysis</div>
    <div class="page-subtitle">Understand your risk exposure and position sizing</div>
  </div>
  <div id="risk-content"></div>
</div>`;
}

export function initRiskAnalysis() {
  const trades   = AppState.trades;
  const currency = AppState.profile?.currency || 'USD';
  const profile  = AppState.profile;
  const content  = document.getElementById('risk-content');
  if (!content) return;

  const m      = computeMetrics(trades);
  const ddSer  = computeDrawdownSeries(trades);
  const rTrades = trades.filter(t => t.rMultiple != null);
  const avgRisk = trades.filter(t=>t.riskPercent).reduce((s,t,_,a)=>s+t.riskPercent/a.length,0);
  const maxRisk = Math.max(0,...trades.filter(t=>t.riskPercent).map(t=>t.riskPercent));
  const oversized= trades.filter(t=>t.riskPercent && t.riskPercent > (profile?.riskPerTrade||1)*1.5).length;
  const rr      = m.avgWin > 0 && m.avgLoss < 0 ? Math.abs(m.avgWin/m.avgLoss).toFixed(2) : '—';

  content.innerHTML = `
    <div class="stats-grid" style="margin-bottom:24px;">
      <div class="stat-card" style="--accent:var(--red)">
        <div class="stat-label">Max Drawdown</div>
        <div class="stat-value mono negative">${m.maxDrawdownPct.toFixed(2)}%</div>
        <div class="stat-change">${fmt(m.maxDrawdown,currency)} from peak</div>
      </div>
      <div class="stat-card" style="--accent:var(--amber)">
        <div class="stat-label">Avg Risk/Trade</div>
        <div class="stat-value mono">${avgRisk.toFixed(2)}%</div>
        <div class="stat-change">Target: ${profile?.riskPerTrade||1}%</div>
      </div>
      <div class="stat-card" style="--accent:var(--red)">
        <div class="stat-label">Max Risk Taken</div>
        <div class="stat-value mono ${maxRisk>(profile?.riskPerTrade||1)*2?'negative':''}">${maxRisk.toFixed(2)}%</div>
        <div class="stat-change">${oversized} oversized trades</div>
      </div>
      <div class="stat-card" style="--accent:var(--green)">
        <div class="stat-label">Reward:Risk Ratio</div>
        <div class="stat-value mono">${rr}</div>
        <div class="stat-change">Avg win vs avg loss</div>
      </div>
      <div class="stat-card" style="--accent:var(--cyan)">
        <div class="stat-label">Avg Win R</div>
        <div class="stat-value mono positive">${fmtR(m.avgWinR)}</div>
        <div class="stat-change">on ${m.wins} wins</div>
      </div>
      <div class="stat-card" style="--accent:var(--red)">
        <div class="stat-label">Avg Loss R</div>
        <div class="stat-value mono negative">${fmtR(m.avgLossR)}</div>
        <div class="stat-change">on ${m.losses} losses</div>
      </div>
    </div>

    <div class="grid-2" style="margin-bottom:24px;">
      <div class="card">
        <div class="card-header"><span class="card-title">Drawdown Over Time</span></div>
        <div class="card-body"><div class="chart-wrap" style="height:200px;"><canvas id="risk-dd"></canvas></div></div>
      </div>
      <div class="card">
        <div class="card-header"><span class="card-title">Risk vs R-Multiple (Scatter)</span></div>
        <div class="card-body"><div class="chart-wrap" style="height:200px;"><canvas id="risk-scatter"></canvas></div></div>
      </div>
    </div>

    <!-- Risk profile table -->
    <div class="card" style="margin-bottom:24px;">
      <div class="card-header"><span class="card-title">R-Multiple Distribution</span></div>
      <div class="card-body">
        ${_rDistTable(rTrades)}
      </div>
    </div>

    <!-- Oversized trades -->
    ${oversized > 0 ? `
    <div class="card" style="border-color:rgba(255,61,87,0.25);">
      <div class="card-header"><span class="card-title" style="color:var(--red);">Risk Violations (${oversized} trades)</span></div>
      <div class="card-body-pad">
        <table>
          <thead><tr><th>Date</th><th>Symbol</th><th>Risk %</th><th>Target %</th><th>Result</th><th>P&L</th></tr></thead>
          <tbody>
            ${trades.filter(t=>t.riskPercent&&t.riskPercent>(profile?.riskPerTrade||1)*1.5).sort((a,b)=>b.riskPercent-a.riskPercent).slice(0,20).map(t=>`
              <tr>
                <td style="font-size:12px;color:var(--text-3);">${new Date((t.date?.toDate?.()||new Date(t.date))).toLocaleDateString('en-US',{month:'short',day:'numeric'})}</td>
                <td class="td-symbol">${t.symbol||'—'}</td>
                <td class="td-mono text-red">${t.riskPercent.toFixed(2)}%</td>
                <td class="td-mono text-dim">${profile?.riskPerTrade||1}%</td>
                <td><span class="badge ${t.result==='win'?'badge-win':t.result==='loss'?'badge-loss':'badge-be'}">${t.result||'—'}</span></td>
                <td class="td-mono ${(t.pnl||0)>=0?'text-green':'text-red'}">${fmt(t.pnl||0,currency)}</td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>` : ''}
  `;

  if (ddSer.length > 1) Charts.drawdown('risk-dd', ddSer);
  Charts.riskScatter('risk-scatter', trades);
}

function _rDistTable(trades) {
  if (!trades.length) return '<div class="empty-state" style="padding:24px;"><div class="empty-title">No R data</div><div class="empty-desc">Log trades with entry, stop, and exit prices</div></div>';
  const buckets = [
    { label: '> +3R', fn: t=>t.rMultiple>3 },
    { label: '+2R to +3R', fn: t=>t.rMultiple>=2&&t.rMultiple<=3 },
    { label: '+1R to +2R', fn: t=>t.rMultiple>=1&&t.rMultiple<2 },
    { label: '0 to +1R',  fn: t=>t.rMultiple>=0&&t.rMultiple<1 },
    { label: '-1R to 0',  fn: t=>t.rMultiple>=-1&&t.rMultiple<0 },
    { label: '-2R to -1R',fn: t=>t.rMultiple>=-2&&t.rMultiple<-1 },
    { label: '< -2R',     fn: t=>t.rMultiple<-2 },
  ];
  return `
    <div style="display:flex;flex-direction:column;gap:8px;">
      ${buckets.map(b => {
        const subset = trades.filter(b.fn);
        const pct    = trades.length ? (subset.length/trades.length*100).toFixed(1) : 0;
        const isPos  = b.label.startsWith('>') || b.label.startsWith('+') || b.label.startsWith('0');
        return `
          <div style="display:flex;align-items:center;gap:12px;">
            <div style="width:90px;font-size:12px;color:var(--text-2);flex-shrink:0;">${b.label}</div>
            <div style="flex:1;height:20px;background:rgba(255,255,255,0.04);border-radius:4px;overflow:hidden;">
              <div style="height:100%;width:${pct}%;background:${isPos?'rgba(0,230,118,0.45)':'rgba(255,61,87,0.45)'};border-radius:4px;transition:width 1s cubic-bezier(0.4,0,0.2,1);"></div>
            </div>
            <div style="width:28px;font-family:'DM Mono',monospace;font-size:12px;color:var(--text-3);text-align:right;">${subset.length}</div>
            <div style="width:40px;font-family:'DM Mono',monospace;font-size:11px;color:${isPos?'var(--green)':'var(--red)'};text-align:right;">${pct}%</div>
          </div>`;
      }).join('')}
    </div>`;
}
