// VELQOR JOURNAL — PDF Export
import { AppState, getActiveAccount, getActiveTrades, getCurrency } from './app.js';
import { fmt, fmtDate, fmtR, computeMetrics, groupByPeriod, toDate } from './utils.js';

export function generatePDF() {
  const trades   = getActiveTrades();
  const acct     = getActiveAccount();
  const currency = getCurrency();
  const profile  = AppState.profile;
  const m        = computeMetrics(trades);
  const monthGrp = groupByPeriod(trades, 'month');
  const now      = new Date().toLocaleDateString('en-US',{dateStyle:'long'});
  const SYM      = { USD:'$',EUR:'€',GBP:'£',NGN:'₦',JPY:'¥',AUD:'A$',CAD:'C$',CHF:'Fr',USDT:'T$',ZAR:'R',BTC:'₿' };
  const sym      = SYM[currency] || '$';

  const win = window.open('', '_blank');
  if (!win) { alert('Please allow pop-ups to export PDF.'); return; }

  const monthRows = Object.keys(monthGrp).sort().reverse().map(k => {
    const t  = monthGrp[k];
    const mm = computeMetrics(t);
    const [yr,mo] = k.split('-');
    const lbl = new Date(+yr,+mo-1,1).toLocaleDateString('en-US',{month:'long',year:'numeric'});
    return `<tr>
      <td>${lbl}</td><td>${mm.totalTrades}</td><td>${mm.wins}/${mm.losses}</td>
      <td>${mm.winRate}%</td>
      <td style="color:${mm.netPnl>=0?'#00c96b':'#e53e3e'};">${mm.netPnl>=0?'+':''}${fmt(mm.netPnl,currency)}</td>
      <td>${mm.profitFactor===999?'∞':mm.profitFactor}</td>
      <td style="color:${mm.avgR>=0?'#00c96b':'#e53e3e'};">${fmtR(mm.avgR)}</td>
    </tr>`;
  }).join('');

  const tradeRows = [...trades].sort((a,b) => toDate(b.date)-toDate(a.date)).map(t => `
    <tr>
      <td>${fmtDate(t.date)}</td>
      <td><strong>${t.symbol||'—'}</strong></td>
      <td>${t.direction||'—'}</td>
      <td>${t.session||'—'}</td>
      <td>${t.setupName||'—'}</td>
      <td>${t.entryPrice??'—'}</td>
      <td>${t.exitPrice??'—'}</td>
      <td>${t.riskPercent!=null?t.riskPercent+'%':'—'}</td>
      <td style="color:${(t.pnl||0)>=0?'#00c96b':'#e53e3e'};">${(t.pnl||0)>=0?'+':''}${fmt(t.pnl||0,currency)}</td>
      <td style="color:${(t.rMultiple||0)>=0?'#00c96b':'#e53e3e'};">${fmtR(t.rMultiple)}</td>
      <td><span style="padding:2px 6px;border-radius:4px;font-size:11px;font-weight:600;background:${t.result==='win'?'#d4f7e7':t.result==='loss'?'#fde8e8':'#fef9e7'};color:${t.result==='win'?'#1a7a4a':t.result==='loss'?'#c0392b':'#b7770d'};">${(t.result||'—').toUpperCase()}</span></td>
    </tr>`).join('');

  win.document.write(`<!DOCTYPE html><html><head>
<title>VELQOR JOURNAL — ${acct?.name||'Report'} — ${now}</title>
<meta charset="UTF-8">
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 12px; color: #1a1a2e; background: #fff; padding: 32px; }
  .cover { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 200px; border-bottom: 3px solid #07080f; margin-bottom: 32px; padding-bottom: 24px; }
  .cover-logo { font-size: 32px; font-weight: 800; letter-spacing: 0.15em; color: #07080f; }
  .cover-sub   { font-size: 13px; letter-spacing: 0.3em; color: #00a8cc; margin-top: 4px; text-transform: uppercase; }
  .cover-meta  { font-size: 13px; color: #666; margin-top: 16px; text-align: center; line-height: 1.8; }
  h2 { font-size: 16px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: #07080f; border-left: 4px solid #00a8cc; padding-left: 10px; margin: 28px 0 14px; }
  .kpi-grid { display: grid; grid-template-columns: repeat(4,1fr); gap: 12px; margin-bottom: 24px; }
  .kpi { padding: 14px; border: 1px solid #e2e8f0; border-radius: 8px; background: #f8fafc; }
  .kpi-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; color: #718096; margin-bottom: 4px; }
  .kpi-val   { font-size: 20px; font-weight: 700; color: #1a1a2e; font-family: monospace; }
  .kpi-val.pos { color: #00c96b; } .kpi-val.neg { color: #e53e3e; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 20px; }
  thead th { background: #07080f; color: white; padding: 8px 10px; text-align: left; font-size: 10px; letter-spacing: 0.08em; text-transform: uppercase; }
  tbody td { padding: 7px 10px; border-bottom: 1px solid #f0f0f0; vertical-align: middle; }
  tbody tr:nth-child(even) td { background: #f8fafc; }
  .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 10px; color: #aaa; text-align: center; }
  @media print {
    body { padding: 16px; }
    .no-print { display: none; }
    table { font-size: 10px; }
    thead th { background: #07080f !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    tbody tr:nth-child(even) td { background: #f8fafc !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    h2 { border-left: 4px solid #00a8cc !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
</style>
</head><body>
  <div class="cover">
    <div class="cover-logo">VELQOR</div>
    <div class="cover-sub">Trading Journal Report</div>
    <div class="cover-meta">
      <strong>${acct?.name||'All Accounts'}</strong><br>
      ${acct?.broker ? acct.broker + ' &nbsp;|&nbsp; ' : ''}${currency}<br>
      Generated: ${now}<br>
      Trader: ${profile?.displayName||'Trader'}
    </div>
  </div>

  <button class="no-print" onclick="window.print()" style="position:fixed;top:16px;right:16px;padding:10px 20px;background:#07080f;color:white;border:none;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;">Save as PDF</button>

  <h2>Performance Summary</h2>
  <div class="kpi-grid">
    <div class="kpi"><div class="kpi-label">Net P&L</div><div class="kpi-val ${m.netPnl>=0?'pos':'neg'}">${m.netPnl>=0?'+':''}${fmt(m.netPnl,currency)}</div></div>
    <div class="kpi"><div class="kpi-label">Total Trades</div><div class="kpi-val">${m.totalTrades}</div></div>
    <div class="kpi"><div class="kpi-label">Win Rate</div><div class="kpi-val">${m.winRate}%</div></div>
    <div class="kpi"><div class="kpi-label">Profit Factor</div><div class="kpi-val ${m.profitFactor>=1?'pos':'neg'}">${m.profitFactor===999?'∞':m.profitFactor}</div></div>
    <div class="kpi"><div class="kpi-label">Avg R-Multiple</div><div class="kpi-val ${m.avgR>=0?'pos':'neg'}">${fmtR(m.avgR)}</div></div>
    <div class="kpi"><div class="kpi-label">Max Drawdown</div><div class="kpi-val neg">${m.maxDrawdownPct.toFixed(2)}%</div></div>
    <div class="kpi"><div class="kpi-label">Avg Win</div><div class="kpi-val pos">${fmt(m.avgWin,currency)}</div></div>
    <div class="kpi"><div class="kpi-label">Avg Loss</div><div class="kpi-val neg">${fmt(m.avgLoss,currency)}</div></div>
    <div class="kpi"><div class="kpi-label">Best Streak</div><div class="kpi-val">${m.maxConsecWins} wins</div></div>
    <div class="kpi"><div class="kpi-label">Worst Streak</div><div class="kpi-val">${m.maxConsecLosses} losses</div></div>
    <div class="kpi"><div class="kpi-label">Expectancy</div><div class="kpi-val ${m.expectancy>=0?'pos':'neg'}">${fmtR(m.expectancy)}</div></div>
    <div class="kpi"><div class="kpi-label">Sharpe (approx)</div><div class="kpi-val">${m.sharpeApprox}</div></div>
  </div>

  ${monthRows ? `<h2>Monthly Breakdown</h2>
  <table><thead><tr><th>Month</th><th>Trades</th><th>W/L</th><th>Win Rate</th><th>Net P&L</th><th>Profit Factor</th><th>Avg R</th></tr></thead>
  <tbody>${monthRows}</tbody></table>` : ''}

  <h2>All Trades (${trades.length})</h2>
  <table><thead><tr><th>Date</th><th>Symbol</th><th>Dir</th><th>Session</th><th>Setup</th><th>Entry</th><th>Exit</th><th>Risk%</th><th>P&L</th><th>R</th><th>Result</th></tr></thead>
  <tbody>${tradeRows}</tbody></table>

  <div class="footer">VELQOR JOURNAL — ${now} — ${profile?.displayName||'Trader'} — This report is for personal use only.</div>
  <script>window.onload=()=>setTimeout(()=>window.print(),800);<\/script>
</body></html>`);
  win.document.close();
}
