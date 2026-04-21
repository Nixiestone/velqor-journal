// VELQOR JOURNAL — Utilities

export const SESSIONS = ['Asian', 'London', 'NY', 'London/NY', 'After Hours'];
export const EMOTIONS = ['Calm', 'Confident', 'Anxious', 'Excited', 'FOMO', 'Frustrated', 'Revenge', 'Focused', 'Tired', 'Bored'];
export const SYMBOLS  = ['EUR/USD','GBP/USD','USD/JPY','USD/CHF','AUD/USD','NZD/USD','USD/CAD',
  'XAU/USD','XAG/USD','BTC/USD','ETH/USD','BTC/USDT','ETH/USDT','NAS100','US30','SPX500',
  'GER40','UK100','USOIL','UKOIL','EUR/GBP','EUR/JPY','GBP/JPY','USD/ZAR','USD/NGN'];
export const TIMEFRAMES = ['M1','M5','M15','M30','H1','H4','D1','W1'];
export const CURRENCY_SYMBOLS = { USD:'$', EUR:'€', GBP:'£', NGN:'₦', JPY:'¥', AUD:'A$', CAD:'C$' };

export function fmt(amount, currency = 'USD', decimals = 2) {
  const sym = CURRENCY_SYMBOLS[currency] || '$';
  const abs = Math.abs(amount);
  const str = abs.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  return (amount < 0 ? '-' : '') + sym + str;
}

export function fmtPct(value, decimals = 2) {
  const sign = value > 0 ? '+' : '';
  return sign + value.toFixed(decimals) + '%';
}

export function fmtR(r, decimals = 2) {
  if (!isFinite(r)) return '—';
  const sign = r > 0 ? '+' : '';
  return sign + r.toFixed(decimals) + 'R';
}

export function fmtDate(ts, opts = {}) {
  if (!ts) return '—';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('en-US', { year:'numeric', month:'short', day:'numeric', ...opts });
}

export function fmtTime(ts) {
  if (!ts) return '—';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit', hour12: false });
}

export function fmtDateTime(ts) {
  if (!ts) return '—';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return fmtDate(ts) + ' ' + fmtTime(ts);
}

export function toDate(ts) {
  if (!ts) return new Date();
  return ts.toDate ? ts.toDate() : new Date(ts);
}

export function calcRMultiple(entry, exit, stop, direction) {
  if (!entry || !exit || !stop) return 0;
  const risk   = Math.abs(entry - stop);
  const reward = direction === 'long' ? exit - entry : entry - exit;
  if (risk === 0) return 0;
  return parseFloat((reward / risk).toFixed(3));
}

export function calcPnlPct(pnl, balance) {
  if (!balance || balance === 0) return 0;
  return parseFloat(((pnl / balance) * 100).toFixed(3));
}

export function getSessionFromTime(timeStr) {
  if (!timeStr) return 'Unknown';
  const [h] = timeStr.split(':').map(Number);
  if (h >= 0  && h < 3)  return 'Asian';
  if (h >= 3  && h < 7)  return 'Asian';
  if (h >= 7  && h < 12) return 'London';
  if (h >= 12 && h < 17) return 'London/NY';
  if (h >= 17 && h < 21) return 'NY';
  return 'After Hours';
}

export function computeMetrics(trades) {
  if (!trades || trades.length === 0) {
    return {
      totalTrades:0, wins:0, losses:0, breakevens:0,
      winRate:0, lossRate:0, netPnl:0, grossWins:0, grossLosses:0,
      profitFactor:0, avgWin:0, avgLoss:0, avgR:0, avgWinR:0, avgLossR:0,
      maxDrawdown:0, maxDrawdownPct:0, maxConsecWins:0, maxConsecLosses:0,
      sharpeApprox:0, expectancy:0, avgHoldTime:0, equityCurve:[]
    };
  }

  const sorted    = [...trades].sort((a,b) => toDate(a.date) - toDate(b.date));
  const wins      = sorted.filter(t => t.result === 'win');
  const losses    = sorted.filter(t => t.result === 'loss');
  const bes       = sorted.filter(t => t.result === 'breakeven');
  const netPnl    = sorted.reduce((s,t) => s + (t.pnl || 0), 0);
  const grossWins = wins.reduce((s,t)   => s + (t.pnl || 0), 0);
  const grossLoss = Math.abs(losses.reduce((s,t) => s + (t.pnl || 0), 0));
  const avgWin    = wins.length   ? grossWins / wins.length   : 0;
  const avgLoss   = losses.length ? -grossLoss / losses.length : 0;
  const profitFac = grossLoss > 0 ? parseFloat((grossWins / grossLoss).toFixed(2)) : grossWins > 0 ? 999 : 0;
  const winRate   = wins.length / sorted.length * 100;
  const rValues   = sorted.filter(t => t.rMultiple != null).map(t => t.rMultiple);
  const avgR      = rValues.length ? rValues.reduce((s,r)=>s+r,0)/rValues.length : 0;
  const avgWinR   = wins.filter(t=>t.rMultiple!=null).reduce((s,t,_,a) => s + t.rMultiple/a.length, 0);
  const avgLossR  = losses.filter(t=>t.rMultiple!=null).reduce((s,t,_,a) => s + t.rMultiple/a.length, 0);
  const expectancy = winRate/100 * avgWin + (1 - winRate/100) * avgLoss;

  // Equity curve & drawdown
  let balance = sorted[0]?.accountBalanceBefore || 0;
  let peak    = balance;
  let maxDD   = 0, maxDDPct = 0;
  const equityCurve = sorted.map(t => {
    balance += (t.pnl || 0);
    if (balance > peak) peak = balance;
    const dd    = peak - balance;
    const ddPct = peak > 0 ? dd / peak * 100 : 0;
    if (dd > maxDD) { maxDD = dd; maxDDPct = ddPct; }
    return { date: toDate(t.date), balance, pnl: t.pnl || 0 };
  });

  // Consecutive streaks
  let curW = 0, curL = 0, maxW = 0, maxL = 0;
  sorted.forEach(t => {
    if (t.result === 'win')  { curW++; curL = 0; maxW = Math.max(maxW, curW); }
    else if (t.result === 'loss') { curL++; curW = 0; maxL = Math.max(maxL, curL); }
    else { curW = 0; curL = 0; }
  });

  // Approx Sharpe (daily returns)
  const pnls = sorted.map(t => t.pnl || 0);
  const mean = pnls.reduce((s,p)=>s+p,0)/pnls.length;
  const std  = Math.sqrt(pnls.reduce((s,p)=>s+(p-mean)**2,0)/pnls.length);
  const sharpe = std > 0 ? parseFloat((mean/std * Math.sqrt(252)).toFixed(2)) : 0;

  return {
    totalTrades: sorted.length,
    wins: wins.length, losses: losses.length, breakevens: bes.length,
    winRate: parseFloat(winRate.toFixed(1)),
    lossRate: parseFloat(((losses.length / sorted.length) * 100).toFixed(1)),
    netPnl: parseFloat(netPnl.toFixed(2)),
    grossWins: parseFloat(grossWins.toFixed(2)),
    grossLosses: parseFloat(grossLoss.toFixed(2)),
    profitFactor,
    avgWin: parseFloat(avgWin.toFixed(2)),
    avgLoss: parseFloat(avgLoss.toFixed(2)),
    avgR: parseFloat(avgR.toFixed(2)),
    avgWinR: parseFloat(avgWinR.toFixed(2)),
    avgLossR: parseFloat(avgLossR.toFixed(2)),
    maxDrawdown: parseFloat(maxDD.toFixed(2)),
    maxDrawdownPct: parseFloat(maxDDPct.toFixed(2)),
    maxConsecWins: maxW, maxConsecLosses: maxL,
    sharpeApprox: sharpe,
    expectancy: parseFloat(expectancy.toFixed(2)),
    equityCurve
  };
}

export function groupByPeriod(trades, period = 'month') {
  const groups = {};
  trades.forEach(t => {
    const d = toDate(t.date);
    const key = period === 'month'
      ? `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
      : period === 'week'
        ? getWeekKey(d)
        : `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(t);
  });
  return groups;
}

function getWeekKey(d) {
  const monday = new Date(d);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  monday.setDate(diff);
  return `${monday.getFullYear()}-W${String(getWeekNum(monday)).padStart(2,'0')}`;
}

function getWeekNum(d) {
  const start = new Date(d.getFullYear(), 0, 1);
  return Math.ceil(((d - start) / 86400000 + start.getDay() + 1) / 7);
}

export function getBySession(trades) {
  const sessions = {};
  SESSIONS.forEach(s => sessions[s] = { pnl:0, trades:0, wins:0 });
  trades.forEach(t => {
    const s = t.session || getSessionFromTime(t.time);
    if (!sessions[s]) sessions[s] = { pnl:0, trades:0, wins:0 };
    sessions[s].pnl    += t.pnl || 0;
    sessions[s].trades += 1;
    sessions[s].wins   += t.result === 'win' ? 1 : 0;
  });
  return sessions;
}

export function getByDayOfWeek(trades) {
  const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const data = days.map(d => ({ day:d, pnl:0, trades:0, wins:0 }));
  trades.forEach(t => {
    const d = toDate(t.date).getDay();
    data[d].pnl    += t.pnl || 0;
    data[d].trades += 1;
    data[d].wins   += t.result === 'win' ? 1 : 0;
  });
  return data;
}

export function getByHour(trades) {
  const data = Array.from({length:24}, (_,i) => ({ hour:i, pnl:0, trades:0, wins:0 }));
  trades.forEach(t => {
    if (!t.time) return;
    const h = parseInt(t.time.split(':')[0], 10);
    if (!isNaN(h) && h >= 0 && h < 24) {
      data[h].pnl    += t.pnl || 0;
      data[h].trades += 1;
      data[h].wins   += t.result === 'win' ? 1 : 0;
    }
  });
  return data;
}

export function getRDistribution(trades) {
  const bins = {};
  const range = [-4,-3,-2,-1.5,-1,-0.5,0,0.5,1,1.5,2,3,4,5,6];
  range.forEach(r => bins[r] = 0);
  trades.forEach(t => {
    if (t.rMultiple == null) return;
    let best = range[0];
    range.forEach(r => { if (r <= t.rMultiple) best = r; });
    bins[best]++;
  });
  return bins;
}

export function computeDrawdownSeries(trades) {
  const sorted = [...trades].sort((a,b) => toDate(a.date) - toDate(b.date));
  let peak = 0, balance = 0;
  return sorted.map(t => {
    balance += t.pnl || 0;
    if (balance > peak) peak = balance;
    const dd = peak > 0 ? ((peak - balance) / peak * 100) : 0;
    return { date: toDate(t.date), drawdown: parseFloat(dd.toFixed(2)) };
  });
}

export function getDisciplineScore(trades) {
  if (!trades.length) return 0;
  const recent = trades.slice(-50);
  const followed = recent.filter(t => t.followedRules === true).length;
  const base = (followed / recent.length) * 80;
  const avgExec = recent.filter(t=>t.executionScore).reduce((s,t,_,a) => s + t.executionScore/a.length, 0);
  const execBonus = (avgExec / 10) * 20;
  return Math.min(100, Math.round(base + execBonus));
}

export function getBySetup(trades, playbook) {
  const setupMap = {};
  playbook.forEach(s => setupMap[s.id] = { name: s.name, trades:0, wins:0, pnl:0, r:[] });
  trades.forEach(t => {
    if (!t.setupId || !setupMap[t.setupId]) return;
    const s = setupMap[t.setupId];
    s.trades++; s.pnl += t.pnl || 0;
    if (t.result === 'win') s.wins++;
    if (t.rMultiple != null) s.r.push(t.rMultiple);
  });
  return Object.values(setupMap).filter(s => s.trades > 0).map(s => ({
    ...s, winRate: s.trades ? (s.wins/s.trades*100).toFixed(1) : 0,
    avgR: s.r.length ? (s.r.reduce((a,b)=>a+b,0)/s.r.length).toFixed(2) : 0
  }));
}

export function colorForValue(v, maxAbs = null) {
  if (!maxAbs) maxAbs = Math.max(1, Math.abs(v));
  const intensity = Math.min(1, Math.abs(v) / maxAbs);
  if (v > 0) return `rgba(0,230,118,${0.08 + intensity * 0.45})`;
  if (v < 0) return `rgba(255,61,87,${0.08 + intensity * 0.45})`;
  return 'rgba(255,255,255,0.04)';
}

export function debounce(fn, delay = 250) {
  let timer;
  return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), delay); };
}

export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
