// VELQOR JOURNAL — Analytics Page
import { AppState, openModal, getActiveTrades, getCurrency } from '../app.js';
import { fmt, fmtR, fmtPct, fmtDate, computeMetrics, groupByPeriod, getRDistribution, getBySetup, computeDrawdownSeries, colorForValue } from '../utils.js';
import { Charts } from '../charts.js';

let _period = 'all'; // 'all' | '30' | '90' | 'ytd'

export function renderAnalytics() {
  return `
<div class="page-wrapper page-enter">
  <div class="page-header page-header-row">
    <div>
      <div class="page-title">Analytics</div>
      <div class="page-subtitle">Deep performance analysis across all dimensions</div>
    </div>
    <div class="seg-control">
      ${['all','30','90','ytd'].map(p => `<button class="seg-btn ${_period===p?'active':''}" data-period="${p}">${p==='all'?'All Time':p==='ytd'?'YTD':p+'d'}</button>`).join('')}
    </div>
  </div>
  <div id="analytics-content"></div>
</div>`;
}

export function initAnalytics() {
  document.querySelectorAll('[data-period]').forEach(btn => {
    btn.addEventListener('click', () => {
      _period = btn.dataset.period;
      document.querySelectorAll('[data-period]').forEach(b => b.classList.toggle('active', b.dataset.period === _period));
      _buildAnalytics();
    });
  });
  _buildAnalytics();
}

function _getFilteredTrades() {
  const all = getActiveTrades();
  const now = Date.now();
  if (_period === '30')  return all.filter(t => now - (t.date?.toDate?.()??new Date(t.date)).getTime() < 30*864e5);
  if (_period === '90')  return all.filter(t => now - (t.date?.toDate?.()??new Date(t.date)).getTime() < 90*864e5);
  if (_period === 'ytd') return all.filter(t => (t.date?.toDate?.()??new Date(t.date)).getFullYear() === new Date().getFullYear());
  return all;
}

function _buildAnalytics() {
  const content  = document.getElementById('analytics-content');
  if (!content) return;
  const trades   = _getFilteredTrades();
  const currency = getCurrency();
  const m        = computeMetrics(trades);
  const monthGrp = groupByPeriod(trades, 'month');
  const rBins    = getRDistribution(trades);
  const ddSeries = computeDrawdownSeries(trades);
  const setupPerf = getBySetup(trades, AppState.playbook);

  content.innerHTML = `
    <!-- KPI row -->
    <div class="stats-grid" style="grid-template-columns:repeat(auto-fill,minmax(160px,1fr));">
      ${_kpi('Net P&L',      fmt(m.netPnl, currency),       m.netPnl>=0?'var(--green)':'var(--red)')}
      ${_kpi('Win Rate',     m.winRate+'%',                  'var(--cyan)')}
      ${_kpi('Profit Factor',m.profitFactor===999?'∞':m.profitFactor, m.profitFactor>=1.5?'var(--green)':m.profitFactor<1?'var(--red)':'var(--amber)')}
      ${_kpi('Avg R',        fmtR(m.avgR),                   m.avgR>=0?'var(--green)':'var(--red)')}
      ${_kpi('Expectancy',   fmtR(m.expectancy),             m.expectancy>=0?'var(--green)':'var(--red)')}
      ${_kpi('Max Drawdown', m.maxDrawdownPct.toFixed(2)+'%','var(--red)')}
      ${_kpi('Sharpe',       m.sharpeApprox,                 m.sharpeApprox>=1?'var(--green)':m.sharpeApprox>=0?'var(--amber)':'var(--red)')}
      ${_kpi('Total Trades', m.totalTrades,                  'var(--text)')}
    </div>

    <!-- Equity + Drawdown -->
    <div class="grid-2" style="margin-bottom:24px;">
      <div class="card">
        <div class="card-header"><span class="card-title">Equity Curve</span></div>
        <div class="card-body"><div class="chart-wrap" style="height:200px;"><canvas id="an-equity"></canvas></div></div>
      </div>
      <div class="card">
        <div class="card-header"><span class="card-title">Drawdown</span></div>
        <div class="card-body"><div class="chart-wrap" style="height:200px;"><canvas id="an-dd"></canvas></div></div>
      </div>
    </div>

    <!-- Monthly PnL + Win Rate -->
    <div class="grid-2" style="margin-bottom:24px;">
      <div class="card">
        <div class="card-header"><span class="card-title">Monthly P&amp;L</span></div>
        <div class="card-body"><div class="chart-wrap" style="height:200px;"><canvas id="an-monthly"></canvas></div></div>
      </div>
      <div class="card">
        <div class="card-header"><span class="card-title">Win Rate by Month</span></div>
        <div class="card-body"><div class="chart-wrap" style="height:200px;"><canvas id="an-winrate"></canvas></div></div>
      </div>
    </div>

    <!-- R Distribution -->
    <div class="grid-2" style="margin-bottom:24px;">
      <div class="card">
        <div class="card-header"><span class="card-title">R-Multiple Distribution</span></div>
        <div class="card-body"><div class="chart-wrap" style="height:200px;"><canvas id="an-r"></canvas></div></div>
      </div>
      <div class="card">
        <div class="card-header"><span class="card-title">Result Breakdown</span></div>
        <div class="card-body" style="display:flex;align-items:center;justify-content:center;">
          <div class="chart-wrap" style="height:200px;width:200px;">
            <canvas id="an-donut"></canvas>
          </div>
        </div>
      </div>
    </div>

    <!-- Monthly detail table -->
    <div class="card" style="margin-bottom:24px;">
      <div class="card-header"><span class="card-title">Monthly Breakdown</span></div>
      <div class="card-body-pad">
        ${_monthlyTable(monthGrp, currency)}
      </div>
    </div>

    <!-- Setup Performance -->
    ${setupPerf.length > 0 ? `
    <div class="card" style="margin-bottom:24px;">
      <div class="card-header"><span class="card-title">Performance by Setup</span></div>
      <div class="card-body-pad">
        ${_setupTable(setupPerf, currency)}
      </div>
    </div>` : ''}

    <!-- Symbol Performance -->
    <div class="card">
      <div class="card-header"><span class="card-title">Performance by Symbol</span></div>
      <div class="card-body-pad">
        ${_symbolTable(trades, currency)}
      </div>
    </div>
  `;

  // Charts
  if (m.equityCurve.length > 1) Charts.equity('an-equity', m.equityCurve, currency);
  else _noData('an-equity');
  if (ddSeries.length > 1) Charts.drawdown('an-dd', ddSeries);
  else _noData('an-dd');
  if (Object.keys(monthGrp).length) Charts.monthlyBar('an-monthly', monthGrp, currency);
  else _noData('an-monthly');
  if (Object.keys(monthGrp).length > 1) Charts.winRateLine('an-winrate', monthGrp);
  else _noData('an-winrate');
  Charts.rHistogram('an-r', rBins);
  Charts.donut('an-donut',
    [m.wins, m.losses, m.breakevens].filter(Boolean),
    ['Wins', 'Losses', 'BE'].filter((_,i) => [m.wins,m.losses,m.breakevens][i]>0),
    ['rgba(0,230,118,0.7)','rgba(255,61,87,0.7)','rgba(255,208,96,0.7)'].filter((_,i) => [m.wins,m.losses,m.breakevens][i]>0)
  );
}

function _kpi(label, value, color) {
  return `
    <div class="stat-card" style="--accent:${color}">
      <div class="stat-label">${label}</div>
      <div class="stat-value mono" style="font-size:22px;color:${color};">${value}</div>
    </div>`;
}

function _noData(id) {
  const el = document.getElementById(id);
  if (el) el.parentElement.innerHTML = '<div class="chart-loading">Not enough data</div>';
}

function _monthlyTable(groups, currency) {
  const keys = Object.keys(groups).sort().reverse();
  if (!keys.length) return '<div class="empty-state" style="padding:24px;"><div class="empty-title">No data</div></div>';
  return `
    <table>
      <thead><tr><th>Month</th><th>Trades</th><th>Wins</th><th>Win Rate</th><th>P&L</th><th>Avg R</th><th>PF</th></tr></thead>
      <tbody>
        ${keys.map(k => {
          const t = groups[k];
          const m = computeMetrics(t);
          const [yr, mo] = k.split('-');
          const label = new Date(+yr,+mo-1,1).toLocaleDateString('en-US',{month:'long',year:'numeric'});
          return `
            <tr>
              <td style="font-weight:500;color:var(--text);">${label}</td>
              <td class="td-mono">${m.totalTrades}</td>
              <td class="td-mono">${m.wins}</td>
              <td class="td-mono">${m.winRate}%</td>
              <td class="td-mono ${m.netPnl>=0?'text-green':'text-red'}">${m.netPnl>=0?'+':''}${fmt(m.netPnl,currency)}</td>
              <td class="td-mono ${m.avgR>=0?'text-green':'text-red'}">${fmtR(m.avgR)}</td>
              <td class="td-mono">${m.profitFactor===999?'∞':m.profitFactor}</td>
            </tr>`;
        }).join('')}
      </tbody>
    </table>`;
}

function _setupTable(setups, currency) {
  return `
    <table>
      <thead><tr><th>Setup</th><th>Trades</th><th>Win Rate</th><th>Avg R</th><th>Net P&L</th></tr></thead>
      <tbody>
        ${setups.sort((a,b)=>b.pnl-a.pnl).map(s => `
          <tr>
            <td style="font-weight:500;color:var(--text);">${s.name}</td>
            <td class="td-mono">${s.trades}</td>
            <td class="td-mono">${s.winRate}%</td>
            <td class="td-mono ${s.avgR>=0?'text-green':'text-red'}">${s.avgR}R</td>
            <td class="td-mono ${s.pnl>=0?'text-green':'text-red'}">${s.pnl>=0?'+':''}${fmt(s.pnl,currency)}</td>
          </tr>`).join('')}
      </tbody>
    </table>`;
}

function _symbolTable(trades, currency) {
  const symMap = {};
  trades.forEach(t => {
    const s = t.symbol || 'Unknown';
    if (!symMap[s]) symMap[s] = { trades:0, wins:0, pnl:0, r:[] };
    symMap[s].trades++;
    symMap[s].pnl += t.pnl||0;
    if (t.result==='win') symMap[s].wins++;
    if (t.rMultiple!=null) symMap[s].r.push(t.rMultiple);
  });
  const rows = Object.entries(symMap).map(([sym, d]) => ({
    sym, ...d,
    winRate: (d.wins/d.trades*100).toFixed(1),
    avgR: d.r.length ? (d.r.reduce((a,b)=>a+b,0)/d.r.length).toFixed(2) : 0
  })).sort((a,b)=>b.pnl-a.pnl);
  if (!rows.length) return '<div class="empty-state" style="padding:24px;"><div class="empty-title">No data</div></div>';
  return `
    <table>
      <thead><tr><th>Symbol</th><th>Trades</th><th>Wins</th><th>Win Rate</th><th>Avg R</th><th>Net P&L</th></tr></thead>
      <tbody>
        ${rows.map(r => `
          <tr>
            <td class="td-symbol">${r.sym}</td>
            <td class="td-mono">${r.trades}</td>
            <td class="td-mono">${r.wins}</td>
            <td class="td-mono">${r.winRate}%</td>
            <td class="td-mono ${r.avgR>=0?'text-green':'text-red'}">${r.avgR}R</td>
            <td class="td-mono ${r.pnl>=0?'text-green':'text-red'}">${r.pnl>=0?'+':''}${fmt(r.pnl,currency)}</td>
          </tr>`).join('')}
      </tbody>
    </table>`;
}
