// VELQOR JOURNAL — Dashboard Page
import { AppState, openModal } from '../app.js';
import { fmt, fmtPct, fmtR, fmtDate, fmtTime, computeMetrics, groupByPeriod, toDate } from '../utils.js';
import { Charts } from '../charts.js';

export function renderDashboard() {
  const { trades, profile, playbook } = AppState;
  const currency = profile?.currency || 'USD';
  const m = computeMetrics(trades);
  const balance  = profile?.accountBalance || 0;
  const starting = profile?.startingBalance || balance;
  const totalReturn = starting > 0 ? ((balance - starting) / starting * 100) : 0;

  // Recent 30 days trades
  const now = Date.now();
  const d30  = trades.filter(t => (now - toDate(t.date).getTime()) < 30 * 86400000);
  const d30m  = computeMetrics(d30);

  const monthGroups = groupByPeriod(trades, 'month');

  return `
<div class="page-wrapper page-enter">
  <div class="page-header page-header-row">
    <div>
      <div class="page-title">Dashboard</div>
      <div class="page-subtitle">Overview of your trading performance</div>
    </div>
    <button class="btn-primary" id="dash-add-trade">
      <svg viewBox="0 0 16 16" width="14" height="14" fill="none"><line x1="8" y1="2" x2="8" y2="14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="2" y1="8" x2="14" y2="8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
      Log Trade
    </button>
  </div>

  <div class="stats-grid">
    <div class="stat-card" style="--accent: var(--cyan)">
      <div class="stat-label">Account Balance</div>
      <div class="stat-value mono">${fmt(balance, currency)}</div>
      <div class="stat-change">
        <span class="${totalReturn >= 0 ? 'up' : 'down'}">${totalReturn >= 0 ? '+' : ''}${totalReturn.toFixed(2)}% all-time</span>
      </div>
    </div>
    <div class="stat-card" style="--accent: ${m.netPnl >= 0 ? 'var(--green)' : 'var(--red)'}">
      <div class="stat-label">Net P&amp;L (All Time)</div>
      <div class="stat-value mono ${m.netPnl >= 0 ? 'positive' : 'negative'}">${fmt(m.netPnl, currency)}</div>
      <div class="stat-change">
        <span class="${d30m.netPnl >= 0 ? 'up' : 'down'}">${fmt(d30m.netPnl, currency)} last 30d</span>
      </div>
    </div>
    <div class="stat-card" style="--accent: var(--cyan)">
      <div class="stat-label">Win Rate</div>
      <div class="stat-value mono">${m.winRate}%</div>
      <div class="stat-change">${m.wins}W / ${m.losses}L / ${m.breakevens}BE</div>
    </div>
    <div class="stat-card" style="--accent: var(--purple)">
      <div class="stat-label">Profit Factor</div>
      <div class="stat-value mono ${m.profitFactor >= 1.5 ? 'positive' : m.profitFactor < 1 ? 'negative' : ''}">${m.profitFactor === 999 ? '∞' : m.profitFactor}</div>
      <div class="stat-change">Gross ${fmt(m.grossWins,currency)} / ${fmt(m.grossLosses,currency)}</div>
    </div>
    <div class="stat-card" style="--accent: var(--amber)">
      <div class="stat-label">Avg R-Multiple</div>
      <div class="stat-value mono ${m.avgR >= 0 ? 'positive' : 'negative'}">${fmtR(m.avgR)}</div>
      <div class="stat-change">Expectancy ${fmtR(m.expectancy)}</div>
    </div>
    <div class="stat-card" style="--accent: var(--red)">
      <div class="stat-label">Max Drawdown</div>
      <div class="stat-value mono negative">${m.maxDrawdownPct.toFixed(2)}%</div>
      <div class="stat-change">${fmt(m.maxDrawdown, currency)} peak-to-trough</div>
    </div>
  </div>

  <div class="grid-2" style="margin-bottom:24px;">
    <div class="card">
      <div class="card-header">
        <span class="card-title">Equity Curve</span>
        <span class="text-dim" style="font-size:12px;">${m.totalTrades} trades</span>
      </div>
      <div class="card-body">
        <div class="chart-wrap" style="height:220px;">
          <canvas id="chart-equity"></canvas>
        </div>
      </div>
    </div>
    <div class="card">
      <div class="card-header">
        <span class="card-title">Monthly P&amp;L</span>
        <span class="text-dim" style="font-size:12px;">${Object.keys(monthGroups).length} months</span>
      </div>
      <div class="card-body">
        <div class="chart-wrap" style="height:220px;">
          <canvas id="chart-monthly"></canvas>
        </div>
      </div>
    </div>
  </div>

  <div class="grid-2" style="margin-bottom:24px;">
    <div class="card">
      <div class="card-header">
        <span class="card-title">Recent Trades</span>
        <a href="#/journal" class="text-cyan" style="font-size:12px;">View all</a>
      </div>
      <div class="card-body-pad">
        ${renderRecentTrades(trades.slice(0, 8), currency)}
      </div>
    </div>
    <div class="card">
      <div class="card-header">
        <span class="card-title">Performance Summary</span>
      </div>
      <div class="card-body">
        ${renderPerfSummary(m, currency)}
      </div>
    </div>
  </div>

  <div class="card">
    <div class="card-header">
      <span class="card-title">Win Rate Trend</span>
      <span class="text-dim" style="font-size:12px;">Rolling monthly</span>
    </div>
    <div class="card-body">
      <div class="chart-wrap" style="height:180px;">
        <canvas id="chart-winrate"></canvas>
      </div>
    </div>
  </div>
</div>`;
}

function renderRecentTrades(trades, currency) {
  if (!trades.length) return `
    <div class="empty-state" style="padding:32px 16px;">
      <svg class="empty-icon" viewBox="0 0 40 40" fill="none" width="40" height="40"><rect x="5" y="5" width="30" height="30" rx="4" stroke="currentColor" stroke-width="1.5"/><line x1="12" y1="14" x2="28" y2="14" stroke="currentColor" stroke-width="1.5"/><line x1="12" y1="20" x2="22" y2="20" stroke="currentColor" stroke-width="1.5"/></svg>
      <div class="empty-title">No trades yet</div>
      <div class="empty-desc">Start logging your trades to see performance data</div>
    </div>`;
  return `
    <table>
      <thead><tr>
        <th>Symbol</th><th>Dir</th><th>P&amp;L</th><th>R</th><th>Date</th>
      </tr></thead>
      <tbody>
        ${trades.map(t => `
          <tr>
            <td class="td-symbol">${t.symbol || '—'}</td>
            <td><span class="badge ${t.direction === 'long' ? 'badge-long' : 'badge-short'}">${t.direction || '—'}</span></td>
            <td class="td-mono ${(t.pnl||0) >= 0 ? 'text-green' : 'text-red'}">${fmt(t.pnl||0, currency)}</td>
            <td class="td-mono ${(t.rMultiple||0) >= 0 ? 'text-green' : 'text-red'}">${fmtR(t.rMultiple)}</td>
            <td style="font-size:12px;color:var(--text-3);">${fmtDate(t.date)}</td>
          </tr>`).join('')}
      </tbody>
    </table>`;
}

function renderPerfSummary(m, currency) {
  const rows = [
    ['Total Trades',      m.totalTrades],
    ['Average Win',       fmt(m.avgWin, currency)],
    ['Average Loss',      fmt(Math.abs(m.avgLoss), currency)],
    ['Avg Win R',         fmtR(m.avgWinR)],
    ['Avg Loss R',        fmtR(m.avgLossR)],
    ['Best Streak',       m.maxConsecWins + ' wins'],
    ['Worst Streak',      m.maxConsecLosses + ' losses'],
    ['Sharpe (approx)',   m.sharpeApprox],
  ];
  return `
    <div style="display:flex;flex-direction:column;gap:2px;">
      ${rows.map(([l, v]) => `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:9px 0;border-bottom:1px solid rgba(255,255,255,0.04);">
          <span style="font-size:13px;color:var(--text-2);">${l}</span>
          <span style="font-family:'DM Mono',monospace;font-size:13px;color:var(--text);">${v}</span>
        </div>`).join('')}
    </div>`;
}

export function initDashboard() {
  const { trades, profile, playbook } = AppState;
  const currency = profile?.currency || 'USD';
  const m = computeMetrics(trades);
  const monthGroups = groupByPeriod(trades, 'month');

  if (m.equityCurve.length > 1) {
    Charts.equity('chart-equity', m.equityCurve, currency);
  } else {
    const el = document.getElementById('chart-equity');
    if (el) el.parentElement.innerHTML = '<div class="chart-loading">Not enough data</div>';
  }

  if (Object.keys(monthGroups).length > 0) {
    Charts.monthlyBar('chart-monthly', monthGroups, currency);
  } else {
    const el = document.getElementById('chart-monthly');
    if (el) el.parentElement.innerHTML = '<div class="chart-loading">Not enough data</div>';
  }

  if (Object.keys(monthGroups).length > 1) {
    Charts.winRateLine('chart-winrate', monthGroups);
  } else {
    const el = document.getElementById('chart-winrate');
    if (el) el.parentElement.innerHTML = '<div class="chart-loading">Need more months of data</div>';
  }

  document.getElementById('dash-add-trade')?.addEventListener('click', () => openModal('add-trade'));
}
